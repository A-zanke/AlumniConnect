# Event Management Fixes - TODO

## Completed Tasks
- [x] Updated backend `listEvents` function to use proper targeting fields instead of legacy `audience` field
- [x] Ensured "Show upcoming only" properly filters events by `startAt > now`
- [x] Fixed student tab to show attended events (based on RSVP) instead of created events

## Followup Steps
- [x] Fixed notification click handling to properly redirect to event pages for event notifications
- [ ] Test event creation and notification display
- [ ] Test event card clicks and notification clicks
- [ ] Verify upcoming/all events filtering
- [ ] Test targeting logic for different user roles (student, teacher, alumni)
- [ ] Test admin approval/rejection workflow
