import { Request, Response } from 'express';
import { TaskController } from '../../src/tasks/tasks.controller';
import { TaskService } from '../../src/tasks/tasks.service';
import { z } from 'zod';

// Mock the TaskService
jest.mock('../../src/tasks/tasks.service');
const MockedTaskService = TaskService as jest.MockedClass<typeof TaskService>;

describe('Task Controller - Unit Tests', () => {
  let taskController: TaskController;
  let mockTaskService: jest.Mocked<TaskService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockTaskService = new MockedTaskService() as jest.Mocked<TaskService>;
    taskController = new TaskController();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock the user object that would be added by authentication middleware
    mockReq = {
      user: {
        sub: '1',
        user_id: 1,
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        exp: Date.now() / 1000 + 3600
      }
    };

    jest.clearAllMocks();
  });

  describe('getAllTasks', () => {
    it('should return all tasks for authenticated user', async () => {
      // Arrange
      const mockTasks = [
        { id: 1, title: 'Task 1', userId: 1 },
        { id: 2, title: 'Task 2', userId: 1 }
      ];
      mockTaskService.getAllTasks.mockResolvedValue(mockTasks);

      // Act
      await taskController.getAllTasks(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.getAllTasks).toHaveBeenCalledWith(1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockTasks);
    });

    it('should handle service errors', async () => {
      // Arrange
      mockTaskService.getAllTasks.mockRejectedValue(new Error('Database error'));

      // Act
      await taskController.getAllTasks(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch tasks' });
    });
  });

  describe('getTaskById', () => {
    it('should return task if found', async () => {
      // Arrange
      const mockTask = { id: 1, title: 'Task 1', userId: 1 };
      mockReq.params = { id: '1' };
      mockTaskService.getTaskById.mockResolvedValue(mockTask);

      // Act
      await taskController.getTaskById(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.getTaskById).toHaveBeenCalledWith(1, 1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockTask);
    });

    it('should return 404 if task not found', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      mockTaskService.getTaskById.mockResolvedValue(null);

      // Act
      await taskController.getTaskById(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      // Arrange
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        dueDate: '2024-12-31T23:59:59.000Z',
        priority: 'HIGH',
        categoryId: 1
      };
      mockReq.body = taskData;
      
      const createdTask = { id: 1, ...taskData, userId: 1 };
      mockTaskService.createTask.mockResolvedValue({
        success: true,
        message: 'Task created successfully',
        task: createdTask
      });

      // Act
      await taskController.createTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.createTask).toHaveBeenCalledWith({
        ...taskData,
        userId: 1,
        dueDate: new Date(taskData.dueDate),
        completed: false,
        description: taskData.description
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Task created successfully',
        task: createdTask
      });
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidTaskData = {
        title: '', // Invalid: empty title
        status: 'invalid-status'
      };
      mockReq.body = invalidTaskData;

      // Act
      await taskController.createTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const taskData = {
        title: 'New Task',
        status: 'todo',
        dueDate: '2024-12-31T23:59:59.000Z',
        priority: 'HIGH'
      };
      mockReq.body = taskData;
      
      mockTaskService.createTask.mockResolvedValue({
        success: false,
        message: 'Category not found'
      });

      // Act
      await taskController.createTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Category not found' });
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Task',
        status: 'in-progress'
      };
      mockReq.params = { id: '1' };
      mockReq.body = updateData;
      
      mockTaskService.updateTask.mockResolvedValue({
        success: true,
        message: 'Task updated successfully'
      });

      // Act
      await taskController.updateTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.updateTask).toHaveBeenCalledWith(1, 1, updateData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Task updated successfully' });
    });

    it('should return 404 if task not found', async () => {
      // Arrange
      const updateData = { title: 'Updated Task' };
      mockReq.params = { id: '999' };
      mockReq.body = updateData;
      
      mockTaskService.updateTask.mockResolvedValue({
        success: false,
        message: 'Task not found'
      });

      // Act
      await taskController.updateTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockTaskService.deleteTask.mockResolvedValue({
        success: true,
        message: 'Task deleted successfully'
      });

      // Act
      await taskController.deleteTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith(1, 1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Task deleted successfully' });
    });

    it('should return 404 if task not found', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      mockTaskService.deleteTask.mockResolvedValue({
        success: false,
        message: 'Task not found'
      });

      // Act
      await taskController.deleteTask(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks by status', async () => {
      // Arrange
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'todo', userId: 1 }
      ];
      mockReq.params = { status: 'todo' };
      mockTaskService.getTasksByStatus.mockResolvedValue(mockTasks);

      // Act
      await taskController.getTasksByStatus(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.getTasksByStatus).toHaveBeenCalledWith(1, 'todo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockTasks);
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks by priority', async () => {
      // Arrange
      const mockTasks = [
        { id: 1, title: 'Task 1', priority: 'HIGH', userId: 1 }
      ];
      mockReq.params = { priority: 'HIGH' };
      mockTaskService.getTasksByPriority.mockResolvedValue(mockTasks);

      // Act
      await taskController.getTasksByPriority(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.getTasksByPriority).toHaveBeenCalledWith(1, 'HIGH');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 400 for invalid priority', async () => {
      // Arrange
      mockReq.params = { priority: 'INVALID' };

      // Act
      await taskController.getTasksByPriority(mockReq as any, mockRes as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid priority value' });
    });
  });

  describe('toggleTaskCompletion', () => {
    it('should toggle task completion successfully', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { completed: true };
      
      mockTaskService.toggleTaskCompletion.mockResolvedValue({
        success: true,
        message: 'Task completion updated',
        completed: true
      });

      // Act
      await taskController.toggleTaskCompletion(mockReq as any, mockRes as Response);

      // Assert
      expect(mockTaskService.toggleTaskCompletion).toHaveBeenCalledWith(1, 1, true);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Task completion updated',
        completed: true
      });
    });
  });
});
