-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('TWO_PLAYER', 'FOUR_PLAYER');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "gameMode" "GameMode" NOT NULL DEFAULT 'FOUR_PLAYER';

-- CreateIndex
CREATE INDEX "Room_gameMode_idx" ON "Room"("gameMode");
