/*
  Warnings:

  - A unique constraint covering the columns `[courseId,studentNo]` on the table `guidance_info_sheets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "guidance_info_sheets_courseId_studentNo_key" ON "guidance_info_sheets"("courseId", "studentNo");
