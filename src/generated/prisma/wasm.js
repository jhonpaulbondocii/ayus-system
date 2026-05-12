
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  scope: 'scope',
  courseId: 'courseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationParticipantScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  userId: 'userId',
  isAuthor: 'isAuthor',
  deletedAt: 'deletedAt',
  lastReadAt: 'lastReadAt',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  senderId: 'senderId',
  body: 'body',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageAttachmentScalarFieldEnum = {
  id: 'id',
  messageId: 'messageId',
  name: 'name',
  url: 'url',
  size: 'size',
  mimeType: 'mimeType',
  createdAt: 'createdAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  password: 'password',
  image: 'image',
  role: 'role',
  status: 'status',
  department: 'department',
  position: 'position',
  pronouns: 'pronouns',
  bio: 'bio',
  contactNumber: 'contactNumber',
  employmentStatus: 'employmentStatus',
  accountType: 'accountType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  via: 'via',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  color: 'color',
  image: 'image',
  status: 'status',
  description: 'description',
  term: 'term',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseEnrollmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  courseId: 'courseId',
  courseRole: 'courseRole',
  section: 'section',
  createdAt: 'createdAt'
};

exports.Prisma.GroupSetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  courseId: 'courseId',
  selfSignUp: 'selfSignUp',
  requireSameSection: 'requireSameSection',
  groupStructure: 'groupStructure',
  createGroupsNow: 'createGroupsNow',
  limitGroupMembers: 'limitGroupMembers',
  autoAssignLeader: 'autoAssignLeader',
  leaderType: 'leaderType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  courseId: 'courseId',
  groupSetId: 'groupSetId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupMemberScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  groupId: 'groupId',
  isLeader: 'isLeader',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  points: 'points',
  dueDate: 'dueDate',
  availableFrom: 'availableFrom',
  availableUntil: 'availableUntil',
  courseId: 'courseId',
  groupId: 'groupId',
  status: 'status',
  submissionType: 'submissionType',
  assignmentGroup: 'assignmentGroup',
  displayGradeAs: 'displayGradeAs',
  onlineEntryOptions: 'onlineEntryOptions',
  submissionAttempts: 'submissionAttempts',
  allowedAttempts: 'allowedAttempts',
  doNotCount: 'doNotCount',
  isGroupAssignment: 'isGroupAssignment',
  groupSetId: 'groupSetId',
  requirePeerReviews: 'requirePeerReviews',
  anonymousGrading: 'anonymousGrading',
  peerReviewAssign: 'peerReviewAssign',
  peerReviewAnonymous: 'peerReviewAnonymous',
  notifyUsers: 'notifyUsers',
  assignees: 'assignees',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubmissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  assignmentId: 'assignmentId',
  status: 'status',
  fileUrl: 'fileUrl',
  textEntry: 'textEntry',
  websiteUrl: 'websiteUrl',
  comments: 'comments',
  grade: 'grade',
  feedback: 'feedback',
  submittedAt: 'submittedAt',
  daysLate: 'daysLate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RepositoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  assignmentId: 'assignmentId',
  courseId: 'courseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RepositoryFileScalarFieldEnum = {
  id: 'id',
  repositoryId: 'repositoryId',
  submissionId: 'submissionId',
  userId: 'userId',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  fileSize: 'fileSize',
  mimeType: 'mimeType',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  repositoryId: 'repositoryId',
  userId: 'userId',
  action: 'action',
  targetType: 'targetType',
  targetId: 'targetId',
  targetName: 'targetName',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  title: 'title',
  bodyText: 'bodyText',
  bodyHtml: 'bodyHtml',
  author: 'author',
  authorId: 'authorId',
  assignTo: 'assignTo',
  allowComment: 'allowComment',
  locked: 'locked',
  allowLiking: 'allowLiking',
  availableFrom: 'availableFrom',
  availableUntil: 'availableUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementAttachmentScalarFieldEnum = {
  id: 'id',
  announcementId: 'announcementId',
  name: 'name',
  url: 'url',
  size: 'size',
  mimeType: 'mimeType',
  createdAt: 'createdAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.QuizScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  authorId: 'authorId',
  authorName: 'authorName',
  authorRole: 'authorRole',
  title: 'title',
  description: 'description',
  quizType: 'quizType',
  assignmentGroup: 'assignmentGroup',
  points: 'points',
  shuffleAnswers: 'shuffleAnswers',
  timeLimit: 'timeLimit',
  allowMultipleAttempts: 'allowMultipleAttempts',
  attemptLimit: 'attemptLimit',
  scoreToKeep: 'scoreToKeep',
  viewResponses: 'viewResponses',
  onlyOnceAfterAttempt: 'onlyOnceAfterAttempt',
  showCorrectAnswers: 'showCorrectAnswers',
  showCorrectAnswersAt: 'showCorrectAnswersAt',
  hideCorrectAnswersAt: 'hideCorrectAnswersAt',
  showOneAtATime: 'showOneAtATime',
  lockQuestionsAfterAnswering: 'lockQuestionsAfterAnswering',
  accessCode: 'accessCode',
  ipFilter: 'ipFilter',
  assignTo: 'assignTo',
  dueDate: 'dueDate',
  availableFrom: 'availableFrom',
  availableUntil: 'availableUntil',
  published: 'published',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuizQuestionScalarFieldEnum = {
  id: 'id',
  quizId: 'quizId',
  type: 'type',
  question: 'question',
  description: 'description',
  points: 'points',
  correctAnswer: 'correctAnswer',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.QuizAnswerScalarFieldEnum = {
  id: 'id',
  questionId: 'questionId',
  text: 'text',
  correct: 'correct',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.QuizMatchPairScalarFieldEnum = {
  id: 'id',
  questionId: 'questionId',
  left: 'left',
  right: 'right',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.QuizAttemptScalarFieldEnum = {
  id: 'id',
  quizId: 'quizId',
  userId: 'userId',
  score: 'score',
  durationSeconds: 'durationSeconds',
  submittedAt: 'submittedAt',
  answers: 'answers'
};

exports.Prisma.FormScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  authorId: 'authorId',
  authorName: 'authorName',
  authorRole: 'authorRole',
  title: 'title',
  description: 'description',
  formType: 'formType',
  assignmentGroup: 'assignmentGroup',
  points: 'points',
  shuffleAnswers: 'shuffleAnswers',
  allowMultipleResponses: 'allowMultipleResponses',
  responseLimit: 'responseLimit',
  anonymousResponses: 'anonymousResponses',
  showResultsToRespondents: 'showResultsToRespondents',
  showOneAtATime: 'showOneAtATime',
  lockQuestionsAfterAnswering: 'lockQuestionsAfterAnswering',
  accessCode: 'accessCode',
  confirmationMessage: 'confirmationMessage',
  assignTo: 'assignTo',
  dueDate: 'dueDate',
  dueTime: 'dueTime',
  availableFrom: 'availableFrom',
  availableFromTime: 'availableFromTime',
  availableUntil: 'availableUntil',
  availableUntilTime: 'availableUntilTime',
  published: 'published',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FormQuestionScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  type: 'type',
  question: 'question',
  description: 'description',
  points: 'points',
  required: 'required',
  image: 'image',
  options: 'options',
  correctAnswer: 'correctAnswer',
  scaleMin: 'scaleMin',
  scaleMax: 'scaleMax',
  scaleMinLabel: 'scaleMinLabel',
  scaleMaxLabel: 'scaleMaxLabel',
  rows: 'rows',
  columns: 'columns',
  sectionTitle: 'sectionTitle',
  sectionDescription: 'sectionDescription',
  order: 'order'
};

exports.Prisma.FormSubmissionScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  userId: 'userId',
  answers: 'answers',
  score: 'score',
  createdAt: 'createdAt'
};

exports.Prisma.RubricScalarFieldEnum = {
  id: 'id',
  assignmentId: 'assignmentId',
  courseId: 'courseId',
  title: 'title',
  type: 'type',
  ratingDisplay: 'ratingDisplay',
  ratingOrder: 'ratingOrder',
  scoring: 'scoring',
  doNotPostToGradebook: 'doNotPostToGradebook',
  useForGrading: 'useForGrading',
  hideScoreTotal: 'hideScoreTotal',
  pointsPossible: 'pointsPossible',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RubricCriterionScalarFieldEnum = {
  id: 'id',
  rubricId: 'rubricId',
  name: 'name',
  description: 'description',
  points: 'points',
  enableRange: 'enableRange',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.RubricRatingScalarFieldEnum = {
  id: 'id',
  criterionId: 'criterionId',
  points: 'points',
  name: 'name',
  description: 'description',
  order: 'order'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.MessageScope = exports.$Enums.MessageScope = {
  DIRECT: 'DIRECT',
  COURSE: 'COURSE'
};

exports.Role = exports.$Enums.Role = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF'
};

exports.ApprovalStatus = exports.$Enums.ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DEACTIVATED: 'DEACTIVATED'
};

exports.CourseStatus = exports.$Enums.CourseStatus = {
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED'
};

exports.AssignmentStatus = exports.$Enums.AssignmentStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  OVERDUE: 'OVERDUE',
  LATE: 'LATE',
  MISSING: 'MISSING',
  EXCUSED: 'EXCUSED'
};

exports.QuizType = exports.$Enums.QuizType = {
  GRADED_QUIZ: 'GRADED_QUIZ',
  PRACTICE_QUIZ: 'PRACTICE_QUIZ',
  GRADED_SURVEY: 'GRADED_SURVEY',
  UNGRADED_SURVEY: 'UNGRADED_SURVEY'
};

exports.QuizQuestionType = exports.$Enums.QuizQuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  FILL_BLANK: 'FILL_BLANK',
  ESSAY: 'ESSAY',
  FILE_UPLOAD: 'FILE_UPLOAD',
  MATCHING: 'MATCHING'
};

exports.FormType = exports.$Enums.FormType = {
  SURVEY_FEEDBACK: 'SURVEY_FEEDBACK',
  EVALUATION: 'EVALUATION',
  REGISTRATION_FORM: 'REGISTRATION_FORM',
  GRADED_ASSESSMENT: 'GRADED_ASSESSMENT'
};

exports.FormQuestionType = exports.$Enums.FormQuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  CHECKBOXES: 'CHECKBOXES',
  DROPDOWN: 'DROPDOWN',
  SHORT_ANSWER: 'SHORT_ANSWER',
  PARAGRAPH: 'PARAGRAPH',
  LINEAR_SCALE: 'LINEAR_SCALE',
  MC_GRID: 'MC_GRID',
  CHECKBOX_GRID: 'CHECKBOX_GRID',
  DATE: 'DATE',
  TIME: 'TIME',
  FILE_UPLOAD: 'FILE_UPLOAD',
  SECTION: 'SECTION'
};

exports.Prisma.ModelName = {
  Conversation: 'Conversation',
  ConversationParticipant: 'ConversationParticipant',
  Message: 'Message',
  MessageAttachment: 'MessageAttachment',
  User: 'User',
  PasswordResetToken: 'PasswordResetToken',
  Course: 'Course',
  CourseEnrollment: 'CourseEnrollment',
  GroupSet: 'GroupSet',
  Group: 'Group',
  GroupMember: 'GroupMember',
  Assignment: 'Assignment',
  Submission: 'Submission',
  Repository: 'Repository',
  RepositoryFile: 'RepositoryFile',
  ActivityLog: 'ActivityLog',
  Announcement: 'Announcement',
  AnnouncementAttachment: 'AnnouncementAttachment',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Quiz: 'Quiz',
  QuizQuestion: 'QuizQuestion',
  QuizAnswer: 'QuizAnswer',
  QuizMatchPair: 'QuizMatchPair',
  QuizAttempt: 'QuizAttempt',
  Form: 'Form',
  FormQuestion: 'FormQuestion',
  FormSubmission: 'FormSubmission',
  Rubric: 'Rubric',
  RubricCriterion: 'RubricCriterion',
  RubricRating: 'RubricRating'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
