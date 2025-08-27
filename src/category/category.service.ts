import { eq, and } from "drizzle-orm";
import db from "../drizzle/db";
import { categories } from "../drizzle/schema";
import type { TICategory, TSCategory } from "../drizzle/schema";

export class CategoryService {
  /** Create a new category for the authenticated user */
  async createCategory(category: TICategory) {
    try {
      console.log("Creating category:", { name: category.name, userId: category.userId });
      const result = await db.insert(categories).values(category).returning();
      console.log("Category created successfully:", result);
      return {
        success: true,
        message: "Category created successfully",
        category: result[0]
      };
    } catch (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        message: "Failed to create category"
      };
    }
  }

  /** Get all categories for the authenticated user */
  async getAllCategories(userId: number) {
    try {
      console.log("Getting categories for user:", userId);
      const result = await db.query.categories.findMany({
        where: eq(categories.userId, userId),
        orderBy: (categories, { asc }) => [asc(categories.createdAt)]
      });
      console.log("Categories retrieved:", result.length);
      return result;
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  }

  /** Get a specific category by ID for the authenticated user */
  async getCategoryById(categoryId: number, userId: number) {
    try {
      console.log("Getting category by ID:", { categoryId, userId });
      const result = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        )
      });
      console.log("Category lookup result:", result ? "Category found" : "Category not found");
      return result;
    } catch (error) {
      console.error("Error getting category by ID:", error);
      throw error;
    }
  }

  /** Update a category for the authenticated user */
  async updateCategory(categoryId: number, userId: number, updates: Partial<TICategory>) {
    try {
      console.log("Updating category:", { categoryId, userId, updates });
      
      // Check if category exists and belongs to user
      const existingCategory = await this.getCategoryById(categoryId, userId);
      if (!existingCategory) {
        return {
          success: false,
          message: "Category not found"
        };
      }

      const result = await db.update(categories)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        ))
        .returning();

      console.log("Category updated successfully:", result);
      return {
        success: true,
        message: "Category updated successfully",
        category: result[0]
      };
    } catch (error) {
      console.error("Error updating category:", error);
      return {
        success: false,
        message: "Failed to update category"
      };
    }
  }

  /** Delete a category for the authenticated user */
  async deleteCategory(categoryId: number, userId: number) {
    try {
      console.log("Deleting category:", { categoryId, userId });
      
      // Check if category exists and belongs to user
      const existingCategory = await this.getCategoryById(categoryId, userId);
      if (!existingCategory) {
        return {
          success: false,
          message: "Category not found"
        };
      }

      await db.delete(categories)
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        ));

      console.log("Category deleted successfully");
      return {
        success: true,
        message: "Category deleted successfully"
      };
    } catch (error) {
      console.error("Error deleting category:", error);
      return {
        success: false,
        message: "Failed to delete category"
      };
    }
  }

  /** Get category by name for the authenticated user */
  async getCategoryByName(name: string, userId: number) {
    try {
      console.log("Getting category by name:", { name, userId });
      const result = await db.query.categories.findFirst({
        where: and(
          eq(categories.name, name),
          eq(categories.userId, userId)
        )
      });
      console.log("Category by name lookup result:", result ? "Category found" : "Category not found");
      return result;
    } catch (error) {
      console.error("Error getting category by name:", error);
      throw error;
    }
  }
}
