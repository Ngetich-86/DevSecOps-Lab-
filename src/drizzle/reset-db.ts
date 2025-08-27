import "dotenv/config";
import { pool } from "./db";

async function resetDatabase() {
    console.log("======== Database Reset Started ========");
    
    try {
        // Drop all tables and types
        await pool.query(`
            DROP TABLE IF EXISTS "tasks" CASCADE;
            DROP TABLE IF EXISTS "categories" CASCADE;
            DROP TABLE IF EXISTS "users" CASCADE;
            DROP TYPE IF EXISTS "priority" CASCADE;
            DROP TYPE IF EXISTS "role" CASCADE;
        `);
        
        console.log("✅ All tables and types dropped successfully");
        
        // Drop drizzle migrations table
        await pool.query(`
            DROP TABLE IF EXISTS "drizzle"."__drizzle_migrations" CASCADE;
        `);
        
        console.log("✅ Drizzle migrations table dropped");
        
    } catch (error) {
        console.error("❌ Error resetting database:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
    
    console.log("======== Database Reset Completed ========");
    process.exit(0);
}

resetDatabase().catch((err) => {
    console.error(err);
    process.exit(1);
});