import request from 'supertest';
import app from '../../src/server';
import db from '../../src/drizzle/db';
import { users, categories, tasks } from '../../src/drizzle/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

describe('Tasks Integration Tests', () => {
  let authToken: string;
  let userId: number;
  let categoryId: number;

  beforeEach(async () => {
    // Clean up database
    await db.delete(tasks);
    await db.delete(categories);
    await db.delete(users);

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [user] = await db.insert(users).values({
      fullname: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
    }).returning();

    userId = user.id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'john@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.token;

    // Create test category
    const [category] = await db.insert(categories).values({
      name: 'Work',
      description: 'Work-related tasks',
      color: '#FF5733',
      userId: userId,
    }).returning();

    categoryId = category.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await db.delete(tasks);
    await db.delete(categories);
    await db.delete(users);
  });

  describe('POST /tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the API',
        status: 'todo',
        dueDate: '2024-12-31T23:59:59.000Z',
        priority: 'HIGH',
        categoryId: categoryId,
      };

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.task).toMatchObject({
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the API',
        status: 'todo',
        priority: 'HIGH',
        categoryId: categoryId,
        userId: userId,
        completed: false,
      });
      expect(response.body.task).toHaveProperty('id');
      expect(response.body.task).toHaveProperty('createdAt');

      // Verify task was created in database
      const dbTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      expect(dbTasks).toHaveLength(1);
      expect(dbTasks[0].title).toBe('Complete project documentation');
    });

    it('should return 400 for invalid task data', async () => {
      const invalidTaskData = {
        title: '', // Invalid: empty title
        status: 'invalid-status',
        priority: 'INVALID',
      };

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTaskData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 401 without authentication', async () => {
      const taskData = {
        title: 'Test Task',
        status: 'todo',
        priority: 'MEDIUM',
      };

      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for non-existent category', async () => {
      const taskData = {
        title: 'Test Task',
        status: 'todo',
        priority: 'MEDIUM',
        categoryId: 999, // Non-existent category
      };

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await db.insert(tasks).values([
        {
          title: 'Task 1',
          description: 'First task',
          status: 'todo',
          priority: 'HIGH',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'Task 2',
          description: 'Second task',
          status: 'in-progress',
          priority: 'MEDIUM',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'Task 3',
          description: 'Third task',
          status: 'completed',
          priority: 'LOW',
          userId: userId,
          categoryId: categoryId,
          completed: true,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
      ]);
    });

    it('should return all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify task structure
      response.body.forEach((task: unknown) => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('userId', userId);
        expect(task).toHaveProperty('categoryId', categoryId);
      });
    });

    it('should not return tasks from other users', async () => {
      // Create another user and their task
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [otherUser] = await db.insert(users).values({
        fullname: 'Jane Doe',
        email: 'jane@example.com',
        password: hashedPassword,
        role: 'user',
        isActive: true,
      }).returning();

      await db.insert(tasks).values({
        title: 'Other User Task',
        status: 'todo',
        priority: 'HIGH',
        userId: otherUser.id,
        categoryId: categoryId,
        completed: false,
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      response.body.forEach((task: unknown) => {
        expect((task as any).userId).toBe(userId);
      });
    });
  });

  describe('GET /tasks/:id', () => {
    let taskId: number;

    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        priority: 'HIGH',
        userId: userId,
        categoryId: categoryId,
        completed: false,
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
      }).returning();

      taskId = task.id;
    });

    it('should return specific task', async () => {
      const response = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: taskId,
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        priority: 'HIGH',
        userId: userId,
        categoryId: categoryId,
        completed: false,
      });
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/tasks/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Task not found');
    });

    it('should return 404 for task belonging to another user', async () => {
      // Create another user and their task
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [otherUser] = await db.insert(users).values({
        fullname: 'Jane Doe',
        email: 'jane@example.com',
        password: hashedPassword,
        role: 'user',
        isActive: true,
      }).returning();

      const [otherTask] = await db.insert(tasks).values({
        title: 'Other User Task',
        status: 'todo',
        priority: 'HIGH',
        userId: otherUser.id,
        categoryId: categoryId,
        completed: false,
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
      }).returning();

      const response = await request(app)
        .get(`/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('PUT /tasks/:id', () => {
    let taskId: number;

    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        priority: 'HIGH',
        userId: userId,
        categoryId: categoryId,
        completed: false,
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
      }).returning();

      taskId = task.id;
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        status: 'in-progress',
        priority: 'MEDIUM',
      };

      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify task was updated in database
      const [updatedTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
      expect(updatedTask.title).toBe('Updated Task');
      expect(updatedTask.status).toBe('in-progress');
      expect(updatedTask.priority).toBe('MEDIUM');
    });

    it('should return 404 for non-existent task', async () => {
      const updateData = {
        title: 'Updated Task',
      };

      const response = await request(app)
        .put('/tasks/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskId: number;

    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        title: 'Test Task',
        status: 'todo',
        priority: 'HIGH',
        userId: userId,
        categoryId: categoryId,
        completed: false,
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
      }).returning();

      taskId = task.id;
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify task was deleted from database
      const dbTasks = await db.select().from(tasks).where(eq(tasks.id, taskId));
      expect(dbTasks).toHaveLength(0);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/tasks/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('GET /tasks/status/:status', () => {
    beforeEach(async () => {
      await db.insert(tasks).values([
        {
          title: 'Todo Task 1',
          status: 'todo',
          priority: 'HIGH',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'Todo Task 2',
          status: 'todo',
          priority: 'MEDIUM',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'In Progress Task',
          status: 'in-progress',
          priority: 'LOW',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
      ]);
    });

    it('should return tasks by status', async () => {
      const response = await request(app)
        .get('/tasks/status/todo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      response.body.forEach((task: unknown) => {
        expect((task as any).status).toBe('todo');
        expect((task as any).userId).toBe(userId);
      });
    });

    it('should return empty array for status with no tasks', async () => {
      const response = await request(app)
        .get('/tasks/status/completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /tasks/priority/:priority', () => {
    beforeEach(async () => {
      await db.insert(tasks).values([
        {
          title: 'High Priority Task 1',
          status: 'todo',
          priority: 'HIGH',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'High Priority Task 2',
          status: 'in-progress',
          priority: 'HIGH',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
        {
          title: 'Medium Priority Task',
          status: 'todo',
          priority: 'MEDIUM',
          userId: userId,
          categoryId: categoryId,
          completed: false,
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
        },
      ]);
    });

    it('should return tasks by priority', async () => {
      const response = await request(app)
        .get('/tasks/priority/HIGH')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      response.body.forEach((task: unknown) => {
        expect((task as any).priority).toBe('HIGH');
        expect((task as any).userId).toBe(userId);
      });
    });

    it('should return 400 for invalid priority', async () => {
      const response = await request(app)
        .get('/tasks/priority/INVALID')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid priority value');
    });
  });
});
