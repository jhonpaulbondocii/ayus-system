-- AlterTable
ALTER TABLE "group_sets" ADD COLUMN     "autoAssignLeader" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createGroupsNow" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaderType" TEXT NOT NULL DEFAULT 'first',
ADD COLUMN     "limitGroupMembers" INTEGER NOT NULL DEFAULT 0;
