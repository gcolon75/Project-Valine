-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "followersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followingCount" INTEGER NOT NULL DEFAULT 0;

