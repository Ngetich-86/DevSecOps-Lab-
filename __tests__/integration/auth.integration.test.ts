import request from 'supertest';
import app from '../../src/server';
import db from '../../src/drizzle/db';
import { users } from '../../src/drizzle/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(users);
  });

  afterAll(async () => {
    // Clean up after all tests
    await db.delete(users);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body.user).toMatchObject({
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const dbUsers = await db.select().from(users);
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe('john@example.com');
      expect(dbUsers[0].fullname).toBe('John Doe');
    });

    it('should return 400 if user already exists', async () => {
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      // Create user first
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to create same user again
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should hash password before storing', async () => {
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const dbUsers = await db.select().from(users);
      const storedUser = dbUsers[0];

      expect(storedUser.password).not.toBe('password123');
      expect(storedUser.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern

      // Verify password can be compared
      const isValid = await bcrypt.compare('password123', storedUser.password);
      expect(isValid).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidUserData = {
        fullname: '',
        email: 'invalid-email',
        password: '123', // too short
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.insert(users).values({
        fullname: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        role: 'user',
        isActive: true,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      });
      expect(response.body.user).toHaveProperty('user_id');
      expect(response.body.user).not.toHaveProperty('password');

      // Verify token is valid JWT
      expect(response.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should return 404 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 403 for deactivated account', async () => {
      // Deactivate the user
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.email, 'john@example.com'));

      const loginData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Account is deactivated');
    });
  });

  describe('GET /auth/users', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create admin user and get token
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        fullname: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
        });

      authToken = loginResponse.body.token;
    });

    it('should return all users for admin', async () => {
      // Create additional users
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.insert(users).values([
        {
          fullname: 'User 1',
          email: 'user1@example.com',
          password: hashedPassword,
          role: 'user',
          isActive: true,
        },
        {
          fullname: 'User 2',
          email: 'user2@example.com',
          password: hashedPassword,
          role: 'user',
          isActive: true,
        },
      ]);

      const response = await request(app)
        .get('/auth/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verify user data structure
      response.body.forEach((user: unknown) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('fullname');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/auth/users')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
