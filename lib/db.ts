import { neon } from "@neondatabase/serverless";

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Connect a Neon Postgres database in Vercel and redeploy.");
  }
  return neon(connectionString);
}
