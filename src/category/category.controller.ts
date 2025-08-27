import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { z } from "zod";

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default("#FFFFFF"),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

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

const categoryService = new CategoryService();

export class CategoryController {
  /** Create a new category for the authenticated user */
  async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      console.log("Category creation request received:", { body: req.body });
      
      const userId = req.user.user_id;
      const input = createCategorySchema.parse(req.body);
      
      // Check if category with same name already exists for this user
      const existingCategory = await categoryService.getCategoryByName(input.name, userId);
      if (existingCategory) {
        return res.status(400).json({ 
          error: "Category with this name already exists" 
        });
      }

      const categoryData = {
        ...input,
        userId,
      };

      console.log("Creating category in database...");
      const result = await categoryService.createCategory(categoryData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      console.log("Category created successfully:", result.category);
      res.status(201).json({
        message: result.message,
        category: result.category
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues 
        });
      }
      console.error("Category creation error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  }

  /** Get all categories for the authenticated user */
  async getAllCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      console.log("Getting all categories for user:", userId);
      
      const categories = await categoryService.getAllCategories(userId);
      res.status(200).json(categories);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  /** Get a specific category by ID for the authenticated user */
  async getCategoryById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const categoryId = parseInt(req.params.id);
      
      console.log("Getting category by ID:", { categoryId, userId });
      
      const category = await categoryService.getCategoryById(categoryId, userId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.status(200).json(category);
    } catch (error) {
      console.error("Error getting category by ID:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  }

  /** Update a category for the authenticated user */
  async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const categoryId = parseInt(req.params.id);
      const input = updateCategorySchema.parse(req.body);

      console.log("Updating category:", { categoryId, userId, updates: input });

      // If name is being updated, check if it conflicts with existing category
      if (input.name) {
        const existingCategory = await categoryService.getCategoryByName(input.name, userId);
        if (existingCategory && existingCategory.id !== categoryId) {
          return res.status(400).json({ 
            error: "Category with this name already exists" 
          });
        }
      }

      const result = await categoryService.updateCategory(categoryId, userId, input);
      
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      res.status(200).json({
        message: result.message,
        category: result.category
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues 
        });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  }

  /** Delete a category for the authenticated user */
  async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.user_id;
      const categoryId = parseInt(req.params.id);

      console.log("Deleting category:", { categoryId, userId });

      const result = await categoryService.deleteCategory(categoryId, userId);
      
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      res.status(200).json({ message: result.message });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  }
}
