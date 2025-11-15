-- AlterTable: Rename password column to passwordHash
ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
