-- CreateTable
CREATE TABLE "library_card_requests" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "employeeType" TEXT,
    "name" TEXT NOT NULL,
    "sex" TEXT,
    "address" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "reason" TEXT,
    "studentNo" TEXT,
    "courseProgram" TEXT,
    "yearSection" TEXT,
    "employeeNo" TEXT,
    "collegeDept" TEXT,
    "position" TEXT,
    "photoUrl" TEXT,
    "affidavitUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dateFiled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_card_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_receiving_logs" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requestId" TEXT,
    "name" TEXT NOT NULL,
    "sex" TEXT,
    "courseYearSection" TEXT,
    "collegeDept" TEXT,
    "position" TEXT,
    "dateReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentReceived" TEXT NOT NULL DEFAULT 'Library Card',
    "signatureUrl" TEXT,
    "signatureMethod" TEXT,
    "signedAt" TIMESTAMP(3),
    "signToken" TEXT,
    "signTokenExpiresAt" TIMESTAMP(3),
    "signEmailSentAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_receiving_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_card_requests_courseId_idx" ON "library_card_requests"("courseId");

-- CreateIndex
CREATE INDEX "library_card_requests_courseId_status_idx" ON "library_card_requests"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "library_receiving_logs_requestId_key" ON "library_receiving_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "library_receiving_logs_signToken_key" ON "library_receiving_logs"("signToken");

-- CreateIndex
CREATE INDEX "library_receiving_logs_courseId_idx" ON "library_receiving_logs"("courseId");

-- CreateIndex
CREATE INDEX "library_receiving_logs_signToken_idx" ON "library_receiving_logs"("signToken");

-- AddForeignKey
ALTER TABLE "library_card_requests" ADD CONSTRAINT "library_card_requests_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_receiving_logs" ADD CONSTRAINT "library_receiving_logs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_receiving_logs" ADD CONSTRAINT "library_receiving_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "library_card_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
