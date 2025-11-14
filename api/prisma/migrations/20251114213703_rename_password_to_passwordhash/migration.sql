-- Rename password column to passwordHash for clarity
-- This migration aligns the database schema with the application code

ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
