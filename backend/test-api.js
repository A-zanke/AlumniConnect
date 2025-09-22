const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./server');

// Test API endpoints
async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test if server is running
    const response = await request(app)
      .get('/api/unified-forum/posts')
      .expect(401); // Should return 401 without token
    
    console.log('✅ Server is running and API endpoint exists');
    console.log('Response status:', response.status);
    console.log('Response body:', response.body);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
