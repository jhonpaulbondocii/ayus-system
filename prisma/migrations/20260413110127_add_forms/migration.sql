-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('SURVEY_FEEDBACK', 'EVALUATION', 'REGISTRATION_FORM', 'GRADED_ASSESSMENT');

-- CreateEnum
CREATE TYPE "FormQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN', 'SHORT_ANSWER', 'PARAGRAPH', 'LINEAR_SCALE', 'MC_GRID', 'CHECKBOX_GRID', 'DATE', 'TIME', 'FILE_UPLOAD', 'SECTION');

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "formType" "FormType" NOT NULL DEFAULT 'SURVEY_FEEDBACK',
    "assignmentGroup" TEXT NOT NULL DEFAULT 'Assignments',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "allowMultipleResponses" BOOLEAN NOT NULL DEFAULT false,
    "responseLimit" INTEGER,
    "anonymousResponses" BOOLEAN NOT NULL DEFAULT false,
    "showResultsToRespondents" BOOLEAN NOT NULL DEFAULT false,
    "showOneAtATime" BOOLEAN NOT NULL DEFAULT false,
    "lockQuestionsAfterAnswering" BOOLEAN NOT NULL DEFAULT false,
    "accessCode" TEXT,
    "confirmationMessage" TEXT,
    "assignTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueDate" TIMESTAMP(3),
    "dueTime" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableFromTime" TEXT,
    "availableUntil" TIMESTAMP(3),
    "availableUntilTime" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "type" "FormQuestionType" NOT NULL DEFAULT 'SHORT_ANSWER',
    "question" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctAnswer" TEXT,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    "rows" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "columns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sectionTitle" TEXT,
    "sectionDescription" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forms_courseId_idx" ON "forms"("courseId");

-- CreateIndex
CREATE INDEX "form_questions_formId_idx" ON "form_questions"("formId");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
