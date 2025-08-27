import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  status: z.string().min(1),
  dueDate: z.string().datetime(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  categoryId: z.number().positive(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  status: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  categoryId: z.number().positive().optional(),
  completed: z.boolean().optional(),
});

export const taskStatusSchema = z.object({
  status: z.string().min(1),
});

export const taskCompletionSchema = z.object({
  completed: z.boolean(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type TaskCompletionInput = z.infer<typeof taskCompletionSchema>;
