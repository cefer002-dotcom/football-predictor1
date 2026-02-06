import { initializeBot } from './bot/telegram.js';
import { startDailyPredictions } from './scheduler/daily.js';
import { initializeDatabase } from './db/init.js';

async function main() {
  console.log('🚀 Starting Football Prediction Bot...');

  try {
    await initializeDatabase();
    console.log('✅ Database initialized');

    initializeBot();
    console.log('✅ Telegram bot started');

    startDailyPredictions();
    console.log('✅ Daily prediction scheduler started');

    console.log('🎯 System ready! Predictions will be sent daily at 09:00 UTC');
  } catch (error) {
    console.error('❌ Failed to start system:', error);
    process.exit(1);
  }
}

main();
