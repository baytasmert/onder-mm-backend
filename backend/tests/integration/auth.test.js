/**
 * Authentication API Integration Tests
 */

import request from 'supertest';
import express from 'express';

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Authentication API', () => {
  let authToken = null;

  const testAdmin = {
    email: 'test-admin@test.com',
    password: 'TestPassword123!',
    name: 'Test Admin'
  };

  describe('POST /auth/signup-admin', () => {
    it('should create new admin user', async () => {
      const res = await request(API_URL)
        .post('/auth/signup-admin')
        .send(testAdmin)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', testAdmin.email);
    });

    it('should update existing admin password', async () => {
      const res = await request(API_URL)
        .post('/auth/signup-admin')
        .send({
          ...testAdmin,
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/signin', () => {
    it('should sign in with valid credentials', async () => {
      const res = await request(API_URL)
        .post('/auth/signin')
        .send({
          email: testAdmin.email,
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('user');

      authToken = res.body.access_token;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(API_URL)
        .post('/auth/signin')
        .send({
          email: testAdmin.email,
          password: 'WrongPassword'
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should reject missing email', async () => {
      const res = await request(API_URL)
        .post('/auth/signin')
        .send({
          password: 'Password123!'
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/session', () => {
    it('should validate valid token', async () => {
      const res = await request(API_URL)
        .post('/auth/session')
        .send({ token: authToken })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', testAdmin.email);
    });

    it('should reject invalid token', async () => {
      const res = await request(API_URL)
        .post('/auth/session')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });
});
