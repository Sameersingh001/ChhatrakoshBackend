import cron from "node-cron"
import HolidayDB from "./Models/Holiday/HolidayDB.js";
cron.schedule("5 0 * * *", async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today.getDay() === 0) { // 0 = Sunday
      const dateStr = today.toISOString().split("T")[0];
      
      // Check if already exists
      const exists = await HolidayDB.findOne({ date: today });
      if (exists) return console.log(`⚠️ Sunday holiday already exists for ${dateStr}`);

      // Insert Sunday holiday
      const newHoliday = new HolidayDB({
        date: today,
        name: "Sunday Weekly Holiday",
        className: "ALL", // or loop for all classes
        semester: "ALL",
        markedBy: null, // system-generated
      });

      await newHoliday.save();
      console.log(`✅ Auto-marked Sunday holiday for ${dateStr}`);
    }
  } catch (err) {
    console.error("❌ Error auto-marking Sunday holiday:", err);
  }
});