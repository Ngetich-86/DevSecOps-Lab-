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

// Decide whether to use SSL: local Docker Postgres should NOT use SSL
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
  // Fallback: only use SSL if explicitly requested via env
  shouldUseSSL = ["true", "1", "require"].includes(
    String(process.env.DB_SSL || process.env.DATABASE_SSL || "false").toLowerCase()
  );
}

export const client = new Client({
  connectionString,
  connectionTimeoutMillis: 10000,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false as unknown as undefined
});

// Test the connection (non-blocking)
client.connect()
  .then(() => {
    console.log("✅ Database connected successfully!");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    // Don't throw here - let the app start and handle DB errors gracefully
  });

const db = drizzle(client, { schema, logger: false });
export default db;