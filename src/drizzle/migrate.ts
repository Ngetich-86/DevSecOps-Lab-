import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "path";

// Configure SSL options for Neon.tech
const sslOptions = {
  rejectUnauthorized: false, // For development (use proper CA in production)
  sslmode: 'require'
};

// Create a new pool with SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslOptions
});

const db = drizzle(pool);

async function runMigration() {
    console.log("......Migrations Started......");
    
    try {
        // Verify connection
        const client = await pool.connect();
        console.log("✅ Database connection established");
        client.release();

        // Run migrations
        await migrate(db, {
            migrationsFolder: path.join(__dirname, "migrations")
        });

        console.log("......Migrations Completed......");
    } catch (error) {
        console.error("Migration failed:", error);
        throw error; // Re-throw to be caught by the outer catch
    } finally {
        await pool.end();
    }
}

// Add timeout handler
const timeout = setTimeout(() => {
    console.error("⚠️ Migration timed out after 30 seconds");
    process.exit(1);
}, 30000);

runMigration()
    .then(() => {
        clearTimeout(timeout);
        process.exit(0);
    })
    .catch((error) => {
        clearTimeout(timeout);
        console.error("Migration failed with error:", error);
        process.exit(1);
    });