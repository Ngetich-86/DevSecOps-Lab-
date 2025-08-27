import { pgTable, serial, text, boolean, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";


// ✅ Enum
export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH"]);
export const roleEnum = pgEnum("role", ["user", "admin", "superadmin","disabled"]);

// User table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullname: text("fullname").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ✅ Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  color: text("color").notNull().default("#FFFFFF"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  })
});


// ✅ Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  dueDate: timestamp("due_date").notNull(),
  priority: priorityEnum("priority").notNull(),
  completed: boolean("completed").notNull().default(false),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// infer types
export type TIUser = typeof users.$inferInsert
export type TSUser = typeof users.$inferSelect
export type TICategory = typeof categories.$inferInsert
export type TSCategory = typeof categories.$inferSelect
export type TITask = typeof tasks.$inferInsert
export type TSTask = typeof tasks.$inferSelect

// Type aliases for better readability
export type User = TSUser
export type Category = TSCategory
export type Task = TSTask