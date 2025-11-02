import mongoose from 'mongoose';
import FocusSession from '../models/FocusSession.js';

const mongoURI = 'mongodb://localhost:27017/tandem_track_mate';

async function checkDatabase() {
  try {
    await mongoose.connect(mongoURI);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await FocusSession.find({ date: today });
    
    console.log(`\n📊 Found ${sessions.length} session(s) for today:\n`);
    
    sessions.forEach(session => {
      const totalMinutes = session.focusMinutes + (session.activeSessionMinutes || 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      console.log(`📝 Completed Minutes (focusMinutes): ${session.focusMinutes}`);
      console.log(`⏱️  Active Session Minutes: ${session.activeSessionMinutes || 0}`);
      console.log(`➕ TOTAL: ${totalMinutes} minutes`);
      console.log(`⏰ In hours: ${(totalMinutes / 60).toFixed(2)} hours`);
      console.log(`📊 Formatted: ${hours}h ${mins}m\n`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkDatabase();
