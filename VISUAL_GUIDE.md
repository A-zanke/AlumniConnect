# 📸 Visual Guide - Posts Feature

## 🎨 What Your Posts Will Look Like

### 1. Posts Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  📱 AlumniConnect Navigation Bar                        │
│  [Home] [Posts] [Network] [Messages] [Profile]         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Posts                                                   │
│  Discover insights and experiences from our community   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │  👤 John Doe                              ⋮     │   │
│  │  Alumni • 2h ago                                │   │
│  │                                                  │   │
│  │  This is **bold** and *italic* text.           │   │
│  │  Check out https://github.com                   │   │
│  │  Mentioning @jane and #technology               │   │
│  │                                                  │   │
│  │  ┌──────────┐ ┌──────────┐                     │   │
│  │  │  Image 1 │ │  Image 2 │                     │   │
│  │  └──────────┘ └──────────┘                     │   │
│  │                                                  │   │
│  │  👍 ❤️ 🏆 15 reactions     5 comments          │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  [👍 Like] [💬 Comment] [🔗 Share]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [More posts...]                                        │
└─────────────────────────────────────────────────────────┘

                                              ┌──────┐
                                              │  +   │ ← Floating button
                                              └──────┘
```

---

### 2. Create Post Modal

```
┌─────────────────────────────────────────────────────────┐
│  Create Post                                      ✕     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 👤 Your Name                                       │ │
│  │ Alumni                                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ What do you want to share?                         │ │
│  │ Use **bold**, *italic*, @mentions, #hashtags...    │ │
│  │                                                     │ │
│  │                                                     │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ℹ️ Formatting tips: **bold**, *italic*, @username     │
│     for mentions, #hashtag for tags, paste URLs         │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  Image 1 │ │  Image 2 │ │  Image 3 │               │
│  │    ✕     │ │    ✕     │ │    ✕     │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                          │
│  [📷 Add Photos]                          [Post]        │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Post with Rich Text Formatting

```
┌─────────────────────────────────────────────────────────┐
│  👤 Jane Smith                                    ⋮     │
│  Teacher • 5m ago                                       │
│                                                          │
│  Hello everyone! 👋                                     │
│                                                          │
│  This is my first post with rich formatting!           │
│  ─────────────────────────────────────────────────      │
│  This is BOLD and this is italic text.                 │
│  ─────────────────────────────────────────────────      │
│  Check out this link: github.com                       │
│  ─────────────────────────────────────────────────      │
│  Shoutout to @john for the inspiration!                │
│  ─────────────────────────────────────────────────      │
│  #technology #learning #community                       │
│                                                          │
│  👍 ❤️ 🏆 8 reactions                                  │
│  ─────────────────────────────────────────────────      │
│  [👍 Like] [💬 Comment] [🔗 Share]                     │
└─────────────────────────────────────────────────────────┘

Legend:
- BOLD = **text** (appears in bold)
- italic = *text* (appears in italic)
- github.com = clickable blue link
- @john = highlighted mention (purple background)
- #technology = highlighted hashtag (blue background)
```

---

### 4. Image Layouts

#### Single Image:
```
┌─────────────────────────────────────────────────────────┐
│  👤 User Name                                           │
│  Check out this photo!                                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │                  Full Width Image                  │ │
│  │                  (max 500px height)                │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Two Images:
```
┌─────────────────────────────────────────────────────────┐
│  👤 User Name                                           │
│  Two beautiful images                                   │
│                                                          │
│  ┌──────────────────────┐ ┌──────────────────────┐    │
│  │                       │ │                       │    │
│  │      Image 1          │ │      Image 2          │    │
│  │                       │ │                       │    │
│  └──────────────────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

#### Three Images:
```
┌─────────────────────────────────────────────────────────┐
│  👤 User Name                                           │
│  Three amazing photos                                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                  Image 1 (Full Width)              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌──────────────────────┐ ┌──────────────────────┐    │
│  │      Image 2          │ │      Image 3          │    │
│  └──────────────────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

#### Four or Five Images:
```
┌─────────────────────────────────────────────────────────┐
│  👤 User Name                                           │
│  Multiple images from the event                         │
│                                                          │
│  ┌──────────────────────┐ ┌──────────────────────┐    │
│  │      Image 1          │ │      Image 2          │    │
│  └──────────────────────┘ └──────────────────────┘    │
│  ┌──────────────────────┐ ┌──────────────────────┐    │
│  │      Image 3          │ │      Image 4          │    │
│  └──────────────────────┘ └──────────────────────┘    │
│  ┌──────────────────────┐                              │
│  │      Image 5          │                              │
│  └──────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

---

### 5. Reaction Picker (Hover State)

```
┌─────────────────────────────────────────────────────────┐
│  👤 User Name                                           │
│  Great post content here...                             │
│                                                          │
│  👍 ❤️ 🏆 12 reactions                                 │
│  ─────────────────────────────────────────────────      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 👍 Like  ❤️ Love  🏆 Celebrate                    │  │
│  │ 📈 Support  ⚡ Insightful  ❓ Curious             │  │
│  └──────────────────────────────────────────────────┘  │
│  [👍 Like] [💬 Comment] [🔗 Share]                     │
└─────────────────────────────────────────────────────────┘
```

**Color Coding:**
- 👍 Like = Blue
- ❤️ Love = Red
- 🏆 Celebrate = Green
- 📈 Support = Purple
- ⚡ Insightful = Yellow
- ❓ Curious = Orange

---

### 6. Comments Section

```
┌─────────────────────────────────────────────────────────┐
│  👤 Original Post Author                                │
│  Post content here...                                   │
│                                                          │
│  👍 ❤️ 15 reactions     3 comments                     │
│  ─────────────────────────────────────────────────      │
│  [👍 Like] [💬 Comment] [🔗 Share]                     │
│                                                          │
│  💬 Comments:                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 👤 Commenter 1 • 1h ago                            │ │
│  │ Great post! **Love** this #awesome                 │ │
│  │ [Reply]                                             │ │
│  │                                                     │ │
│  │   ↳ 👤 Replier • 30m ago                          │ │
│  │     Thanks for sharing @commenter1!                │ │
│  │     [Reply]                                         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Write a comment...                          [Send] │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 7. Post Menu (Owner Only)

```
┌─────────────────────────────────────────────────────────┐
│  👤 Your Name                                     ⋮     │
│  Your post content...                          ┌──────┐ │
│                                                 │ 🗑️   │ │
│                                                 │Delete│ │
│                                                 └──────┘ │
│  [👍 Like] [💬 Comment] [🔗 Share]                     │
└─────────────────────────────────────────────────────────┘
```

---

### 8. Mobile View (Responsive)

```
┌─────────────────────┐
│  Posts              │
│  Community insights │
└─────────────────────┘

┌─────────────────────┐
│ 👤 User Name    ⋮  │
│ Alumni • 2h ago     │
│                     │
│ Post content with   │
│ BOLD and italic    │
│                     │
│ ┌─────────────────┐ │
│ │    Image 1      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │    Image 2      │ │
│ └─────────────────┘ │
│                     │
│ 👍 ❤️ 8  3 comments│
│ ─────────────────── │
│ [👍] [💬] [🔗]     │
└─────────────────────┘

         ┌───┐
         │ + │
         └───┘
```

---

## 🎨 Color Scheme

### Backgrounds:
```
Main Background: Gradient
  ┌─────────────────────────────────┐
  │ Slate-50 → Blue-50 → Indigo-50 │
  └─────────────────────────────────┘

Post Cards: White
  ┌─────────────────────────────────┐
  │         #FFFFFF (White)         │
  └─────────────────────────────────┘
```

### Text Colors:
```
Primary Text:   #1E293B (Slate-800)
Secondary Text: #64748B (Slate-500)
Muted Text:     #94A3B8 (Slate-400)
```

### Interactive Elements:
```
Primary Button:  Indigo-600 → Blue-600 (Gradient)
Hover State:     Indigo-700
Active State:    Indigo-800

Links:           Blue-600
Mentions:        Purple-600 (background: Purple-50)
Hashtags:        Blue-600 (background: Blue-50)
```

### Reactions:
```
Like:        Blue-600    (#2563EB)
Love:        Red-600     (#DC2626)
Celebrate:   Green-600   (#16A34A)
Support:     Purple-600  (#9333EA)
Insightful:  Yellow-600  (#CA8A04)
Curious:     Orange-600  (#EA580C)
```

---

## 🎭 Animations

### Page Load:
```
Posts fade in from bottom:
  ┌─────┐
  │     │ ↑ Slide up + Fade in
  │ Post│ (0.3s ease-out)
  │     │
  └─────┘
```

### Modal Open:
```
Scale + Fade:
  ┌─────┐      ┌─────────┐
  │  •  │  →   │  Modal  │
  └─────┘      └─────────┘
  (0.2s ease-out)
```

### Hover Effects:
```
Buttons:
  Normal → Hover
  ┌─────┐   ┌─────┐
  │     │ → │ ↑   │ (Lift + Shadow)
  └─────┘   └─────┘

Images:
  Normal → Hover
  ┌─────┐   ┌─────┐
  │     │ → │ 95% │ (Opacity)
  └─────┘   └─────┘
```

---

## 📱 Responsive Breakpoints

### Desktop (> 1024px):
```
┌────────────────────────────────────────────┐
│  Navbar                                    │
├────────────────────────────────────────────┤
│                                            │
│    ┌──────────────────────────────┐       │
│    │      Posts Feed (max-w-3xl)  │       │
│    │                              │       │
│    └──────────────────────────────┘       │
│                                            │
└────────────────────────────────────────────┘
```

### Tablet (768px - 1024px):
```
┌──────────────────────────────┐
│  Navbar                      │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │   Posts Feed (90%)     │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Mobile (< 768px):
```
┌──────────────┐
│  Navbar      │
├──────────────┤
│ ┌──────────┐ │
│ │Posts Feed│ │
│ │(Full W.) │ │
│ └──────────┘ │
└──────────────┘
```

---

## 🎯 Interactive States

### Button States:
```
Default:
  ┌──────────┐
  │   Post   │
  └──────────┘

Hover:
  ┌──────────┐
  │   Post   │ ← Darker + Shadow
  └──────────┘

Active (Clicked):
  ┌──────────┐
  │   Post   │ ← Scale down (0.95)
  └──────────┘

Disabled:
  ┌──────────┐
  │   Post   │ ← 50% opacity + No cursor
  └──────────┘
```

### Reaction States:
```
Not Reacted:
  [👍 Like] ← Gray text

Reacted:
  [👍 Like] ← Blue text + Blue background
```

---

## 🔤 Typography

### Font Sizes:
```
Heading (Posts):     36px (text-4xl)
Post Author:         16px (text-base)
Post Content:        15px (text-sm)
Timestamps:          14px (text-sm)
Comments:            14px (text-sm)
Buttons:             15px (text-base)
```

### Font Weights:
```
Headings:      900 (font-black)
Author Names:  600 (font-semibold)
Body Text:     400 (font-normal)
Buttons:       600 (font-semibold)
```

---

## 🎪 Special Effects

### Shadows:
```
Post Cards:
  Normal:  shadow-sm
  Hover:   shadow-md

Modal:
  shadow-2xl

Floating Button:
  shadow-2xl + shadow-indigo-500/50
```

### Borders:
```
Post Cards:     1px solid #E2E8F0
Input Fields:   2px solid #E2E8F0
Focus State:    2px solid #4F46E5
```

### Rounded Corners:
```
Post Cards:     16px (rounded-2xl)
Buttons:        12px (rounded-xl)
Images:         12px (rounded-xl)
Avatar:         50% (rounded-full)
```

---

## 🎬 User Flow Diagram

```
Start
  ↓
Login
  ↓
Navigate to Posts Page
  ↓
┌─────────────────────────────────┐
│ View All Posts                  │
│ - Scroll through feed           │
│ - See latest posts first        │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ Interact with Posts             │
│ - React (6 types)               │
│ - Comment                       │
│ - Reply to comments             │
│ - Share                         │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ Create New Post                 │
│ - Click + button                │
│ - Add content with formatting   │
│ - Upload images (optional)      │
│ - Click Post                    │
└─────────────────────────────────┘
  ↓
Post appears at top of feed
  ↓
Others can see and interact
  ↓
Receive reactions and comments
  ↓
Reply to comments
  ↓
Share post
  ↓
Delete post (if needed)
```

---

## 🎨 Example Post Variations

### 1. Text-Only Post:
```
┌─────────────────────────────────┐
│ 👤 Alice Johnson               │
│ Alumni • 1h ago                 │
│                                 │
│ Just finished an amazing        │
│ **Machine Learning** course!    │
│                                 │
│ Thanks to @professor for the    │
│ guidance! #learning #AI         │
│                                 │
│ 👍 ❤️ 5                        │
│ [👍] [💬] [🔗]                 │
└─────────────────────────────────┘
```

### 2. Image-Only Post:
```
┌─────────────────────────────────┐
│ 👤 Bob Smith                    │
│ Teacher • 30m ago               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │      Beautiful Sunset       │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ 👍 ❤️ 🏆 12                    │
│ [👍] [💬] [🔗]                 │
└─────────────────────────────────┘
```

### 3. Mixed Content Post:
```
┌─────────────────────────────────┐
│ 👤 Carol Davis                  │
│ Alumni • 2h ago                 │
│                                 │
│ Team event was *amazing*! 🎉    │
│                                 │
│ Check out the photos:           │
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │ Photo 1 │ │ Photo 2 │        │
│ └─────────┘ └─────────┘        │
│                                 │
│ #teamwork #community            │
│                                 │
│ 👍 ❤️ 🏆 20  8 comments        │
│ [👍] [💬] [🔗]                 │
└─────────────────────────────────┘
```

---

**This visual guide shows exactly how your Posts feature will look and behave!** 🎨

Use this as a reference to understand the UI/UX design and layout.