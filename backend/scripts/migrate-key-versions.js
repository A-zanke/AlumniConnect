#!/usr/bin/env node
/*
  Migration: Initialize publicKeyVersion and publicKeyGeneratedAt for existing users with encryption keys.
  - Sets publicKeyVersion to 1 and publicKeyGeneratedAt to current timestamp for users with publicKey but missing version fields.

  Usage:
    MONGO_URI must be set in environment.
    node backend/scripts/migrate-key-versions.js
*/

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "MONGO_URI not set. Aborting to avoid migrating in-memory DB."
    );
    process.exit(1);
  }
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const User = require("../models/User.js");

async function migrateUserKeyVersions() {
  const result = await User.updateMany(
    { publicKey: { $exists: true, $ne: null }, publicKeyVersion: { $exists: false } },
    { $set: { publicKeyVersion: 1, publicKeyGeneratedAt: new Date() } }
  );
  return result.modifiedCount;
}

(async () => {
  try {
    console.log("Starting key version migration...");
    await connectDB();
    const count = await migrateUserKeyVersions();
    console.log(`Migration complete: ${count} users updated with publicKeyVersion: 1`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
})();