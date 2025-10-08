# Quick Start Guide - Posts Feature

## 🚀 Start Using Posts in 3 Steps

### Step 1: Start Your Servers
```powershell
# Terminal 1 - Backend
Set-Location "c:\Users\ASUS\Downloads\Telegram Desktop\AlumniConnect\AlumniConnect\backend"
npm start

# Terminal 2 - Frontend
Set-Location "c:\Users\ASUS\Downloads\Telegram Desktop\AlumniConnect\AlumniConnect\frontend"
npm start
```

### Step 2: Navigate to Posts Page
1. Open browser: http://localhost:3000
2. Login with your account (must be teacher or alumni role)
3. Click "Posts" in the navigation bar

### Step 3: Create Your First Post
1. Click the floating **"+"** button (bottom-right corner)
2. Type your content (try using formatting!)
3. Optionally add images (up to 5)
4. Click **"Post"**

---

## 📝 Formatting Cheat Sheet

| What You Type | What You Get |
|---------------|--------------|
| `**bold text**` | **bold text** |
| `*italic text*` | *italic text* |
| `https://example.com` | [clickable link](https://example.com) |
| `@username` | @username (highlighted, clickable) |
| `#hashtag` | #hashtag (highlighted, clickable) |
| 😊 🎉 ❤️ | Emojis work natively! |

---

## 🎨 Example Post

Try copying and pasting this into a new post:

```
Hello everyone! 👋

This is my **first post** with *rich formatting*!

Check out this amazing resource: https://github.com

Shoutout to @john for the inspiration!

#technology #learning #community
```

**Result**: You'll see bold text, italic text, a clickable link, highlighted mention, and highlighted hashtags!

---

## 🖼️ Adding Images

1. Click **"Add Photos"** button in the create post modal
2. Select 1-5 images from your computer
3. Preview appears instantly
4. Remove any image by clicking the **X** on hover
5. Click **"Post"** to publish

**Image Layouts**:
- 1 image = Full width
- 2 images = Side by side
- 3 images = First full width, next two side by side
- 4-5 images = Grid layout

---

## 💙 Reactions (LinkedIn-Style)

Hover over the reaction button on any post to see 6 options:

| Icon | Type | Color |
|------|------|-------|
| 👍 | Like | Blue |
| ❤️ | Love | Red |
| 🏆 | Celebrate | Green |
| 📈 | Support | Purple |
| ⚡ | Insightful | Yellow |
| ❓ | Curious | Orange |

Click to react, click again to change or remove!

---

## 💬 Comments & Replies

**Add a Comment**:
1. Click **"Comment"** button on any post
2. Type your comment (formatting works here too!)
3. Press **Enter** or click **Send**

**Reply to a Comment**:
1. Click **"Reply"** on any comment
2. Type your reply
3. Press **Enter**

---

## 🔗 Share a Post

1. Click **"Share"** button on any post
2. Link is automatically copied to clipboard
3. Paste and share anywhere!

---

## 🗑️ Delete a Post

1. Find a post **you created**
2. Click the **three dots (⋮)** menu
3. Click **"Delete Post"**
4. Confirm deletion

**Note**: You can only delete your own posts!

---

## ✨ Pro Tips

### 1. Combine Formatting
```
**Bold** and *italic* can be used together!
Check out @user's post about #coding at https://example.com
```

### 2. Multi-line Posts
Press Enter to create line breaks:
```
Line 1

Line 2

Line 3
```

### 3. Emoji Shortcuts
Use your OS emoji picker:
- Windows: `Win + .` or `Win + ;`
- Mac: `Cmd + Ctrl + Space`

### 4. Quick Mentions
Type `@` followed by username (no spaces)

### 5. Hashtag Best Practices
Use `#` followed by tag (no spaces, letters and numbers only)

---

## 🎯 Common Use Cases

### Share an Achievement
```
Excited to announce that I just completed my **Machine Learning** certification! 🎉

Thanks to @mentor for the guidance!

#achievement #machinelearning #growth
```

### Ask a Question
```
Anyone have experience with **React Hooks**? 🤔

Looking for resources on #react #javascript

Would appreciate any recommendations! @community
```

### Share Resources
```
Found this amazing tutorial: https://example.com/tutorial

Perfect for anyone learning #webdevelopment

*Highly recommended!* ⭐
```

### Celebrate with Images
```
Amazing team event today! 🎊

[Add 3-5 photos of the event]

#teamwork #community #memories
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't see "+" button | Make sure you're logged in as teacher/alumni |
| Post not appearing | Refresh the page, check browser console |
| Images not uploading | Check file size (<50MB) and type (jpg, png, gif) |
| Formatting not working | Make sure you're using correct syntax (**bold**, *italic*) |
| Can't delete post | You can only delete your own posts |

---

## 📱 Mobile Tips

- Tap the **"+"** button to create posts
- Swipe to see all reaction options
- Tap images to view full size
- Pull down to refresh posts

---

## 🎓 Learning Path

1. **Day 1**: Create simple text posts
2. **Day 2**: Try all formatting options
3. **Day 3**: Add images to posts
4. **Day 4**: React and comment on others' posts
5. **Day 5**: Master advanced formatting combinations

---

## 📊 Feature Checklist

Try all these features:

- [ ] Create a text-only post
- [ ] Create a post with **bold** text
- [ ] Create a post with *italic* text
- [ ] Add a link to a post
- [ ] Mention someone with @username
- [ ] Use a #hashtag
- [ ] Upload 1 image
- [ ] Upload multiple images (2-5)
- [ ] React to a post (try all 6 types!)
- [ ] Add a comment
- [ ] Reply to a comment
- [ ] Share a post
- [ ] Delete your own post
- [ ] Create a post from Profile page
- [ ] Verify it appears in Posts page

---

## 🌟 Best Practices

### Content
- ✅ Be authentic and genuine
- ✅ Use formatting to emphasize key points
- ✅ Add relevant hashtags for discoverability
- ✅ Mention people to give credit
- ✅ Include links to resources

### Images
- ✅ Use high-quality images
- ✅ Keep file sizes reasonable (<5MB per image)
- ✅ Use 1-3 images for best layout
- ✅ Ensure images are relevant to content

### Engagement
- ✅ React to posts you find valuable
- ✅ Leave thoughtful comments
- ✅ Reply to comments on your posts
- ✅ Share posts that others might find useful

---

## 🎉 You're Ready!

You now have everything you need to use the Posts feature like a pro!

**Remember**:
- Posts are visible to **all users**
- Latest posts appear **first**
- Formatting makes your posts **stand out**
- Images make posts more **engaging**
- Reactions and comments build **community**

**Happy Posting! 🚀**

---

## 📚 Additional Resources

- **Full Documentation**: See `POSTS_FEATURE_SUMMARY.md`
- **Testing Guide**: See `TEST_POSTS_FEATURE.md`
- **Text Formatter Code**: `frontend/src/utils/textFormatter.js`
- **Posts Page Code**: `frontend/src/pages/PostsPage.js`

---

**Need Help?**
Check the browser console (F12) for any errors and refer to the troubleshooting guides!