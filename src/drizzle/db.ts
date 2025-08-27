import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.error("Please create a .env file with your Neon.tech database URL:");
  console.error("DATABASE_URL=postgres://username:password@host:port/database");
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("✅ DATABASE_URL found, attempting to connect...");

export const client = new Client({
  connectionString,
  connectionTimeoutMillis: 10000, // Increased timeout
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection
client.connect()
  .then(() => {
    console.log("✅ Database connected successfully!");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

const db = drizzle(client, { schema, logger: false });
export default db;