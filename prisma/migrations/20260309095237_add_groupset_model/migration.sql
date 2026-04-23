-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "groupSetId" TEXT;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "groupSetId" TEXT;

-- CreateTable
CREATE TABLE "group_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "selfSignUp" BOOLEAN NOT NULL DEFAULT false,
    "requireSameSection" BOOLEAN NOT NULL DEFAULT false,
    "groupStructure" TEXT NOT NULL DEFAULT 'Create groups later',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_sets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "group_sets" ADD CONSTRAINT "group_sets_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_groupSetId_fkey" FOREIGN KEY ("groupSetId") REFERENCES "group_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
