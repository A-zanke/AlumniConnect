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

const ForumPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional when anonymous
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
  media: {
    url: String,
    type: { type: String, enum: ['image', 'pdf', 'link', null], default: null }
  },
  poll: ForumPollSchema,
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  highlightedByAlumni: { type: Boolean, default: false },
  isReported: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ForumPost', ForumPostSchema);