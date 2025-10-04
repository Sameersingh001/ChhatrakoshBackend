import mongoose from "mongoose";

// Schema for quiz questions
const quizQuestionSchema = new mongoose.Schema({
  className: { type: String, required: true }, // e.g. "BCA"

  // Store only the date (without time) for uniqueness
  date: { 
    type: Date, 
    default: () => new Date(new Date().setHours(0, 0, 0, 0)) 
  },

  questions: [
    {
      question: { type: String, required: true },
      options: {
        A: { type: String, required: true },
        B: { type: String, required: true },
        C: { type: String, required: true },
        D: { type: String, required: true },
      },
      correctAnswer: { 
        type: String, 
        enum: ["A", "B", "C", "D"], 
        required: true 
      },
    },
  ],

  // Track student submissions for the day
  submissions: [
    {
      studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student", 
        required: true 
      },
      studentName: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now },
      answers: [
        {
          questionIndex: { type: Number, required: true },
          selectedOption: { 
            type: String, 
            enum: ["A", "B", "C", "D", ""], 
          },
        },
      ],
      score: { type: Number, required: true },
      correctAnswers: { type: Number, required: true },
      totalQuestions: { type: Number, required: true },
      timeSpent: { type: Number, default: 0 },
      violations: { type: Number, default: 0 },
      autoSubmitted: { type: Boolean, default: false },
      autoSubmitReason: { type: String },
      failedDueToViolation: { type: Boolean, default: false },
      attemptNumber: { type: Number, required: true }, // 1 or 2
    },
  ],

  // Track daily attempts per student
  studentAttempts: [
    {
      studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student", 
        required: true 
      },
      attemptsUsed: { type: Number, default: 0, min: 0, max: 3 },
      lastAttemptAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true
});

// Ensure one quiz per class per day (ignores time of day)
quizQuestionSchema.index({ className: 1, date: 1 }, { unique: true });

// Index for faster student attempts lookup
quizQuestionSchema.index({ "studentAttempts.studentId": 1 });

// Index for faster submissions lookup
quizQuestionSchema.index({ "submissions.studentId": 1 });

const QuizDB = mongoose.model("QuizDB", quizQuestionSchema);
export default QuizDB;