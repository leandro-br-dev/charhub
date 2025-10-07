-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BASIC', 'PREMIUM', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BASIC',
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerAccountId_key" ON "User"("provider", "providerAccountId");