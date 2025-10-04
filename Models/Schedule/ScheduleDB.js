import mongoose from "mongoose";

const classScheduleSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  teacher: {
    type: String,
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    default: "TBD",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const ScheduleDB = mongoose.model("ClassSchedule", classScheduleSchema);
export default ScheduleDB;
