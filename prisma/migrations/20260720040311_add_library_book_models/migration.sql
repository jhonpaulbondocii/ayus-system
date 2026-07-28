-- CreateTable
CREATE TABLE "library_books" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "accessionNo" TEXT NOT NULL,
    "callNumber" TEXT,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "copyrightYear" TEXT,
    "edition" TEXT,
    "pages" INTEGER,
    "volume" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_borrow_records" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "borrowerType" TEXT NOT NULL,
    "borrowerId" TEXT,
    "borrowerNo" TEXT,
    "borrowerName" TEXT NOT NULL,
    "borrowerCourse" TEXT,
    "borrowerDept" TEXT,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORROWED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_borrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_books_courseId_idx" ON "library_books"("courseId");

-- CreateIndex
CREATE INDEX "library_books_courseId_category_idx" ON "library_books"("courseId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "library_books_courseId_accessionNo_key" ON "library_books"("courseId", "accessionNo");

-- CreateIndex
CREATE INDEX "library_borrow_records_courseId_idx" ON "library_borrow_records"("courseId");

-- CreateIndex
CREATE INDEX "library_borrow_records_bookId_idx" ON "library_borrow_records"("bookId");

-- CreateIndex
CREATE INDEX "library_borrow_records_courseId_status_idx" ON "library_borrow_records"("courseId", "status");

-- CreateIndex
CREATE INDEX "library_borrow_records_borrowerNo_idx" ON "library_borrow_records"("borrowerNo");

-- AddForeignKey
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_borrow_records" ADD CONSTRAINT "library_borrow_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_borrow_records" ADD CONSTRAINT "library_borrow_records_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "library_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
