/*
  Warnings:

  - You are about to drop the column `hostId` on the `Room` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('HUMAN', 'BOT_EASY', 'BOT_MEDIUM', 'BOT_HARD');

-- CreateEnum
CREATE TYPE "BotJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'STALE', 'FAILED');

-- AlterTable Player: add playerType, make sessionId nullable for bots
ALTER TABLE "Player" ADD COLUMN     "playerType" "PlayerType" NOT NULL DEFAULT 'HUMAN',
ALTER COLUMN "sessionId" DROP NOT NULL;

-- AlterTable Room: migrate hostId to hostSessionId, add bot fields
ALTER TABLE "Room" 
  ADD COLUMN "allowBots" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "botSeed" TEXT,
  ADD COLUMN "hostSessionId" TEXT,
  ADD COLUMN "turnNumber" INTEGER NOT NULL DEFAULT 0;

-- Copy existing hostId to hostSessionId before dropping
UPDATE "Room" SET "hostSessionId" = "hostId" WHERE "hostId" IS NOT NULL;

-- Now drop hostId
ALTER TABLE "Room" DROP COLUMN "hostId";

-- CreateTable
CREATE TABLE "BotMoveJob" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "expectedTurn" INTEGER NOT NULL,
    "status" "BotJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "BotMoveJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotDecisionLog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "moveType" TEXT NOT NULL,
    "decision" JSONB NOT NULL,
    "reasoning" JSONB,
    "computeTimeMs" INTEGER NOT NULL,
    "candidatesEvaluated" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotMoveJob_code_status_idx" ON "BotMoveJob"("code", "status");

-- CreateIndex
CREATE INDEX "BotMoveJob_createdAt_idx" ON "BotMoveJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotMoveJob_code_playerId_expectedTurn_key" ON "BotMoveJob"("code", "playerId", "expectedTurn");

-- CreateIndex
CREATE INDEX "BotDecisionLog_code_createdAt_idx" ON "BotDecisionLog"("code", "createdAt");

-- CreateIndex
CREATE INDEX "BotDecisionLog_difficulty_createdAt_idx" ON "BotDecisionLog"("difficulty", "createdAt");

-- CreateIndex
CREATE INDEX "Player_playerType_idx" ON "Player"("playerType");

-- AddForeignKey
ALTER TABLE "BotMoveJob" ADD CONSTRAINT "BotMoveJob_code_fkey" FOREIGN KEY ("code") REFERENCES "Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotDecisionLog" ADD CONSTRAINT "BotDecisionLog_code_fkey" FOREIGN KEY ("code") REFERENCES "Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BotMoveJob" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "expectedTurn" INTEGER NOT NULL,
    "status" "BotJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "BotMoveJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotDecisionLog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "moveType" TEXT NOT NULL,
    "decision" JSONB NOT NULL,
    "reasoning" JSONB,
    "computeTimeMs" INTEGER NOT NULL,
    "candidatesEvaluated" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotMoveJob_code_status_idx" ON "BotMoveJob"("code", "status");

-- CreateIndex
CREATE INDEX "BotMoveJob_createdAt_idx" ON "BotMoveJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotMoveJob_code_playerId_expectedTurn_key" ON "BotMoveJob"("code", "playerId", "expectedTurn");

-- CreateIndex
CREATE INDEX "BotDecisionLog_code_createdAt_idx" ON "BotDecisionLog"("code", "createdAt");

-- CreateIndex
CREATE INDEX "BotDecisionLog_difficulty_createdAt_idx" ON "BotDecisionLog"("difficulty", "createdAt");

-- CreateIndex
CREATE INDEX "Player_playerType_idx" ON "Player"("playerType");

-- AddForeignKey
ALTER TABLE "BotMoveJob" ADD CONSTRAINT "BotMoveJob_code_fkey" FOREIGN KEY ("code") REFERENCES "Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotDecisionLog" ADD CONSTRAINT "BotDecisionLog_code_fkey" FOREIGN KEY ("code") REFERENCES "Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;
