const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');

describe('Sports Scheduler App', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /', () => {
    it('should return the homepage', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Sports Scheduler');
    });
  });

  describe('GET /auth/login', () => {
    it('should return the login page', async () => {
      const response = await request(app).get('/auth/login');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Login');
    });
  });

  describe('GET /auth/signup', () => {
    it('should return the signup page', async () => {
      const response = await request(app).get('/auth/signup');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Create Account');
    });
  });

  describe('Authentication', () => {
    it('should redirect unauthenticated users from protected routes', async () => {
      const response = await request(app).get('/admin/dashboard');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/auth/login');
    });
  });
});

describe('User Model', () => {
  const { User } = require('../models');

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      };

      const user = await User.createUser(userData);
      
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should default to player role', async () => {
      const userData = {
        name: 'Test Player',
        email: 'player@example.com',
        password: 'password123'
      };

      const user = await User.createUser(userData);
      expect(user.role).toBe('player');
    });
  });

  describe('checkPassword', () => {
    it('should validate correct password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      };

      const user = await User.createUser(userData);
      const isValid = await user.checkPassword('password123');
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      };

      const user = await User.createUser(userData);
      const isValid = await user.checkPassword('wrongpassword');
      
      expect(isValid).toBe(false);
    });
  });

  describe('role methods', () => {
    it('should correctly identify admin users', async () => {
      const adminUser = await User.createUser({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });

      expect(adminUser.isAdmin()).toBe(true);
      expect(adminUser.isPlayer()).toBe(false);
    });

    it('should correctly identify player users', async () => {
      const playerUser = await User.createUser({
        name: 'Player User',
        email: 'player@example.com',
        password: 'password123',
        role: 'player'
      });

      expect(playerUser.isAdmin()).toBe(false);
      expect(playerUser.isPlayer()).toBe(true);
    });
  });
});