# LinkedIn-Style Reaction System Implementation

## Backend Changes
- [x] Extend ForumPost model to include `allowedEmojis` array (subset of ['like', 'clap', 'support', 'love', 'idea', 'funny'])
- [x] Add API endpoint `GET /api/forum/posts/:id/allowed-emojis` to fetch allowed emojis for a post
- [x] Add API endpoint `PUT /api/forum/posts/:id/allowed-emojis` to set allowed emojis (restricted to admin or post creator)
- [x] Modify `addReaction` API to validate reaction type against allowed emojis for the post
- [x] Modify `getPost` API to include `allowedEmojis` in response
- [x] Update forumRoutes.js to include new emoji management routes

## Frontend Changes
- [x] Refactor PostCard.js reaction UI to show single reaction button by default (user's current reaction or "Like" if none)
- [x] Implement hover (desktop) and tap (mobile) to show emoji picker with only allowed emojis
- [x] Add smooth animations for showing/hiding emoji list using Framer Motion
- [x] Update reaction selection to call API and update UI accordingly
- [x] Implement reaction summary display: show top 3 emojis with counts, rest as "+N"
- [x] Add tooltips on emoji hover showing emoji name
- [x] Enhance reactors modal to show reactors grouped by emoji type
- [ ] Add UI for post creator/admin to customize allowed emojis per post (e.g., in post creation/edit form)
- [x] Update forumApi.js to include methods for fetching/setting allowed emojis

## Integration & Testing
- [ ] Ensure frontend fetches allowed emojis on post load and uses them in reaction UI
- [ ] Test reaction adding/updating/changing on desktop and mobile
- [ ] Test emoji picker animations and responsiveness
- [ ] Test reaction summary display and reactors modal
- [ ] Test emoji customization UI and permissions
- [ ] Update any related components (e.g., comment reactions if needed) to match new system

## Extras
- [ ] Implement tooltip showing emoji name on hover
- [ ] Show top 3 emojis in summary, rest as "+N" like LinkedIn
- [ ] Allow users to see who reacted with which emoji when clicking summary
