import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
export const db = neon(process.env.DATABASE_URL);