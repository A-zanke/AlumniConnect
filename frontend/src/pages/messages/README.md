# Messages route redesign

This folder summarizes route-scoped variables, z-index layers, and how to extend the new caret-driven menus.

## Variables
- `--navbar-height` (CSS variable, set by `Navbar`): used to size the chat shell to `calc(100vh - var(--navbar-height))`.

## Layout shell
- Route container uses class `chat-shell`: full width, height under fixed navbar, `overflow: hidden`. Internal panes scroll themselves.
- Two panes:
  - Left: `pane-left` width `clamp(280px, 28vw, 380px)` with sticky search.
  - Right: `pane-right` with sticky header, scrollable messages body, and sticky composer with safe-area padding on mobile.

## Z-index layers
- Navbar: 50 (`z-navbar`)
- Menus/Popovers: 40 (`z-popover`)
- Headers/Composer: 20 (sticky)
- Scroll areas: default

## Menus
- Hover caret beside each bubble reveals a compact quick menu (Reply, Copy, Forward).
- Click opens the full menu in a portal with keyboard navigation, outside click and Esc to close.
- Add new actions by pushing into the `baseItems` array in `MessagesPage` where the caret button `onClick` builds the menu.

## Styling
- Elegant dark theme with premium gradients for sent messages and frosted glass for received messages.
- Emojis render larger (`1.35em`) inside bubbles and scale on hover.
- Media capped at `min(60vw, 420px)` with rounded corners.

## Notes
- Footer is hidden on `/messages` only via conditional rendering in `App`.
- The old in-bubble smile/forward/ellipsis icons are removed and replaced with the caret trigger adjacent to bubbles.
