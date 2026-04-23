generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  ADMIN
  STAFF
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  DEACTIVATED
}

enum CourseStatus {
  PUBLISHED
  UNPUBLISHED
}

enum AssignmentStatus {
  PENDING
  SUBMITTED
  GRADED
  OVERDUE
}

enum MessageScope {
  DIRECT
  COURSE
}

enum QuizType {
  GRADED_QUIZ
  PRACTICE_QUIZ
  GRADED_SURVEY
  UNGRADED_SURVEY
}

enum QuizQuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_BLANK
  ESSAY
  FILE_UPLOAD
  MATCHING
}

enum FormType {
  SURVEY_FEEDBACK
  EVALUATION
  REGISTRATION_FORM
  GRADED_ASSESSMENT
}

enum FormQuestionType {
  MULTIPLE_CHOICE
  CHECKBOXES
  DROPDOWN
  SHORT_ANSWER
  PARAGRAPH
  LINEAR_SCALE
  MC_GRID
  CHECKBOX_GRID
  DATE
  TIME
  FILE_UPLOAD
  SECTION
}

model Conversation {
  id        String       @id @default(cuid())
  subject   String
  scope     MessageScope @default(DIRECT)
  courseId  String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  course       Course?                   @relation(fields: [courseId], references: [id], onDelete: SetNull)
  participants ConversationParticipant[]
  messages     Message[]

  @@map("conversations")
}

model ConversationParticipant {
  id             String    @id @default(cuid())
  conversationId String
  userId         String
  isAuthor       Boolean   @default(false)
  deletedAt      DateTime?
  lastReadAt     DateTime?
  createdAt      DateTime  @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@map("conversation_participants")
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  body           String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  conversation Conversation        @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User                @relation(fields: [senderId], references: [id], onDelete: Cascade)
  attachments  MessageAttachment[]

  @@map("messages")
}

model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  name      String
  url       String
  size      Int?
  mimeType  String?
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@map("message_attachments")
}

model User {
  id               String         @id @default(cuid())
  name             String
  email            String         @unique
  emailVerified    DateTime?
  password         String?
  image            String?
  role             Role           @default(STAFF)
  status           ApprovalStatus @default(PENDING)
  department       String?
  position         String?
  pronouns         String?
  bio              String?
  contactNumber    String?
  employmentStatus String?
  accountType      String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  accounts                 Account[]
  sessions                 Session[]
  enrollments              CourseEnrollment[]
  groupMembers             GroupMember[]
  submissions              Submission[]
  resetTokens              PasswordResetToken[]
  repositoryFiles          RepositoryFile[]
  activityLogs             ActivityLog[]
  conversationParticipants ConversationParticipant[]
  sentMessages             Message[]
  quizAttempts             QuizAttempt[]

  @@map("users")
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String
  via       String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_reset_tokens")
}

model Course {
  id          String       @id @default(cuid())
  name        String
  code        String
  color       String       @default("#cc2a27")
  image       String?
  status      CourseStatus @default(UNPUBLISHED)
  description String?
  term        String?
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  enrollments   CourseEnrollment[]
  groups        Group[]
  groupSets     GroupSet[]
  assignments   Assignment[]
  announcements Announcement[]
  conversations Conversation[]
  quizzes       Quiz[]
  forms         Form[]

  @@map("courses")
}

model CourseEnrollment {
  id         String   @id @default(cuid())
  userId     String
  courseId   String
  courseRole String   @default("Student")
  createdAt  DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
  @@map("course_enrollments")
}

model GroupSet {
  id                 String   @id @default(cuid())
  name               String
  courseId           String
  selfSignUp         Boolean  @default(false)
  requireSameSection Boolean  @default(false)
  groupStructure     String   @default("Create groups later")
  createGroupsNow    Int      @default(0)
  limitGroupMembers  Int      @default(0)
  autoAssignLeader   Boolean  @default(false)
  leaderType         String   @default("first")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  course Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  groups Group[]

  @@map("group_sets")
}

model Group {
  id         String   @id @default(cuid())
  name       String
  courseId   String
  groupSetId String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  course      Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  groupSet    GroupSet?     @relation(fields: [groupSetId], references: [id], onDelete: SetNull)
  members     GroupMember[]
  assignments Assignment[]

  @@map("groups")
}

model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  isLeader  Boolean  @default(false)
  order     Int      @default(0)
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, groupId])
  @@map("group_members")
}

model Assignment {
  id                  String       @id @default(cuid())
  title               String
  description         String?
  points              Float        @default(0)
  dueDate             DateTime?
  availableFrom       DateTime?
  availableUntil      DateTime?
  courseId            String?
  groupId             String?
  status              CourseStatus @default(UNPUBLISHED)
  submissionType      String       @default("Online")
  assignmentGroup     String       @default("Assignments")
  displayGradeAs      String       @default("Points")
  onlineEntryOptions  String[]     @default([])
  submissionAttempts  String       @default("Unlimited")
  allowedAttempts     Int?
  doNotCount          Boolean      @default(false)
  isGroupAssignment   Boolean      @default(false)
  groupSetId          String?
  requirePeerReviews  Boolean      @default(false)
  anonymousGrading    Boolean      @default(false)
  peerReviewAssign    String       @default("manually")
  peerReviewAnonymous Boolean      @default(false)
  notifyUsers         Boolean      @default(false)
  assignees           String[]     @default([])
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  course      Course?      @relation(fields: [courseId], references: [id], onDelete: Cascade)
  group       Group?       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  submissions Submission[]
  repository  Repository?

  @@map("assignments")
}

model Submission {
  id           String           @id @default(cuid())
  userId       String
  assignmentId String
  status       AssignmentStatus @default(PENDING)
  fileUrl      String?
  grade        Float?
  feedback     String?
  submittedAt  DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignment     Assignment      @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  repositoryFile RepositoryFile?

  @@unique([userId, assignmentId])
  @@map("submissions")
}

model Repository {
  id           String   @id @default(cuid())
  name         String
  assignmentId String   @unique
  courseId     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  assignment Assignment       @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  files      RepositoryFile[]
  logs       ActivityLog[]

  @@map("repositories")
}

model RepositoryFile {
  id           String   @id @default(cuid())
  repositoryId String
  submissionId String?  @unique
  userId       String
  fileName     String
  fileUrl      String
  fileSize     Int?
  mimeType     String?
  uploadedAt   DateTime @default(now())

  repository Repository  @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  submission Submission? @relation(fields: [submissionId], references: [id], onDelete: SetNull)
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("repository_files")
}

model ActivityLog {
  id           String   @id @default(cuid())
  repositoryId String?
  userId       String
  action       String
  targetType   String?
  targetId     String?
  targetName   String?
  metadata     Json?
  createdAt    DateTime @default(now())

  repository Repository? @relation(fields: [repositoryId], references: [id], onDelete: SetNull)
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("activity_logs")
}

model Announcement {
  id             String    @id @default(cuid())
  courseId       String
  title          String
  bodyText       String    @default("")
  bodyHtml       String    @default("")
  author         String    @default("Admin")
  assignTo       String[]  @default([])
  allowComment   Boolean   @default(false)
  allowLiking    Boolean   @default(false)
  availableFrom  DateTime?
  availableUntil DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  course      Course                   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  attachments AnnouncementAttachment[]

  @@map("announcements")
}

model AnnouncementAttachment {
  id             String   @id @default(cuid())
  announcementId String
  name           String
  url            String
  size           Int
  mimeType       String   @default("")
  createdAt      DateTime @default(now())

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@map("announcement_attachments")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model Quiz {
  id                          String    @id @default(cuid())
  courseId                    String
  title                       String
  description                 String?   @db.Text
  quizType                    QuizType  @default(GRADED_QUIZ)
  assignmentGroup             String    @default("Assignments")
  points                      Float     @default(0)
  shuffleAnswers              Boolean   @default(false)
  timeLimit                   Int?
  allowMultipleAttempts       Boolean   @default(false)
  attemptLimit                Int?
  scoreToKeep                 String    @default("highest")
  viewResponses               Boolean   @default(true)
  onlyOnceAfterAttempt        Boolean   @default(false)
  showCorrectAnswers          Boolean   @default(true)
  showCorrectAnswersAt        DateTime?
  hideCorrectAnswersAt        DateTime?
  showOneAtATime              Boolean   @default(false)
  lockQuestionsAfterAnswering Boolean   @default(false)
  accessCode                  String?
  ipFilter                    String?
  assignTo                    String[]  @default([])
  dueDate                     DateTime?
  availableFrom               DateTime?
  availableUntil              DateTime?
  published                   Boolean   @default(false)
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt

  course    Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
  attempts  QuizAttempt[]

  @@map("quizzes")
}

model QuizQuestion {
  id            String           @id @default(cuid())
  quizId        String
  type          QuizQuestionType @default(MULTIPLE_CHOICE)
  question      String           @db.Text
  points        Float            @default(1)
  correctAnswer String?
  order         Int              @default(0)
  createdAt     DateTime         @default(now())

  quiz       Quiz            @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers    QuizAnswer[]
  matchPairs QuizMatchPair[]

  @@map("quiz_questions")
}

model QuizAnswer {
  id         String   @id @default(cuid())
  questionId String
  text       String
  correct    Boolean  @default(false)
  order      Int      @default(0)
  createdAt  DateTime @default(now())

  question QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("quiz_answers")
}

model QuizMatchPair {
  id         String   @id @default(cuid())
  questionId String
  left       String
  right      String
  order      Int      @default(0)
  createdAt  DateTime @default(now())

  question QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("quiz_match_pairs")
}

model QuizAttempt {
  id              String   @id @default(cuid())
  quizId          String
  userId          String
  score           Float    @default(0)
  durationSeconds Int      @default(0)
  submittedAt     DateTime @default(now())
  answers         Json     @default("{}")

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("quiz_attempts")
}

model Form {
  id                          String   @id @default(cuid())
  courseId                    String
  title                       String
  description                 String?  @db.Text
  formType                    FormType @default(SURVEY_FEEDBACK)
  assignmentGroup             String   @default("Assignments")
  points                      Float    @default(0)
  shuffleAnswers              Boolean  @default(false)
  allowMultipleResponses      Boolean  @default(false)
  responseLimit               Int?
  anonymousResponses          Boolean  @default(false)
  showResultsToRespondents    Boolean  @default(false)
  showOneAtATime              Boolean  @default(false)
  lockQuestionsAfterAnswering Boolean  @default(false)
  accessCode                  String?
  confirmationMessage         String?  @db.Text
  assignTo                    String[] @default([])
  dueDate                     DateTime?
  dueTime                     String?
  availableFrom               DateTime?
  availableFromTime           String?
  availableUntil              DateTime?
  availableUntilTime          String?
  published                   Boolean  @default(false)
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt

  course    Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions FormQuestion[]

  @@index([courseId])
  @@map("forms")
}

model FormQuestion {
  id                 String           @id @default(cuid())
  formId             String
  type               FormQuestionType @default(SHORT_ANSWER)
  question           String           @default("") @db.Text
  description        String?          @db.Text
  points             Float            @default(0)
  required           Boolean          @default(false)
  image              String?          @db.Text
  options            String[]         @default([])
  correctAnswer      String?
  scaleMin           Int?
  scaleMax           Int?
  scaleMinLabel      String?
  scaleMaxLabel      String?
  rows               String[]         @default([])
  columns            String[]         @default([])
  sectionTitle       String?
  sectionDescription String?          @db.Text
  order              Int              @default(0)

  form Form @relation(fields: [formId], references: [id], onDelete: Cascade)

  @@index([formId])
  @@map("form_questions")
}