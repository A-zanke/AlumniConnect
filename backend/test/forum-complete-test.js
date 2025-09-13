const request = require('supertest');
const app = require('../server');
const UnifiedPost = require('../models/UnifiedPost');
const UnifiedComment = require('../models/UnifiedComment');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Complete Forum Functionality Test', () => {
  let user1, user2, user3;
  let user1Token, user2Token, user3Token;
  let testPost;

  beforeAll(async () => {
    // Create test users
    user1 = new User({
      name: 'Test User 1',
      email: 'test1@example.com',
      password: 'password123',
      username: 'testuser1'
    });
    await user1.save();

    user2 = new User({
      name: 'Test User 2',
      email: 'test2@example.com',
      password: 'password123',
      username: 'testuser2'
    });
    await user2.save();

    user3 = new User({
      name: 'Test User 3',
      email: 'test3@example.com',
      password: 'password123',
      username: 'testuser3'
    });
    await user3.save();

    // Generate JWT tokens
    user1Token = jwt.sign({ id: user1._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user2Token = jwt.sign({ id: user2._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user3Token = jwt.sign({ id: user3._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create a test post with poll
    testPost = new UnifiedPost({
      author: user1._id,
      title: 'Test Post with Poll',
      content: 'This is a test post with a poll',
      category: 'General',
      poll: {
        question: 'What is your favorite programming language?',
        options: [
          { text: 'JavaScript', votes: [] },
          { text: 'Python', votes: [] },
          { text: 'Java', votes: [] },
          { text: 'C++', votes: [] }
        ],
        voters: [],
        allowMultipleVotes: false
      }
    });
    await testPost.save();
  });

  afterAll(async () => {
    // Clean up test data
    await UnifiedPost.deleteMany({});
    await UnifiedComment.deleteMany({});
    await User.deleteMany({});
  });

  describe('Comment System Tests', () => {
    it('should allow user2 to comment on user1\'s post', async () => {
      const commentData = {
        content: 'This is a great post!'
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a great post!');
      expect(response.body.data.author._id).toBe(user2._id.toString());
      expect(response.body.data.author.name).toBe('Test User 2');
    });

    it('should allow user3 to comment on user1\'s post', async () => {
      const commentData = {
        content: 'I agree with this post completely!'
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('I agree with this post completely!');
      expect(response.body.data.author._id).toBe(user3._id.toString());
      expect(response.body.data.author.name).toBe('Test User 3');
    });

    it('should prevent unauthenticated users from commenting', async () => {
      const commentData = {
        content: 'This should fail'
      };

      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .send(commentData)
        .expect(401);
    });

    it('should return post with all comments when fetched', async () => {
      const response = await request(app)
        .get(`/api/unified-forum/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post._id).toBe(testPost._id.toString());
      expect(Array.isArray(response.body.data.comments)).toBe(true);
      expect(response.body.data.comments.length).toBeGreaterThanOrEqual(2);
      
      // Check that comments have author information
      response.body.data.comments.forEach(comment => {
        expect(comment.author).toBeDefined();
        expect(comment.author.name).toBeDefined();
        expect(comment.createdAt).toBeDefined();
      });
    });
  });

  describe('Poll System Tests', () => {
    it('should allow user2 to vote in the poll', async () => {
      const voteData = {
        optionIndex: 0 // JavaScript
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVotes).toBe(1);
      expect(response.body.data.poll.options[0].votes.length).toBe(1);
      expect(response.body.data.poll.voters.length).toBe(1);
      expect(response.body.data.results[0].percentage).toBe(100);
    });

    it('should allow user3 to vote in the poll', async () => {
      const voteData = {
        optionIndex: 1 // Python
      };

      const response = await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVotes).toBe(2);
      expect(response.body.data.poll.options[1].votes.length).toBe(1);
      expect(response.body.data.poll.voters.length).toBe(2);
      
      // Check percentages
      const results = response.body.data.results;
      expect(results[0].percentage).toBe(50); // JavaScript
      expect(results[1].percentage).toBe(50); // Python
    });

    it('should prevent user2 from voting again (duplicate prevention)', async () => {
      const voteData = {
        optionIndex: 2 // Java
      };

      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
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

    it('should return updated poll results when post is fetched', async () => {
      const response = await request(app)
        .get(`/api/unified-forum/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.poll).toBeDefined();
      expect(response.body.data.post.poll.voters.length).toBe(2);
      expect(response.body.data.post.poll.options[0].votes.length).toBe(1); // JavaScript
      expect(response.body.data.post.poll.options[1].votes.length).toBe(1); // Python
      expect(response.body.data.post.poll.options[2].votes.length).toBe(0); // Java
      expect(response.body.data.post.poll.options[3].votes.length).toBe(0); // C++
    });
  });

  describe('Authentication Tests', () => {
    it('should require authentication for all forum endpoints', async () => {
      // Test comment creation without auth
      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .send({ content: 'Test' })
        .expect(401);

      // Test poll voting without auth
      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/poll/vote`)
        .send({ optionIndex: 0 })
        .expect(401);

      // Test getting posts without auth
      await request(app)
        .get('/api/unified-forum/posts')
        .expect(401);
    });

    it('should work with valid authentication tokens', async () => {
      // Test getting posts with valid token
      const response = await request(app)
        .get('/api/unified-forum/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Real-time Updates Test', () => {
    it('should update comment count after new comment', async () => {
      // Get initial comment count
      const initialResponse = await request(app)
        .get(`/api/unified-forum/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const initialCount = initialResponse.body.data.post.commentCount;

      // Add a new comment
      await request(app)
        .post(`/api/unified-forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Another test comment' })
        .expect(201);

      // Check updated comment count
      const updatedResponse = await request(app)
        .get(`/api/unified-forum/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(updatedResponse.body.data.post.commentCount).toBe(initialCount + 1);
    });
  });
});
