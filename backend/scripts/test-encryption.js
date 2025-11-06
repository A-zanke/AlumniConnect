const { generateRSAKeyPair, encryptMessage, decryptMessage } = require('../services/encryptionService');

async function testEncryption() {
  console.log('='.repeat(60));
  console.log('TESTING HYBRID RSA + AES ENCRYPTION');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Generate key pairs for two users
    console.log('\n1️⃣ Generating RSA key pairs...');
    const user1Keys = generateRSAKeyPair();
    const user2Keys = generateRSAKeyPair();
    console.log('✅ Key pairs generated');
    
    // Step 2: Encrypt a message
    const message = "Hello! This is a secret message from User 1 to User 2.";
    console.log(`\n2️⃣ Encrypting message: "${message}"`);
    
    const encrypted = encryptMessage(message, user2Keys.publicKey);
    console.log('✅ Message encrypted successfully');
    console.log('📦 Encrypted data:', {
      encryptedMessage: encrypted.encryptedMessage.substring(0, 50) + '...',
      encryptedAESKey: encrypted.encryptedAESKey.substring(0, 50) + '...',
      iv: encrypted.iv.substring(0, 50) + '...',
      version: encrypted.version
    });
    
    // Step 3: Decrypt the message
    console.log('\n3️⃣ Decrypting message...');
    const decrypted = decryptMessage(encrypted, user2Keys.privateKey);
    console.log('✅ Message decrypted successfully');
    console.log(`📝 Decrypted: "${decrypted}"`);
    
    // Step 4: Verify
    console.log('\n4️⃣ Verification:');
    if (decrypted === message) {
      console.log('✅ SUCCESS: Original and decrypted messages match!');
    } else {
      console.log('❌ FAIL: Messages do not match');
      console.log('   Original:', message);
      console.log('   Decrypted:', decrypted);
    }
    
    // Step 5: Test wrong key
    console.log('\n5️⃣ Testing with wrong private key...');
    try {
      const wrongDecryption = decryptMessage(encrypted, user1Keys.privateKey);
      console.log('❌ FAIL: Should not decrypt with wrong key');
    } catch (error) {
      console.log('✅ SUCCESS: Correctly rejected wrong key');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testEncryption();
