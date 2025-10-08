# Testing Posts Feature - Step by Step Guide

## 🧪 Pre-Testing Checklist

### 1. Verify Backend is Running
```bash
# In backend directory
npm start
# or
node server.js
```
**Expected**: Server running on port 3001 (or your configured port)

### 2. Verify Frontend is Running
```bash
# In frontend directory
npm start
```
**Expected**: React app running on port 3000

### 3. Verify You're Logged In
- Open browser: http://localhost:3000
- Ensure you're logged in as a user with role "teacher" or "alumni"
- Check browser console for any errors

---

## 📝 Test Cases

### Test 1: Create a Simple Text Post
**Steps**:
1. Navigate to Posts page (click "Posts" in navbar)
2. Click the floating "+" button (bottom-right)
3. Type: "Hello world! This is my first post 🎉"
4. Click "Post"

**Expected Result**:
- ✅ Toast notification: "Post created successfully!"
- ✅ Modal closes
- ✅ New post appears at the top of the feed
- ✅ Post shows your name, avatar, and timestamp
- ✅ Emoji renders correctly

---

### Test 2: Create Post with Rich Text Formatting
**Steps**:
1. Click the "+" button
2. Type the following:
```
This is **bold text** and this is *italic text*.

Check out this link: https://github.com

Mentioning @john and using #technology hashtag!
```
3. Click "Post"

**Expected Result**:
- ✅ **Bold text** appears in bold
- ✅ *Italic text* appears in italic
- ✅ URL is clickable and blue
- ✅ @john is highlighted and clickable
- ✅ #technology is highlighted and clickable
- ✅ Line breaks are preserved

---

### Test 3: Create Post with Single Image
**Steps**:
1. Click the "+" button
2. Type: "Check out this amazing photo!"
3. Click "Add Photos"
4. Select 1 image from your computer
5. Verify image preview appears
6. Click "Post"

**Expected Result**:
- ✅ Image preview shows before posting
- ✅ Post created successfully
- ✅ Image displays full width (max 500px height)
- ✅ Image is clickable (opens in new tab)
- ✅ Hover effect on image

---

### Test 4: Create Post with Multiple Images (2 images)
**Steps**:
1. Click the "+" button
2. Type: "Two beautiful images"
3. Click "Add Photos"
4. Select 2 images
5. Click "Post"

**Expected Result**:
- ✅ Both images show in preview
- ✅ Post created successfully
- ✅ Images display in 2-column grid
- ✅ Both images are clickable

---

### Test 5: Create Post with 3 Images
**Steps**:
1. Click the "+" button
2. Select 3 images
3. Click "Post"

**Expected Result**:
- ✅ First image spans full width
- ✅ Next two images in 2-column grid below
- ✅ All images clickable

---

### Test 6: Create Post with 5 Images (Maximum)
**Steps**:
1. Click the "+" button
2. Select 5 images
3. Click "Post"

**Expected Result**:
- ✅ All 5 images upload successfully
- ✅ Images display in 2-column grid
- ✅ All images clickable

---

### Test 7: Try to Upload More Than 5 Images
**Steps**:
1. Click the "+" button
2. Try to select 6 or more images

**Expected Result**:
- ✅ Toast error: "You can upload maximum 5 images"
- ✅ Only first 5 images are selected

---

### Test 8: React to a Post (Like)
**Steps**:
1. Find any post in the feed
2. Hover over the reaction button
3. Click "Like" (thumbs up icon)

**Expected Result**:
- ✅ Reaction picker appears on hover
- ✅ Like reaction is highlighted in blue
- ✅ Reaction count increases by 1
- ✅ Your reaction shows in the post stats

---

### Test 9: Change Reaction
**Steps**:
1. On a post you've already liked
2. Hover over the reaction button
3. Click "Love" (heart icon)

**Expected Result**:
- ✅ Reaction changes from Like to Love
- ✅ Love reaction is highlighted in red
- ✅ Reaction count stays the same (just changed type)

---

### Test 10: Remove Reaction
**Steps**:
1. On a post you've reacted to
2. Click the reaction button again

**Expected Result**:
- ✅ Reaction is removed
- ✅ Button returns to default state
- ✅ Reaction count decreases by 1

---

### Test 11: Add a Comment
**Steps**:
1. Find any post
2. Click "Comment" button
3. Type: "Great post! **Love** this #awesome"
4. Press Enter or click Send

**Expected Result**:
- ✅ Comment appears below the post
- ✅ Your avatar and name show
- ✅ **Love** appears in bold
- ✅ #awesome is highlighted
- ✅ Comment count increases

---

### Test 12: Reply to a Comment
**Steps**:
1. Find a post with comments
2. Click "Reply" on any comment
3. Type: "Thanks for sharing @username!"
4. Press Enter

**Expected Result**:
- ✅ Reply appears indented under the comment
- ✅ @username is highlighted
- ✅ Reply shows your avatar and name

---

### Test 13: Share a Post
**Steps**:
1. Find any post
2. Click "Share" button

**Expected Result**:
- ✅ Toast notification: "Link copied to clipboard!"
- ✅ Link is in clipboard (try pasting it)
- ✅ Link format: http://localhost:3000/posts/{postId}

---

### Test 14: Delete Your Own Post
**Steps**:
1. Find a post you created
2. Click the three dots (⋮) menu
3. Click "Delete Post"
4. Confirm deletion

**Expected Result**:
- ✅ Confirmation dialog appears
- ✅ Post is deleted
- ✅ Toast notification: "Post deleted successfully"
- ✅ Post disappears from feed

---

### Test 15: Try to Delete Someone Else's Post
**Steps**:
1. Find a post created by another user
2. Look for the three dots menu

**Expected Result**:
- ✅ Three dots menu does NOT appear
- ✅ You cannot delete posts you don't own

---

### Test 16: View Posts from Profile Page
**Steps**:
1. Navigate to your Profile page
2. Scroll to the Posts section
3. Create a new post from Profile page
4. Navigate back to Posts page

**Expected Result**:
- ✅ Posts created in Profile page appear in Posts page
- ✅ All posts are visible to all users
- ✅ Posts are sorted by latest first

---

### Test 17: Test Formatting in Comments
**Steps**:
1. Add a comment with formatting:
```
This is **bold** and *italic* text.
Check this link: https://example.com
Mentioning @user and #hashtag
```

**Expected Result**:
- ✅ Bold text appears bold
- ✅ Italic text appears italic
- ✅ Link is clickable
- ✅ Mention is highlighted
- ✅ Hashtag is highlighted

---

### Test 18: Test Long Post Content
**Steps**:
1. Create a post with multiple paragraphs:
```
This is paragraph 1 with **bold** text.

This is paragraph 2 with *italic* text.

This is paragraph 3 with a link: https://example.com

Mentioning @user1 @user2 @user3
Using #tag1 #tag2 #tag3
```

**Expected Result**:
- ✅ All paragraphs are separated
- ✅ All formatting works correctly
- ✅ Multiple mentions highlighted
- ✅ Multiple hashtags highlighted

---

### Test 19: Test Empty Post Prevention
**Steps**:
1. Click "+" button
2. Leave content empty
3. Don't add any images
4. Click "Post"

**Expected Result**:
- ✅ Toast error: "Please add some content or images"
- ✅ Post is NOT created
- ✅ Modal stays open

---

### Test 20: Test Image-Only Post
**Steps**:
1. Click "+" button
2. Leave content empty
3. Add 1 or more images
4. Click "Post"

**Expected Result**:
- ✅ Post is created successfully
- ✅ Post shows only images (no text content)
- ✅ Images display correctly

---

## 🔍 Browser Console Checks

### Open Browser Console (F12) and check for:

**Should NOT see**:
- ❌ Any red errors
- ❌ 404 errors for API calls
- ❌ Undefined variable errors
- ❌ React warnings about keys

**Should see**:
- ✅ Successful API calls (200 status)
- ✅ POST /api/posts (when creating)
- ✅ GET /api/posts (when loading)
- ✅ POST /api/posts/:id/react (when reacting)
- ✅ POST /api/posts/:id/comment (when commenting)

---

## 🌐 Network Tab Checks

### Open Network tab (F12 → Network) and verify:

**When creating a post**:
1. Request: POST /api/posts
2. Status: 201 Created
3. Response contains: `_id`, `user`, `content`, `media`, `createdAt`

**When loading posts**:
1. Request: GET /api/posts
2. Status: 200 OK
3. Response is an array of posts

**When reacting**:
1. Request: POST /api/posts/:id/react
2. Status: 200 OK
3. Response contains updated reactions

**When commenting**:
1. Request: POST /api/posts/:id/comment
2. Status: 200 OK
3. Response contains new comment with user info

---

## 🐛 Common Issues & Solutions

### Issue: Posts not showing
**Solution**:
1. Check if backend is running
2. Verify API endpoint: http://localhost:3001/api/posts
3. Check browser console for errors
4. Ensure you're logged in
5. Try refreshing the page

### Issue: Images not uploading
**Solution**:
1. Check if `uploads/` folder exists in backend
2. Verify file size < 50MB
3. Check file type (jpeg, jpg, png, gif, mp4, mov, avi)
4. Check backend console for multer errors

### Issue: Formatting not working
**Solution**:
1. Verify `textFormatter.js` exists in `frontend/src/utils/`
2. Check if it's imported in PostsPage.js
3. Clear browser cache and refresh
4. Check browser console for errors

### Issue: Reactions not working
**Solution**:
1. Verify backend route exists: POST /api/posts/:id/react
2. Check if user is authenticated
3. Check network tab for API response
4. Verify reaction type is valid

### Issue: Comments not showing
**Solution**:
1. Check if comments are populated in backend
2. Verify API response includes comments array
3. Check if formatPostContent is applied to comments
4. Refresh the page

---

## ✅ Success Criteria

After completing all tests, you should have:

- ✅ Created posts with text only
- ✅ Created posts with images only
- ✅ Created posts with text + images
- ✅ Used all formatting options (bold, italic, links, mentions, hashtags)
- ✅ Uploaded 1, 2, 3, and 5 images
- ✅ Reacted to posts with all 6 reaction types
- ✅ Added comments with formatting
- ✅ Replied to comments
- ✅ Shared posts
- ✅ Deleted your own posts
- ✅ Verified posts from Profile page appear in Posts page
- ✅ Confirmed all posts are visible to all users
- ✅ Verified posts are sorted by latest first

---

## 📊 Performance Checks

### Check page load time:
- Posts page should load in < 2 seconds
- Images should load progressively
- No lag when scrolling

### Check interaction responsiveness:
- Reactions should update instantly
- Comments should appear immediately
- Modal should open/close smoothly
- Animations should be smooth (60fps)

---

## 🎯 Final Verification

1. **Create 5 different posts** with various content types
2. **React to 3 posts** with different reaction types
3. **Add 5 comments** with formatting
4. **Reply to 2 comments**
5. **Share 1 post**
6. **Delete 1 post**
7. **Verify all actions** work smoothly
8. **Check browser console** for any errors
9. **Test on different browsers** (Chrome, Firefox, Edge)
10. **Test on mobile** (responsive design)

---

## 📞 If Tests Fail

1. **Check this document** for solutions
2. **Review POSTS_FEATURE_SUMMARY.md** for implementation details
3. **Check browser console** for specific errors
4. **Verify backend logs** for API errors
5. **Ensure all dependencies** are installed
6. **Restart both servers** (frontend and backend)
7. **Clear browser cache** and try again

---

**Happy Testing! 🎉**

If all tests pass, your Posts feature is fully functional and ready for production!