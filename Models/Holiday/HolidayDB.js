  // Models/Holiday/HolidayDB.js
  import mongoose from "mongoose";

  const HolidaySchema = new mongoose.Schema({
    date: {
      type: Date,
      required: true,
      unique: false, // can have multiple holidays on same day for different classes
    },
    name: {
      type: String,
      required: true,
    },
    className: {
      type: String,
      default: "ALL", // "ALL" = universal holiday
      required: true,
    },
    semester: {
      type: String,
      default: "ALL", // "ALL" = universal holiday
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null, // null = system-generated holiday
    },
  },
  {
    timestamps: true, // optional: tracks createdAt & updatedAt
  });

  // Optional: index to speed up lookups by date + class + semester
  HolidaySchema.index({ date: 1, className: 1, semester: 1 }, { unique: true });

  const HolidayDB = mongoose.model("Holiday", HolidaySchema);

  export default HolidayDB;
