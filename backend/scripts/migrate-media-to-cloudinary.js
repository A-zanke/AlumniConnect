#!/usr/bin/env node
/*
  Migration: Move local media in backend/uploads/* and DB references to Cloudinary.
  - Scans filesystem for media files
  - Uploads to Cloudinary (resource_type:auto)
  - Updates MongoDB document fields referencing local /uploads paths
  - Deletes local files upon successful upload

  Usage:
    CLOUDINARY_* and MONGO_URI must be set in environment.
    node backend/scripts/migrate-media-to-cloudinary.js
*/

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const ROOT = path.join(__dirname, '..');
const UPLOADS_ROOT = path.join(__dirname, '../uploads');

const isMediaFile = (p) => /(\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|mp4|webm|ogg|mov|mkv|mp3|wav|m4a|aac|flac|opus|wma|pdf|doc|docx|txt|xlsx|xls|ppt|pptx|zip|rar|7z))$/i.test(p);

async function listFilesRecursive(dir) {
  const files = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && isMediaFile(full)) files.push(full);
    }
  }
  await walk(dir);
  return files;
}

function isHttpUrl(u) { return /^https?:\/\//i.test(String(u)); }
function looksLocalUploads(u) { return typeof u === 'string' && (/^\/?uploads\//.test(u) || /^\/uploads\//.test(u)); }

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Aborting to avoid migrating in-memory DB.');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Lazy import models
const Models = {};
function getModel(name) {
  if (Models[name]) return Models[name];
  Models[name] = require(path.join(__dirname, `../models/${name}.js`));
  return Models[name];
}

async function ensureCloudinaryEnv() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Cloudinary environment variables not set. Aborting migration.');
    process.exit(1);
  }
}

async function uploadToCloudinary(localFile, folder = 'alumni-connect/legacy') {
  try {
    const res = await cloudinary.uploader.upload(localFile, {
      resource_type: 'auto',
      folder,
      overwrite: false,
      public_id: `${Date.now()}_${path.basename(localFile, path.extname(localFile)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`,
    });
    return res.secure_url || res.url;
  } catch (e) {
    console.error('Cloudinary upload failed:', localFile, e.message);
    return null;
  }
}

function resolveLocalPathFromUrl(u) {
  // Convert '/uploads/...' or 'uploads/...' or 'http://host/uploads/...'
  try {
    if (!u) return null;
    let rel = String(u);
    if (isHttpUrl(rel)) {
      const idx = rel.indexOf('/uploads/');
      if (idx !== -1) rel = rel.slice(idx + 1); // keep 'uploads/...'
    }
    if (rel.startsWith('/')) rel = rel.slice(1);
    if (!rel.startsWith('uploads/')) return null;
    return path.join(ROOT, rel); // ROOT = backend
  } catch {
    return null;
  }
}

async function migrateMessageAttachments() {
  const Message = getModel('Message');
  const cursor = Message.find({ 'attachments.0': { $exists: true } }).cursor();
  let updated = 0;
  for await (const msg of cursor) {
    let changed = false;
    const next = [];
    for (const att of msg.attachments || []) {
      if (typeof att !== 'string') continue;
      if (isHttpUrl(att) && /res\.cloudinary\.com/.test(att)) { next.push(att); continue; }
      let localPath = resolveLocalPathFromUrl(att);
      if (!localPath || !(await fsp.stat(localPath).catch(() => null))) {
        // Unknown path; leave as-is if absolute http (non-cloud) else skip
        if (isHttpUrl(att)) next.push(att);
        continue;
      }
      const url = await uploadToCloudinary(localPath, 'alumni-connect/messages');
      if (url) {
        next.push(url);
        changed = true;
        try { await fsp.unlink(localPath); } catch {}
      }
    }
    if (changed) {
      msg.attachments = next;
      try { await msg.save(); updated++; } catch (e) { console.error('Save message failed', msg._id, e.message); }
    }
  }
  return updated;
}

async function migratePostsMedia() {
  const Post = getModel('Post');
  const posts = await Post.find({ 'media.0': { $exists: true } });
  let updated = 0;
  for (const post of posts) {
    let changed = false;
    for (const m of post.media || []) {
      if (!m || !m.url) continue;
      if (isHttpUrl(m.url) && /res\.cloudinary\.com/.test(m.url)) continue;
      const localPath = resolveLocalPathFromUrl(m.url);
      if (!localPath || !(await fsp.stat(localPath).catch(() => null))) continue;
      const url = await uploadToCloudinary(localPath, 'alumni-connect/posts');
      if (url) {
        m.url = url;
        changed = true;
        try { await fsp.unlink(localPath); } catch {}
      }
    }
    if (changed) { try { await post.save(); updated++; } catch (e) { console.error('Save post failed', post._id, e.message); } }
  }
  return updated;
}

async function migrateEventsImages() {
  const Event = getModel('Event');
  const events = await Event.find({ imageUrl: { $exists: true, $ne: null } });
  let updated = 0;
  for (const ev of events) {
    const u = ev.imageUrl;
    if (!u || (isHttpUrl(u) && /res\.cloudinary\.com/.test(u))) continue;
    const localPath = resolveLocalPathFromUrl(u);
    if (!localPath || !(await fsp.stat(localPath).catch(() => null))) continue;
    const url = await uploadToCloudinary(localPath, 'alumni-connect/events');
    if (url) {
      ev.imageUrl = url; updated++;
      try { await fsp.unlink(localPath); } catch {}
      try { await ev.save(); } catch (e) { console.error('Save event failed', ev._id, e.message); }
    }
  }
  return updated;
}

async function migrateUserAvatars() {
  const User = getModel('User');
  const users = await User.find({ avatarUrl: { $exists: true, $ne: null } });
  let updated = 0;
  for (const u of users) {
    const v = u.avatarUrl;
    if (!v || (isHttpUrl(v) && /res\.cloudinary\.com/.test(v))) continue;
    const localPath = resolveLocalPathFromUrl(v);
    if (!localPath || !(await fsp.stat(localPath).catch(() => null))) continue;
    const url = await uploadToCloudinary(localPath, 'alumni-connect/avatars');
    if (url) {
      u.avatarUrl = url; updated++;
      try { await fsp.unlink(localPath); } catch {}
      try { await u.save(); } catch (e) { console.error('Save user failed', u._id, e.message); }
    }
  }
  return updated;
}

async function migrateProfiles(ModelName, fieldPath, folder) {
  const Model = getModel(ModelName);
  const docs = await Model.find({ [fieldPath]: { $exists: true, $ne: null } });
  let updated = 0;
  for (const doc of docs) {
    const val = fieldPath.split('.').reduce((o, k) => (o ? o[k] : null), doc);
    if (!val || (isHttpUrl(val) && /res\.cloudinary\.com/.test(val))) continue;
    const localPath = resolveLocalPathFromUrl(val);
    if (!localPath || !(await fsp.stat(localPath).catch(() => null))) continue;
    const url = await uploadToCloudinary(localPath, folder);
    if (url) {
      // set nested
      const parts = fieldPath.split('.');
      let o = doc; for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = url;
      updated++;
      try { await fsp.unlink(localPath); } catch {}
      try { await doc.save(); } catch (e) { console.error(`Save ${ModelName} failed`, doc._id, e.message); }
    }
  }
  return updated;
}

async function migrateForumMedia() {
  const ForumPost = getModel('ForumPost');
  const posts = await ForumPost.find({ 'media.0': { $exists: true } });
  let updated = 0;
  for (const p of posts) {
    let changed = false;
    (p.media || []).forEach((m) => { /* normalize */ });
    for (const m of p.media || []) {
      if (!m || !m.url) continue;
      if (isHttpUrl(m.url) && /res\.cloudinary\.com/.test(m.url)) continue;
      const localPath = resolveLocalPathFromUrl(m.url);
      if (!localPath || !(await fsp.stat(localPath).catch(() => null))) continue;
      const url = await uploadToCloudinary(localPath, 'alumni-connect/forum');
      if (url) {
        m.url = url; updated++; changed = true;
        try { await fsp.unlink(localPath); } catch {}
      }
    }
    if (changed) { try { await p.save(); } catch (e) { console.error('Save forum post failed', p._id, e.message); } }
  }
  return updated;
}

async function migrateFilesystemLooseFiles() {
  // Upload any orphan files in uploads dir that aren't referenced in DB (best-effort)
  const folders = [UPLOADS_ROOT, path.join(UPLOADS_ROOT, 'messages'), path.join(UPLOADS_ROOT, 'profile'), path.join(UPLOADS_ROOT, 'events'), path.join(UPLOADS_ROOT, 'posts'), path.join(UPLOADS_ROOT, 'forum')];
  let total = 0;
  for (const dir of folders) {
    const files = await listFilesRecursive(dir).catch(() => []);
    for (const f of files) {
      const url = await uploadToCloudinary(f, 'alumni-connect/legacy');
      if (url) {
        total++;
        try { await fsp.unlink(f); } catch {}
      }
    }
  }
  return total;
}

(async () => {
  console.log('Starting media migration to Cloudinary...');
  await ensureCloudinaryEnv();
  await connectDB();

  const results = {};
  results.messages = await migrateMessageAttachments();
  results.posts = await migratePostsMedia();
  results.events = await migrateEventsImages();
  results.users = await migrateUserAvatars();
  results.students = await migrateProfiles('Student', 'profilePicture', 'alumni-connect/avatars');
  results.teachers = await migrateProfiles('Teacher', 'profilePicture', 'alumni-connect/avatars');
  results.alumni = await migrateProfiles('Alumni', 'profilePicture', 'alumni-connect/avatars');
  results.forum = await migrateForumMedia();
  const loose = await migrateFilesystemLooseFiles();
  results.looseFilesUploaded = loose;

  console.log('Migration summary:', results);
  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
})();
