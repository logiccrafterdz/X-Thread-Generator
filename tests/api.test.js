/**
 * Integration tests for API endpoints
 */

const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    test('returns health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('gemini');
    });
  });

  describe('POST /api/generate-thread', () => {
    test('generates thread with valid input', async () => {
      const testInput = {
        text: 'This is a test article that should be converted into a Twitter thread. It contains multiple sentences and ideas that can be broken down into separate tweets.',
        language: 'en',
        style: 'educational',
        maxTweets: 3,
        includeHashtags: true,
        includeImages: false
      };

      const response = await request(app)
        .post('/api/generate-thread')
        .send(testInput)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('thread');
      expect(response.body.thread).toBeInstanceOf(Array);
      expect(response.body.thread.length).toBeGreaterThan(0);
      
      // Validate thread structure
      response.body.thread.forEach(tweet => {
        expect(tweet).toHaveProperty('index');
        expect(tweet).toHaveProperty('text');
        expect(tweet).toHaveProperty('char_count');
        expect(tweet.char_count).toBeLessThanOrEqual(280);
      });
    });

    test('rejects empty text input', async () => {
      const testInput = {
        text: '',
        language: 'en',
        style: 'educational',
        maxTweets: 3
      };

      const response = await request(app)
        .post('/api/generate-thread')
        .send(testInput)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('rejects invalid maxTweets', async () => {
      const testInput = {
        text: 'Valid text content',
        maxTweets: 0
      };

      const response = await request(app)
        .post('/api/generate-thread')
        .send(testInput)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('handles Arabic text input', async () => {
      const testInput = {
        text: 'هذا نص تجريبي باللغة العربية يحتوي على أفكار متعددة يمكن تقسيمها إلى تغريدات منفصلة في خيط تويتر.',
        language: 'ar',
        style: 'educational',
        maxTweets: 2
      };

      const response = await request(app)
        .post('/api/generate-thread')
        .send(testInput)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.metadata.direction).toBe('rtl');
    });

    test('enforces rate limiting', async () => {
      const testInput = {
        text: 'Rate limit test content',
        maxTweets: 1
      };

      // Make multiple requests quickly
      const requests = Array(10).fill().map(() => 
        request(app)
          .post('/api/generate-thread')
          .send(testInput)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, but eventually hit rate limit
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitCount).toBe(10);
    }, 10000);
  });

  describe('GET /api/history', () => {
    test('returns history list', async () => {
      const response = await request(app)
        .get('/api/history')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('history');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('supports pagination', async () => {
      const response = await request(app)
        .get('/api/history?page=1&limit=5')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/stats', () => {
    test('returns service statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('total_threads_generated');
      expect(response.body).toHaveProperty('quota_usage');
      expect(response.body).toHaveProperty('service_uptime');
    });
  });

  describe('Error handling', () => {
    test('returns 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('handles malformed JSON', async () => {
      const response = await request(app)
        .post('/api/generate-thread')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Security', () => {
    test('has security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('rejects suspicious content', async () => {
      const maliciousInput = {
        text: '<script>alert("xss")</script>',
        maxTweets: 1
      };

      const response = await request(app)
        .post('/api/generate-thread')
        .send(maliciousInput)
        .expect(400);
    });
  });
});