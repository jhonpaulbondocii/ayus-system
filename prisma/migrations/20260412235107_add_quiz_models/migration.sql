-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('GRADED_QUIZ', 'PRACTICE_QUIZ', 'GRADED_SURVEY', 'UNGRADED_SURVEY');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'FILE_UPLOAD', 'MATCHING');

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quizType" "QuizType" NOT NULL DEFAULT 'GRADED_QUIZ',
    "assignmentGroup" TEXT NOT NULL DEFAULT 'Assignments',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "timeLimit" INTEGER,
    "allowMultipleAttempts" BOOLEAN NOT NULL DEFAULT false,
    "attemptLimit" INTEGER,
    "scoreToKeep" TEXT NOT NULL DEFAULT 'highest',
    "viewResponses" BOOLEAN NOT NULL DEFAULT true,
    "onlyOnceAfterAttempt" BOOLEAN NOT NULL DEFAULT false,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswersAt" TIMESTAMP(3),
    "hideCorrectAnswersAt" TIMESTAMP(3),
    "showOneAtATime" BOOLEAN NOT NULL DEFAULT false,
    "lockQuestionsAfterAnswering" BOOLEAN NOT NULL DEFAULT false,
    "accessCode" TEXT,
    "ipFilter" TEXT,
    "assignTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueDate" TIMESTAMP(3),
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "question" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "correctAnswer" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_match_pairs" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "left" TEXT NOT NULL,
    "right" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_match_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_match_pairs" ADD CONSTRAINT "quiz_match_pairs_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
