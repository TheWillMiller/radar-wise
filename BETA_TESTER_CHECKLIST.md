# WeatherWise Tester Checklist

Please report:

- Home Assistant version
- HACS version
- WeatherWise version, such as `v0.4.1`
- Browser/device
- Weather entity used
- Country/radar provider
- Layout preset and dashboard type, such as Sections, Masonry, Panel, wall tablet, or phone
- Whether you installed from HACS custom repository, manual resource, or CDN
- Screenshot of any layout issue
- Browser console errors, if any

Basic checks:

1. Install WeatherWise from HACS custom repository.
2. Add the card from the dashboard card picker.
3. Open the visual editor.
4. Select a weather entity.
5. Save.
6. Refresh the dashboard.
7. Confirm current weather, forecast rows, and stats load.
8. Test `theme_mode: weatherwise`.
9. Test `theme_mode: auto`.
10. Test the layout tiles: `auto`, `wide_panel`, `stacked`, `radar_bottom`, and `compact`.
11. Drag panel order in the visual editor and confirm it persists after save/refresh.
12. Adjust panel widths and confirm the total stays at 100%.
13. Test `stack_below` by resizing or using a narrow dashboard column.
14. Test `timeline_autoscroll` with more forecast rows than fit onscreen.
15. Test radar on desktop and phone.
16. Test with `show_radar: false`.
17. Screenshot or copy any errors.
