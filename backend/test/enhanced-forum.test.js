const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const EnhancedPost = require('../models/EnhancedPost');

// Test data
let authToken;
let testUser;
let testPost;

describe('Enhanced Forum API', () => {
  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'student'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: 'test@example.com' });
    await EnhancedPost.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/enhanced-forum/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content',
        category: 'General',
        tags: ['test', 'example'],
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/enhanced-forum/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(postData.content);
      expect(response.body.data.author.name).toBe(testUser.name);
      
      testPost = response.body.data;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/enhanced-forum/posts')
        .send({
          content: 'Test post without auth'
        });

      expect(response.status).toBe(401);
    });

    it('should require content', async () => {
      const response = await request(app)
        .post('/api/enhanced-forum/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test without content'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/enhanced-forum/posts', () => {
    it('should get posts list', async () => {
      const response = await request(app)
        .get('/api/enhanced-forum/posts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter posts by category', async () => {
      const response = await request(app)
        .get('/api/enhanced-forum/posts?category=General')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(post => post.category === 'General')).toBe(true);
    });
  });

  describe('POST /api/enhanced-forum/posts/:id/reactions', () => {
    it('should add reaction to post', async () => {
      const response = await request(app)
        .post(`/api/enhanced-forum/posts/${testPost._id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: 'like' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userReaction).toBe('like');
      expect(response.body.data.totalReactions).toBe(1);
    });

    it('should reject invalid emoji', async () => {
      const response = await request(app)
        .post(`/api/enhanced-forum/posts/${testPost._id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/enhanced-forum/posts/:id/comments', () => {
    it('should create a comment', async () => {
      const response = await request(app)
        .post(`/api/enhanced-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a test comment');
      expect(response.body.data.author.name).toBe(testUser.name);
    });

    it('should require comment content', async () => {
      const response = await request(app)
        .post(`/api/enhanced-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/enhanced-forum/posts/:id/poll/vote', () => {
    it('should create a post with poll and vote', async () => {
      // First create a post with poll
      const pollPostData = {
        content: 'This is a poll post',
        category: 'General',
        pollQuestion: 'What is your favorite programming language?',
        pollOptions: ['JavaScript', 'Python', 'Java', 'C++'],
        visibility: 'public'
      };

      const postResponse = await request(app)
        .post('/api/enhanced-forum/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollPostData);

      expect(postResponse.status).toBe(201);
      expect(postResponse.body.data.poll).toBeDefined();
      expect(postResponse.body.data.poll.options.length).toBe(4);

      // Vote in the poll
      const voteResponse = await request(app)
        .post(`/api/enhanced-forum/posts/${postResponse.body.data._id}/poll/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionIndex: 0 });

      expect(voteResponse.status).toBe(200);
      expect(voteResponse.body.success).toBe(true);
      expect(voteResponse.body.data.results[0].votes).toBe(1);
    });
  });
});

module.exports = app;
