import { Request, Response } from 'express';
import { createUserController, loginUserController } from '../../src/auth/auth.controller';
import * as authService from '../../src/auth/auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../src/auth/auth.service');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/config/mailer');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Controller - Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    jest.clearAllMocks();
  });

  describe('createUserController', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user'
      };
      mockReq = { body: userData };
      
      const hashedPassword = 'hashedPassword123';
      const createdUser = { id: 1, ...userData, password: hashedPassword };

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockAuthService.getUserByEmailService.mockResolvedValue(null);
      mockAuthService.createUserService.mockResolvedValue(createdUser);

      // Act
      await createUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockAuthService.getUserByEmailService).toHaveBeenCalledWith('john@example.com');
      expect(mockAuthService.createUserService).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword,
        isActive: true
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User created successfully',
        user: {
          id: 1,
          fullname: 'John Doe',
          email: 'john@example.com',
          role: 'user'
        }
      });
    });

    it('should return 400 if user already exists', async () => {
      // Arrange
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      mockReq = { body: userData };
      
      const existingUser = { id: 1, email: 'john@example.com' };
      mockAuthService.getUserByEmailService.mockResolvedValue(existingUser);

      // Act
      await createUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'User already exists' });
      expect(mockAuthService.createUserService).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      const userData = {
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      mockReq = { body: userData };
      
      mockAuthService.getUserByEmailService.mockRejectedValue(new Error('Database error'));

      // Act
      await createUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('loginUserController', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };
      mockReq = { body: loginData };
      
      const user = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword123',
        fullname: 'John Doe',
        role: 'user',
        isActive: true
      };
      const token = 'jwt-token-123';

      mockAuthService.userLoginService.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue(token as never);

      // Mock environment variable
      process.env.JWT_SECRET = 'test-secret';

      // Act
      await loginUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockAuthService.userLoginService).toHaveBeenCalledWith('john@example.com', 'password123');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Login successful',
        token,
        user: {
          user_id: 1,
          fullname: 'John Doe',
          email: 'john@example.com',
          role: 'user'
        }
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      mockReq = { body: loginData };
      
      mockAuthService.userLoginService.mockResolvedValue(null);

      // Act
      await loginUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword'
      };
      mockReq = { body: loginData };
      
      const user = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword123',
        fullname: 'John Doe',
        role: 'user',
        isActive: true
      };

      mockAuthService.userLoginService.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act
      await loginUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 403 for deactivated account', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };
      mockReq = { body: loginData };
      
      const user = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword123',
        fullname: 'John Doe',
        role: 'user',
        isActive: false
      };

      mockAuthService.userLoginService.mockResolvedValue(user);

      // Act
      await loginUserController(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Account is deactivated' });
    });
  });
});
