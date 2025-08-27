import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "path";

const connectionString = process.env.DATABASE_URL || "";

// Decide SSL for migrations similar to runtime
let shouldUseSSL = false;
try {
  const url = new URL(connectionString);
  const host = url.hostname;
  const isLocalHost = ["localhost", "127.0.0.1", "postgres"].includes(host);
  const urlForcesSSL = /sslmode=require/i.test(connectionString);
  const envForcesSSL = ["true", "1", "require"].includes(
    String(process.env.DB_SSL || process.env.DATABASE_SSL || "false").toLowerCase()
  );
  shouldUseSSL = !isLocalHost && (envForcesSSL || urlForcesSSL);
} catch {
  shouldUseSSL = ["true", "1", "require"].includes(
    String(process.env.DB_SSL || process.env.DATABASE_SSL || "false").toLowerCase()
  );
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false as unknown as undefined
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