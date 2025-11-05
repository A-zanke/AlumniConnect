/**
 * Test utility for E2EE encryption
 * Open browser console and run: testEncryption()
 */

import { generateKeyPair, encryptMessage, decryptMessage } from './encryption';

window.testEncryption = async function() {
  console.log('🔐 Testing E2EE Encryption...\n');
  
  try {
    // Step 1: Generate key pairs for two users
    console.log('Step 1: Generating key pairs...');
    const user1Keys = await generateKeyPair();
    const user2Keys = await generateKeyPair();
    console.log('✅ Keys generated successfully');
    console.log('  User 1 Public Key:', user1Keys.publicKey.substring(0, 50) + '...');
    console.log('  User 2 Public Key:', user2Keys.publicKey.substring(0, 50) + '...');
    
    // Step 2: Encrypt a message
    console.log('\nStep 2: Encrypting message...');
    const originalMessage = 'Hello, this is a secret message! 🔒';
    console.log('  Original:', originalMessage);
    
    const encrypted = await encryptMessage(originalMessage, user2Keys.publicKey);
    console.log('✅ Message encrypted');
    console.log('  Encrypted:', encrypted.encryptedContent.substring(0, 50) + '...');
    console.log('  Encrypted Key:', encrypted.encryptedKey.substring(0, 50) + '...');
    console.log('  IV:', encrypted.iv.substring(0, 30) + '...');
    console.log('  Encrypted flag:', encrypted.encrypted);
    
    // Step 3: Decrypt the message
    console.log('\nStep 3: Decrypting message...');
    const decrypted = await decryptMessage(encrypted, user2Keys.privateKey);
    console.log('✅ Message decrypted');
    console.log('  Decrypted:', decrypted);
    
    // Step 4: Verify
    console.log('\nStep 4: Verification...');
    if (decrypted === originalMessage) {
      console.log('✅✅✅ SUCCESS! Encryption working perfectly!');
      console.log('Original and decrypted messages match! 🎉');
    } else {
      console.error('❌ FAILED! Messages do not match!');
      console.log('Original:', originalMessage);
      console.log('Decrypted:', decrypted);
    }
    
    // Step 5: Test wrong key
    console.log('\nStep 5: Testing with wrong key (should fail)...');
    try {
      await decryptMessage(encrypted, user1Keys.privateKey);
      console.error('❌ Should have failed with wrong key!');
    } catch (error) {
      console.log('✅ Correctly failed with wrong key');
      console.log('  Error:', error.message);
    }
    
    console.log('\n🎉 All tests completed!');
    return {
      success: true,
      message: 'Encryption is working correctly'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

console.log('🔐 E2EE Test utility loaded. Run testEncryption() to test encryption.');
