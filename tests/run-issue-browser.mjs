import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'test-results');
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const body = await readFile(path);
    response.setHeader('content-type', extname(path) === '.js' ? 'text/javascript' : extname(path) === '.html' ? 'text/html' : 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/tests/issue-browser.html`;
const results = [];
try {
  for (const [name, type, options] of [['chromium', chromium, { channel: process.env.RADARWISE_CHROMIUM_CHANNEL || undefined }], ['webkit', webkit, {}]]) {
    const browser = await type.launch({ headless: true, ...options });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.fixtureResult, { timeout: 15000 });
      const fixture = await page.evaluate(() => window.fixtureResult);
      if (!fixture.ok) throw new Error(fixture.error);
      const editor = page.locator('#editor');
      await editor.getByRole('button', { name: 'Move Current Weather up', exact: true }).click();
      let order = await page.evaluate(() => window.editorEvents.at(-1)?.panel_order.join());
      if (order !== 'weather,clock,radar') throw new Error(`click order ${order}`);
      await editor.getByRole('button', { name: 'Move Current Weather down', exact: true }).press('Enter');
      order = await page.evaluate(() => window.editorEvents.at(-1)?.panel_order.join());
      if (order !== 'clock,weather,radar') throw new Error(`keyboard order ${order}`);
      await editor.locator('#hourly_entity').selectOption('weather.hourly');
      await editor.locator('#daily_entity').selectOption('weather.daily');
      await editor.locator('#precipitation_unit').selectOption('in');
      await editor.locator('#font_scale').fill('0.85');
      await editor.locator('#font_scale').press('Tab');
      const config = await page.evaluate(() => window.editorEvents.at(-1));
      if (config.hourly_entity !== 'weather.hourly' || config.daily_entity !== 'weather.daily' || config.precipitation_unit !== 'in' || config.font_scale !== 0.85) throw new Error('editor field persistence');
      await editor.locator('[data-panel="radar"]').dragTo(editor.locator('[data-panel="clock"]'));
      const dragOrder = await page.evaluate(() => window.editorEvents.at(-1)?.panel_order.join());
      if (dragOrder !== 'radar,clock,weather') throw new Error(`native drag order ${dragOrder}`);
      await page.locator('#cards').screenshot({ path: `${output}/${name}-fixtures.png` });
      const matrix = await page.evaluate(async () => {
        const c = window.fixtureCards.paired;
        const outcomes = [];
        for (const width of [240, 360, 720, 1200]) {
          for (const scale of [0.7, 1, 1.5]) {
            c.parentElement.style.width = `${width}px`;
            c.setConfig({ ...c._config, font_scale: scale });
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const strip = c.shadowRoot.querySelector('.daily-paired');
            const pairs = [...c.shadowRoot.querySelectorAll('.fc-day-column')].every((column) => Math.abs(column.children[0].getBoundingClientRect().x - column.children[1].getBoundingClientRect().x) < 1);
            outcomes.push({ width, scale, paired: pairs, scrollable: getComputedStyle(strip).overflowX === 'auto', fontSize: getComputedStyle(c.shadowRoot.querySelector('.temp-now')).fontSize });
          }
        }
        return outcomes;
      });
      if (matrix.some((r) => !r.paired || !r.scrollable)) throw new Error('responsive pairing matrix');
      if (errors.length) throw new Error(errors.join('\n'));
      results.push({ browser: name, fixture, editor: 'click, keyboard, native drag, source/unit/font selectors passed', matrix, errors });
      console.log(`${name}: PASS fixture, editor actions and 12 width/font combinations`);
    } finally { await browser.close(); }
  }
  await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
} finally { server.close(); }
