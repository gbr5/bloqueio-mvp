-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "GoalSide" AS ENUM ('TOP', 'RIGHT', 'BOTTOM', 'LEFT');

-- CreateEnum
CREATE TYPE "BarrierOrientation" AS ENUM ('HORIZONTAL', 'VERTICAL');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "hostId" TEXT,
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "winner" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "wallsLeft" INTEGER NOT NULL DEFAULT 6,
    "goalSide" "GoalSide" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barrier" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "orientation" "BarrierOrientation" NOT NULL,
    "placedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Barrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "fromRow" INTEGER NOT NULL,
    "fromCol" INTEGER NOT NULL,
    "toRow" INTEGER NOT NULL,
    "toCol" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_code_idx" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Player_sessionId_idx" ON "Player"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_sessionId_key" ON "Player"("roomId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_playerId_key" ON "Player"("roomId", "playerId");

-- CreateIndex
CREATE INDEX "Barrier_roomId_idx" ON "Barrier"("roomId");

-- CreateIndex
CREATE INDEX "Move_roomId_idx" ON "Move"("roomId");

-- CreateIndex
CREATE INDEX "Move_createdAt_idx" ON "Move"("createdAt");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barrier" ADD CONSTRAINT "Barrier_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
