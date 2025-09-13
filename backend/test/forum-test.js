const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const UnifiedPost = require('../models/UnifiedPost');
const UnifiedComment = require('../models/UnifiedComment');

describe('Forum API Tests', () => {
  let authToken;
  let userId;
  let postId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni_connect_test');
    
    // Create a test user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'student'
    });
    await user.save();
    userId = user._id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await UnifiedPost.deleteMany({});
    await UnifiedComment.deleteMany({});
    await mongoose.connection.close();
  });

  test('Create a post', async () => {
    const postData = {
      title: 'Test Post',
      content: 'This is a test post',
      category: 'General'
    };

    const response = await request(app)
      .post('/api/unified-forum/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Post');
    postId = response.body.data._id;
  });

  test('Add reaction to post', async () => {
    const response = await request(app)
      .post(`/api/unified-forum/posts/${postId}/reactions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ emoji: 'like' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reactions).toBeDefined();
  });

  test('Create comment on post', async () => {
    const commentData = {
      content: 'This is a test comment'
    };

    const response = await request(app)
      .post(`/api/unified-forum/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(commentData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.content).toBe('This is a test comment');
  });

  test('Vote on poll', async () => {
    // First create a post with poll
    const postWithPoll = {
      title: 'Poll Test',
      content: 'This is a poll test',
      category: 'General',
      poll: {
        question: 'What is your favorite color?',
        options: [
          { text: 'Red' },
          { text: 'Blue' },
          { text: 'Green' }
        ]
      }
    };

    const postResponse = await request(app)
      .post('/api/unified-forum/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postWithPoll);

    const pollPostId = postResponse.body.data._id;

    // Vote on the poll
    const voteResponse = await request(app)
      .post(`/api/unified-forum/posts/${pollPostId}/poll/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ optionIndex: 0 });

    expect(voteResponse.status).toBe(200);
    expect(voteResponse.body.success).toBe(true);
    expect(voteResponse.body.data.poll).toBeDefined();
  });

  test('Edit post within 1 minute window', async () => {
    const updateData = {
      title: 'Updated Test Post',
      content: 'This is an updated test post'
    };

    const response = await request(app)
      .put(`/api/unified-forum/posts/${postId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Test Post');
  });

  test('Delete post within 1 minute window', async () => {
    const response = await request(app)
      .delete(`/api/unified-forum/posts/${postId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
