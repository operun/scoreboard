# TODO

## Bugs

- [x] Duplicate `timerOffset` key in `OutputView.jsx` initial state (line 41)
- [x] Duplicate state resets in `STOP_OUTPUT` handler in `OutputView.jsx` (lines 222-224)
- [ ] `loadMedia()` is called on every playlist item change in `OutputView.jsx` - should be cached
- [ ] `control-command` is broadcast to all windows including the sender itself in `main.js`
- [ ] `visibility` state in `ControllerView` ignores saved settings - reads from hardcoded defaults instead of `controllerVisibility` from settings
- [ ] Missing `key` prop on `<tr>` elements in `MediaView.jsx`

## Security

- [ ] `webSecurity: false` in both BrowserWindow instances - should be replaced with proper `file://` protocol handling

## Features

- [ ] Team names are not configurable - scoreboard only shows "Heim" / "Gast" labels, no club names
- [ ] No undo function for goal buttons - accidental goal clicks cannot be reversed quickly
- [ ] No visual feedback in the controller showing which scene is currently active in the output
- [ ] Score change via +/- buttons requires explicit "Ubernehmen" click, but goal buttons auto-increment - inconsistent UX
- [ ] Persistent game state on crash / window close (score, timer, match state currently lost)

## Performance

- [ ] App startup blocked by ffprobe migration scan on all videos without duration metadata

## Code Quality

- [ ] `ControllerView.jsx` is ~1027 lines - split into smaller hooks and sub-components
- [ ] Mixed styling: Bootstrap classes and inline styles used inconsistently
- [ ] Dead code: "Datei -> Neu" menu item only does `console.log`
- [ ] SSH password should be stored in OS keychain instead of encrypted JSON file
