# Messages Route Redesign

Variables and layers
- CSS var `--navbar-height`: set by `Navbar` at runtime; the chat shell uses `calc(100vh - var(--navbar-height))`.
- Z-index layers: navbar (>=50) > popovers (40) > headers/composer (20) > scroll areas.

Shell and panes
- The route renders a `.chat-shell` under the fixed navbar, full-width, full-remaining-height with `overflow:hidden`.
- Left pane width: `clamp(280px, 28vw, 380px)`, sticky search.
- Right pane: sticky header, scrollable body, sticky composer with safe-area insets.

Bubbles and media
- Sent: gradient blue→violet, white text, subtle elevation.
- Received: frosted glass (backdrop-blur), light border, high-contrast text.
- Media capped to `min(60vw, 420px)` with rounded corners and soft border.

Actions
- In-bubble icons removed. A hover/focus caret sits beside each bubble (left for received, right for sent).
- Hover shows a compact quick menu; click opens the full actions menu (Reply, Copy, Forward, Star/Pin, Delete-for-me, Select, Report, Info).
- Menu is keyboard accessible (Arrow keys/Tab, Enter, Esc) and returns focus to the caret.

Extending menus
- Add or remove items in the `baseItems` array near the caret button click handler.
- Each item has `{ label, icon, onSelect }` shape.

Accessibility and performance
- Focus-visible rings on interactive controls, emoji sized larger and crisp.
- Transitions use transform/opacity only to stay GPU-friendly.
