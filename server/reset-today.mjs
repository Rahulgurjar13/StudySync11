import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  focusMinutes: { type: Number, default: 0 },
  activeSessionMinutes: { type: Number, default: 0 },
  sessionsCompleted: { type: Number, default: 0 },
  sessionType: { type: String, enum: ['focus', 'break'], default: 'focus' },
  achieved: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const FocusSession = mongoose.model('FocusSession', focusSessionSchema);

async function resetToday() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('📅 Resetting data for:', today.toDateString());
    console.log('⚠️  This will reset today\'s focus time to 0\n');
    
    const result = await FocusSession.updateMany(
      { date: today },
      { 
        $set: { 
          focusMinutes: 0,
          activeSessionMinutes: 0,
          sessionsCompleted: 0,
          achieved: false
        }
      }
    );
    
    console.log('✅ Reset complete!');
    console.log('  Documents updated:', result.modifiedCount);
    console.log('\n💡 You can now start fresh with accurate tracking!');
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetToday();
