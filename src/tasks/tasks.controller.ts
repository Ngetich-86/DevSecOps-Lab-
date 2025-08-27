import { Request, Response } from 'express';
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
  taskCompletionSchema
} from "../validators/task.validator";
import { TaskService } from './tasks.service';
import { z } from "zod";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    user_id: number;
    fullname: string;
    email: string;
    role: string;
    exp: number;
  };
}

const taskService = new TaskService();

export class TaskController {
  /** List all tasks for the authenticated user */
  async getAllTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id; // Use user_id from JWT payload
      const tasks = await taskService.getAllTasks(userId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  /** Get a specific task for the authenticated user */
  async getTaskById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const taskId = parseInt(req.params.id);
      
      const task = await taskService.getTaskById(taskId, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  }

  /** Create a new task for the authenticated user */
  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const input = createTaskSchema.parse(req.body);
      
      const taskData = {
        ...input,
        userId,
        dueDate: new Date(input.dueDate),
        completed: false,
        description: input.description || null // Convert undefined to null
      };

      const result = await taskService.createTask(taskData);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.status(201).json({
        message: result.message,
        task: result.task
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues 
        });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  }

  /** Update a task for the authenticated user */
  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const taskId = parseInt(req.params.id);
      const input = updateTaskSchema.parse(req.body);

      const updates: any = { ...input };
      if (input.dueDate) {
        updates.dueDate = new Date(input.dueDate);
      }
      if (input.description !== undefined) {
        updates.description = input.description || null; // Convert undefined to null
      }

      const result = await taskService.updateTask(taskId, userId, updates);
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      res.status(200).json({ message: result.message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues 
        });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  }

  /** Delete a task for the authenticated user */
  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const taskId = parseInt(req.params.id);

      const result = await taskService.deleteTask(taskId, userId);
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      res.status(200).json({ message: result.message });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  }

  /** Get tasks by status for the authenticated user */
  async getTasksByStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const { status } = req.params;

      const tasks = await taskService.getTasksByStatus(userId, status);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks by status" });
    }
  }

  /** Get tasks by priority for the authenticated user */
  async getTasksByPriority(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const { priority } = req.params;

      // Validate priority parameter
      if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority value" });
      }

      const tasks = await taskService.getTasksByPriority(userId, priority as "LOW" | "MEDIUM" | "HIGH");
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks by priority" });
    }
  }

  /** Toggle completion for a task */
  async toggleTaskCompletion(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const taskId = parseInt(req.params.id);
      const { completed } = taskCompletionSchema.parse(req.body);

      const result = await taskService.toggleTaskCompletion(taskId, userId, completed);
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      res.status(200).json({
        message: result.message,
        completed: result.completed
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues 
        });
      }
      res.status(500).json({ error: "Failed to update task status" });
    }
  }

  /** Get tasks due today for the authenticated user */
  async getTasksDueToday(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const tasks = await taskService.getTasksDueToday(userId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks due today" });
    }
  }

  /** Get overdue tasks for the authenticated user */
  async getOverdueTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const tasks = await taskService.getOverdueTasks(userId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overdue tasks" });
    }
  }
}