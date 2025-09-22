const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'file'], default: 'image' },
  name: { type: String, default: '' },
  size: { type: Number },
  duration: { type: Number } // For videos
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '', maxlength: 5000 },
  media: { type: [MediaSchema], default: [] },
  postType: { type: String, enum: ['text', 'image', 'video', 'mixed'], default: 'text' },
  visibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
  
  // Enhanced targeting options
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  roleScope: [{ type: String }], // e.g., ['student','teacher','alumni']
  
  // Enhanced interaction features
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  shares: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    message: { type: String, maxlength: 500 },
    sharedAt: { type: Date, default: Date.now }
  }],
  
  // Enhanced content features
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String, maxlength: 50 }], // hashtags and custom tags
  location: {
    name: { type: String, maxlength: 100 },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Analytics and moderation
  views: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
    duration: Number // in seconds
  }],
  reports: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 500 },
    reportedAt: { type: Date, default: Date.now }
  }],
  
  // Moderation status
  approved: { type: Boolean, default: true },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  moderationNotes: { type: String, maxlength: 1000 },
  
  // SEO and discovery
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  searchKeywords: [{ type: String }],
  
  // Scheduling
  scheduledFor: { type: Date },
  isScheduled: { type: Boolean, default: false },
  
  // Edit history
  editHistory: [{
    content: String,
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ visibility: 1, approved: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ mentions: 1 });
PostSchema.index({ 'likes': 1 });
PostSchema.index({ featured: 1, trending: 1 });

// Virtual for engagement score
PostSchema.virtual('engagementScore').get(function() {
  const likesCount = this.likes?.length || 0;
  const commentsCount = this.comments?.length || 0;
  const sharesCount = this.shares?.length || 0;
  const viewsCount = this.views?.length || 0;
  
  return (likesCount * 1) + (commentsCount * 2) + (sharesCount * 3) + (viewsCount * 0.1);
});

// Virtual for total comments (including replies)
PostSchema.virtual('totalComments').get(function() {
  let total = this.comments?.length || 0;
  this.comments?.forEach(comment => {
    total += comment.replies?.length || 0;
  });
  return total;
});

// Pre-save middleware to update postType based on media
PostSchema.pre('save', function(next) {
  if (this.media && this.media.length > 0) {
    const hasImages = this.media.some(m => m.type === 'image');
    const hasVideos = this.media.some(m => m.type === 'video');
    
    if (hasImages && hasVideos) {
      this.postType = 'mixed';
    } else if (hasVideos) {
      this.postType = 'video';
    } else if (hasImages) {
      this.postType = 'image';
    }
  } else {
    this.postType = 'text';
  }
  
  // Extract and clean tags
  if (this.content) {
    const hashtagMatches = this.content.match(/#[\w]+/g);
    if (hashtagMatches) {
      const hashtags = hashtagMatches.map(tag => tag.slice(1).toLowerCase());
      this.tags = [...new Set([...this.tags, ...hashtags])];
    }
  }
  
  next();
});

module.exports = mongoose.model('Post', PostSchema);