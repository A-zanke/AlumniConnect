const request = require('supertest');
const app = require('../server');
const UnifiedPost = require('../models/UnifiedPost');
const UnifiedComment = require('../models/UnifiedComment');
const User = require('../models/User');

describe('Forum Functionality Tests', () => {
  let testUser;
  let testPost;
  let authToken;

  beforeAll(async () => {
    // Create a test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    });
    await testUser.save();

    // Create a test post with poll
    testPost = new UnifiedPost({
      author: testUser._id,
      title: 'Test Post',
      content: 'This is a test post',
      category: 'General',
      poll: {
        question: 'What is your favorite color?',
        options: [
          { text: 'Red', votes: [] },
          { text: 'Blue', votes: [] },
          { text: 'Green', votes: [] }
        ],
        voters: [],
        allowMultipleVotes: false
      }
    });
    await testPost.save();

    // Get auth token (simplified for test)
    authToken = 'test-token'; // In real test, would get from login
  });

  afterAll(async () => {
    // Clean up test data
    await UnifiedPost.deleteMany({});
    await UnifiedComment.deleteMany({});
    await User.deleteMany({});
  });

  describe('Comment Creation', () => {
    it('should allow authenticated users to create comments', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a test comment');
      expect(response.body.data.author._id).toBe(testUser._id.toString());
    });

    it('should prevent unauthenticated users from creating comments', async () => {
      const commentData = {
        content: 'This should fail'
      };

      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .send(commentData)
        .expect(401);
    });
  });

  describe('Poll Voting', () => {
    it('should allow authenticated users to vote in polls', async () => {
      const voteData = {
        optionIndex: 0
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVotes).toBe(1);
      expect(response.body.data.poll.options[0].votes.length).toBe(1);
    });

    it('should prevent duplicate voting', async () => {
      const voteData = {
        optionIndex: 1
      };

      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData)
        .expect(400); // Should fail due to duplicate voting
    });

    it('should prevent unauthenticated users from voting', async () => {
      const voteData = {
        optionIndex: 0
      };

      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .send(voteData)
        .expect(401);
    });
  });

  describe('Post Retrieval', () => {
    it('should return posts with comments', async () => {
      const response = await request(app)
        .get(`/api/unified-forum/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post._id).toBe(testPost._id.toString());
      expect(Array.isArray(response.body.data.comments)).toBe(true);
    });
  });
});
