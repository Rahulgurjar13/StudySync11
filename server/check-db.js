const mongoose = require('mongoose');
require('dotenv').config();

// FocusSession Schema
const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  focusMinutes: { type: Number, default: 0 },
  activeSessionMinutes: { type: Number, default: 0 },
  sessionsCompleted: { type: Number, default: 0 },
  sessionType: { type: String, enum: ['focus', 'break'], default: 'focus' },
  achieved: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const FocusSession = mongoose.model('FocusSession', focusSessionSchema);

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('📅 Checking data for:', today.toDateString(), '\n');
    
    // Find all sessions for today
    const sessions = await FocusSession.find({ date: today }).populate('userId', 'email');
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found for today');
    } else {
      console.log(`📊 Found ${sessions.length} session(s) for today:\n`);
      
      sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`);
        console.log('  User:', session.userId?.email || 'Unknown');
        console.log('  📝 Completed Minutes (focusMinutes):', session.focusMinutes);
        console.log('  ⏱️  Active Session Minutes:', session.activeSessionMinutes);
        console.log('  ➕ TOTAL:', session.focusMinutes + session.activeSessionMinutes, 'minutes');
        console.log('  🎯 Sessions Completed:', session.sessionsCompleted);
        console.log('  ✅ Goal Achieved (2h):', session.achieved);
        console.log('  🕐 Last Updated:', session.lastUpdated.toLocaleString());
        console.log('  📅 Created:', session.createdAt.toLocaleString());
        console.log('');
      });
      
      // Summary
      const totalCompleted = sessions.reduce((sum, s) => sum + s.focusMinutes, 0);
      const totalActive = sessions.reduce((sum, s) => sum + s.activeSessionMinutes, 0);
      const grandTotal = totalCompleted + totalActive;
      
      console.log('📈 SUMMARY:');
      console.log('  Completed (saved):', totalCompleted, 'minutes');
      console.log('  Active (in-progress):', totalActive, 'minutes');
      console.log('  GRAND TOTAL:', grandTotal, 'minutes =', (grandTotal / 60).toFixed(2), 'hours');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
