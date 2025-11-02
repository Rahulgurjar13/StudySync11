import mongoose from 'mongoose';
import FocusSession from '../models/FocusSession.js';

const mongoURI = 'mongodb://localhost:27017/tandem_track_mate';

async function resetToday() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get today's date (normalized to start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Resetting data for: ${today.toDateString()}`);

    // Reset today's session to 0
    const result = await FocusSession.updateMany(
      { date: today },
      {
        $set: {
          focusMinutes: 0,
          activeSessionMinutes: 0,
          sessionsCompleted: 0,
          achieved: false,
          lastUpdated: new Date()
        }
      }
    );

    console.log(`✅ Reset complete!`);
    console.log(`📝 Updated ${result.modifiedCount} session(s)`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetToday();
