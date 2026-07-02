// Shared helpers for the controller action hotkeys (app-focused shortcuts).

// The six controller actions that can be bound to a hotkey.
export const HOTKEY_ACTIONS = [
  { id: 'startFirstHalf', label: 'Anpfiff 1. Halbzeit' },
  { id: 'endFirstHalf', label: 'Abpfiff 1. Halbzeit' },
  { id: 'startSecondHalf', label: 'Anpfiff 2. Halbzeit' },
  { id: 'endSecondHalf', label: 'Abpfiff 2. Halbzeit' },
  { id: 'goalHome', label: 'Tor Heim' },
  { id: 'goalGuest', label: 'Tor Gast' },
];

const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];

// Build a canonical hotkey string (e.g. "Ctrl+Alt+G", "F5") from a keydown event.
// Returns null while only modifier keys are held (so the recorder keeps waiting).
export function eventToHotkey(e) {
  if (MODIFIER_KEYS.includes(e.key)) return null;

  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  // Otherwise keep as-is (F1-F12, Enter, ArrowUp, Escape, ...).

  parts.push(key);
  return parts.join('+');
}

// Human-readable form for display ("Ctrl+G" -> "Ctrl + G").
export function formatHotkey(hk) {
  return hk ? hk.split('+').join(' + ') : '';
}
