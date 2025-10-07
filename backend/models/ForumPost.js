const mongoose = require('mongoose');

const ForumPollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const ForumPollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [ForumPollOptionSchema],
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const ForumReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], default: 'like' }
}, { _id: false });

const ForumPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAnonymous: { type: Boolean, default: false },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Career', 'Higher Studies', 'Internships', 'Hackathons', 'Projects', 'Alumni Queries'],
    required: true
  },
  tags: [{ type: String, trim: true }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  media: [{
    url: String,
    type: { type: String, enum: ['image', 'pdf', 'link'], required: true },
    filename: String
  }],
  poll: ForumPollSchema,
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [ForumReactionSchema],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shares: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharedAt: { type: Date, default: Date.now }
  }],
  commentCount: { type: Number, default: 0 },
  highlightedByAlumni: { type: Boolean, default: false },
  isReported: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

// Update comment count when comments are added/removed
ForumPostSchema.methods.updateCommentCount = async function() {
  const ForumComment = mongoose.model('ForumComment');
  const count = await ForumComment.countDocuments({ post: this._id });
  this.commentCount = count;
  return this.save();
};

module.exports = mongoose.model('ForumPost', ForumPostSchema);