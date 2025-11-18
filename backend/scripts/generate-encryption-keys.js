const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

// Generate RSA key pair for encryption
function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      }
    );
  });
}

// Convert PEM to base64
function pemToBase64(pem) {
  return pem
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .replace(/\s/g, '');
}

async function generateKeysForAllUsers() {
  try {
    console.log('🔐 Starting encryption key generation for all users...');
    
    // Connect to database
    const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni-connect';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to database');
    
    // Find all users without public keys
    const usersWithoutKeys = await User.find({ 
      $or: [
        { publicKey: { $exists: false } },
        { publicKey: null },
        { publicKey: '' }
      ]
    }).select('_id name username email');
    
    console.log(`📊 Found ${usersWithoutKeys.length} users without encryption keys`);
    
    if (usersWithoutKeys.length === 0) {
      console.log('✅ All users already have encryption keys!');
      await mongoose.connection.close();
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithoutKeys) {
      try {
        console.log(`\n🔑 Generating keys for user: ${user.name} (${user.username})`);
        
        // Generate key pair
        const { publicKey, privateKey } = await generateKeyPair();
        
        // Convert to base64 format (same as Web Crypto API format)
        const publicKeyBase64 = pemToBase64(publicKey);
        
        // Update user with public key
        await User.findByIdAndUpdate(user._id, { 
          publicKey: publicKeyBase64 
        });
        
        console.log(`✅ Keys generated for ${user.name}`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   IMPORTANT: User must login once to receive their private key`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error generating keys for ${user.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Key Generation Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${usersWithoutKeys.length}`);
    console.log('='.repeat(50));
    
    // Verify all users now have keys
    const remainingWithoutKeys = await User.countDocuments({ 
      $or: [
        { publicKey: { $exists: false } },
        { publicKey: null },
        { publicKey: '' }
      ]
    });
    
    if (remainingWithoutKeys === 0) {
      console.log('\n🎉 All users now have encryption keys!');
    } else {
      console.log(`\n⚠️ Warning: ${remainingWithoutKeys} users still without keys`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
generateKeysForAllUsers();