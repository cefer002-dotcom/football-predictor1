import { Telegraf } from 'telegraf';
import { getDailyPredictions } from '../db/init.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',').filter(Boolean);

export function initializeBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Bot messages will not be sent.');
    return;
  }

  bot.start((ctx) => {
    ctx.reply('🎯 Football Prediction Bot started!\nSend /predictions to get today\'s picks.');
  });

  bot.command('predictions', async (ctx) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const predictions = await getDailyPredictions(today);

      if (!predictions) {
        ctx.reply('No predictions available for today.');
        return;
      }

      const message = formatPredictionsMessage(predictions);
      ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      ctx.reply('Error fetching predictions.');
    }
  });

  bot.launch();
  console.log('✅ Telegram bot listening for commands');

  return bot;
}

export async function sendDailyPredictions(predictions) {
  if (!CHAT_IDS.length || !process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  No chat IDs configured or bot token missing');
    return;
  }

  try {
    const message = formatPredictionsMessage(predictions);

    for (const chatId of CHAT_IDS) {
      try {
        await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        console.log(`✅ Predictions sent to chat ${chatId}`);
      } catch (error) {
        console.error(`Error sending to chat ${chatId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in sendDailyPredictions:', error);
  }
}

function formatPredictionsMessage(predictions) {
  if (!predictions.predictions || predictions.predictions.length === 0) {
    return '📊 No high-confidence predictions available today.';
  }

  let message = '🎯 <b>Today\'s Top 5 Predictions (90% Confidence)</b>\n\n';

  predictions.predictions.slice(0, 5).forEach((pred, index) => {
    if (!pred.match) return;

    const match = pred.match;
    const confidence = (pred.confidence * 100).toFixed(1);
    const prob1 = (pred.probability_1 * 100).toFixed(0);
    const probX = (pred.probability_x * 100).toFixed(0);
    const prob2 = (pred.probability_2 * 100).toFixed(0);

    const time = new Date(match.match_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });

    message += `<b>${index + 1}. ${match.home_team.name} vs ${match.away_team.name}</b>\n`;
    message += `⏰ ${time} UTC | 📍 ${match.league}\n`;
    message += `🎯 Prediction: <b>${pred.prediction_type}</b>\n`;
    message += `📈 Confidence: <b>${confidence}%</b>\n`;
    message += `💡 Odds: 1=${match.odds_1?.toFixed(2) || 'N/A'} X=${match.odds_x?.toFixed(2) || 'N/A'} 2=${match.odds_2?.toFixed(2) || 'N/A'}\n`;
    message += `📊 Probabilities: 1=${prob1}% X=${probX}% 2=${prob2}%\n`;

    if (pred.recommended_bet) {
      message += `💰 <b>Bet: ${pred.recommended_bet}</b>\n`;
    }

    message += '\n';
  });

  message += '⚠️  <i>Disclaimer: These are analytical predictions. Gamble responsibly.</i>';

  return message;
}

export function stopBot() {
  bot.stop();
}
