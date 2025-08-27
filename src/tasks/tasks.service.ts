import { and, eq, gt, lt, gte, lte, sql, desc, asc } from "drizzle-orm";
import db from "../drizzle/db";
import { tasks, categories } from "../drizzle/schema";
import type { Task } from "../drizzle/schema";

export class TaskService {
    // Create a new task
    async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
        success: boolean;
        message: string;
        task?: Task;
    }> {
        try {
            // Validate required fields
            if (!taskData.title || !taskData.dueDate || !taskData.userId || !taskData.categoryId) {
                return {
                    success: false,
                    message: "Missing required fields (title, dueDate, userId, categoryId)"
                };
            }

            const [task] = await db.insert(tasks)
                .values({
                    ...taskData,
                    status: taskData.status || 'pending',
                    priority: taskData.priority || 'MEDIUM',
                    completed: taskData.completed || false,
                })
                .returning();

            return {
                success: true,
                message: "Task created successfully",
                task
            };
        } catch (error) {
            console.error("Error creating task:", error);
            return {
                success: false,
                message: "Failed to create task"
            };
        }
    }

    // Get all tasks for a user
    async getAllTasks(userId: number): Promise<Task[]> {
        try {
            return await db.select().from(tasks)
                .where(eq(tasks.userId, userId))
                .orderBy(asc(tasks.dueDate), asc(tasks.priority));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
    }

    // Get task by ID with user ownership check
    async getTaskById(id: number, userId: number): Promise<Task | null> {
        try {
            const result = await db.select().from(tasks)
                .where(and(
                    eq(tasks.id, id),
                    eq(tasks.userId, userId)
                ));
            return result[0] || null;
        } catch (error) {
            console.error(`Error fetching task ${id}:`, error);
            return null;
        }
    }

    // Update a task
    async updateTask(
        id: number,
        userId: number,
        updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
    ): Promise<{ success: boolean; message: string }> {
        try {
            const result = await db.update(tasks)
                .set({
                    ...updates,
                    updatedAt: new Date() // Always update the timestamp
                })
                .where(
                    and(
                        eq(tasks.id, id),
                        eq(tasks.userId, userId)
                    )
                )
                .returning();

            if (result.length === 0) {
                return { success: false, message: "Task not found or not owned by user" };
            }

            return { success: true, message: "Task updated successfully" };
        } catch (error) {
            console.error(`Error updating task ${id}:`, error);
            return { success: false, message: "Failed to update task" };
        }
    }

    // Delete a task
    async deleteTask(id: number, userId: number): Promise<{ success: boolean; message: string }> {
        try {
            const result = await db.delete(tasks)
                .where(
                    and(
                        eq(tasks.id, id),
                        eq(tasks.userId, userId)
                    )
                )
                .returning();

            if (result.length === 0) {
                return { success: false, message: "Task not found or not owned by user" };
            }

            return { success: true, message: "Task deleted successfully" };
        } catch (error) {
            console.error(`Error deleting task ${id}:`, error);
            return { success: false, message: "Failed to delete task" };
        }
    }

    // Toggle task completion status
    async toggleTaskCompletion(id: number, userId: number, completed?: boolean): Promise<{
        success: boolean;
        message: string;
        completed?: boolean;
    }> {
        try {
            const task = await this.getTaskById(id, userId);
            if (!task) {
                return { success: false, message: "Task not found" };
            }

            const newCompletedStatus = completed !== undefined ? completed : !task.completed;

            const result = await db.update(tasks)
                .set({ 
                    completed: newCompletedStatus,
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(tasks.id, id),
                        eq(tasks.userId, userId)
                    )
                )
                .returning();

            return {
                success: true,
                message: "Task status updated",
                completed: result[0].completed
            };
        } catch (error) {
            console.error(`Error toggling task ${id}:`, error);
            return { success: false, message: "Failed to update task status" };
        }
    }

    // Get tasks by status
    async getTasksByStatus(userId: number, status: string): Promise<Task[]> {
        try {
            return await db.select().from(tasks)
                .where(and(
                    eq(tasks.userId, userId),
                    eq(tasks.status, status)
                ));
        } catch (error) {
            console.error("Error fetching tasks by status:", error);
            return [];
        }
    }

    // Get tasks by priority
    async getTasksByPriority(userId: number, priority: "LOW" | "MEDIUM" | "HIGH"): Promise<Task[]> {
        try {
            return await db.select().from(tasks)
                .where(and(
                    eq(tasks.userId, userId),
                    eq(tasks.priority, priority)
                ));
        } catch (error) {
            console.error("Error fetching tasks by priority:", error);
            return [];
        }
    }

    // Get tasks due today
    async getTasksDueToday(userId: number): Promise<Task[]> {
        try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            return await db.select().from(tasks)
                .where(and(
                    eq(tasks.userId, userId),
                    gte(tasks.dueDate, startOfDay),
                    lte(tasks.dueDate, endOfDay)
                ))
                .orderBy(asc(tasks.priority), asc(tasks.dueDate));
        } catch (error) {
            console.error("Error fetching tasks due today:", error);
            return [];
        }
    }

    // Get overdue tasks
    async getOverdueTasks(userId: number): Promise<Task[]> {
        try {
            const now = new Date();

            return await db.select().from(tasks)
                .where(and(
                    eq(tasks.userId, userId),
                    lt(tasks.dueDate, now),
                    eq(tasks.completed, false)
                ))
                .orderBy(asc(tasks.dueDate), asc(tasks.priority));
        } catch (error) {
            console.error("Error fetching overdue tasks:", error);
            return [];
        }
    }
}