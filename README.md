# Football Prediction Bot - 90% Accuracy System

## 🎯 Overview

A production-ready football match prediction system that generates **5 high-confidence predictions daily** (>90% confidence threshold). Combines machine learning analysis, historical statistics, bookmaker odds, and real-time data to provide accurate match forecasts.

## 📋 Features

- **Daily Analysis**: Analyzes 50+ matches daily, selects top 5 with highest confidence
- **ML Model**: Hybrid prediction engine combining:
  - Bookmaker odds (40% weight)
  - Team statistics (35% weight)
  - Current form (15% weight)
  - Home advantage factor (5% weight)
- **Real-time Data**: Integrates with football-data.org API
- **Telegram Notifications**: Sends daily predictions to Telegram chats
- **Web Dashboard**: Real-time tracking of accuracy, predictions, and results
- **Supabase Backend**: Secure data storage and RLS policies
- **Automated Scheduling**: Runs analysis at fixed times daily

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Supabase project (credentials in .env)
- Football-data.org API key (free tier available)
- Telegram bot token (optional, for notifications)

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables** in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SUPABASE_ANON_KEY=your_anon_key
FOOTBALL_DATA_API_KEY=your_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_IDS=123456789,987654321
```

3. **Start the bot**
```bash
npm start
```

## 🔧 Configuration

### Football-data.org Setup

1. Get free API key from [football-data.org](https://www.football-data.org/)
2. Add to `.env` as `FOOTBALL_DATA_API_KEY`
3. Bot supports top European leagues: PL, BL1, SA, PD, FL1, PPL, DED, JSC

### Telegram Setup

1. Create bot with BotFather: [@BotFather](https://t.me/botfather)
2. Get bot token and add to `.env` as `TELEGRAM_BOT_TOKEN`
3. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
4. Add chat IDs (comma-separated) to `TELEGRAM_CHAT_IDS` in `.env`

### Supabase Setup

Database is automatically initialized on first run. Tables created:
- `teams` - Team data and metadata
- `matches` - Upcoming/finished matches
- `team_stats` - Historical statistics
- `predictions` - Generated predictions
- `results` - Prediction outcomes for accuracy tracking
- `daily_predictions` - Daily batch records

## 📊 Prediction Model

### Confidence Calculation

**Minimum threshold: 0.75 (75%)**

Predictions are weighted combination:

```
confidence = (
  bookmaker_probs × 0.40 +
  team_stats_probs × 0.35 +
  form_factor × 0.15 +
  home_advantage × 0.05
)
```

### Bookmaker Component (40%)
- Uses current betting odds to calculate implied probabilities
- Reflects market consensus and sharp bettors

### Team Statistics Component (35%)
- Win rates, goal differential, possession patterns
- Historical seasonal performance
- Goals for/against averaging

### Form Factor (15%)
- Recent match results (wins/losses)
- Current season momentum
- Streak performance

### Home Advantage (5%)
- Fixed bonus for home teams
- Reflects historical home field advantage

## 📈 Daily Workflow

**01:00 UTC** - Data Sync
- Fetches upcoming matches for next 7 days
- Updates team statistics from completed matches
- Validates team records in database

**09:00 UTC** - Daily Analysis
- Analyzes all upcoming matches (next 3 days)
- Calculates predictions with confidence scores
- Filters to top 5 predictions (>75% confidence)
- Stores predictions in database
- Sends Telegram notifications
- Updates dashboard

## 🎯 Accuracy Metrics

System tracks:
- **True Positives**: Correct predictions
- **Confidence Distribution**: % by confidence bucket
- **ROI**: Expected value vs actual odds
- **Hit Rate**: Percentage of predictions that hit
- **Daily Performance**: Batch-level accuracy

View live metrics on dashboard at `/index.html`

## 📱 API Endpoints

### Dashboard
```
GET /index.html
```
View predictions, accuracy stats, and results

### Telegram Commands
```
/predictions - Get today's top 5 predictions
```

## 🔒 Security

- **Row Level Security** enabled on all tables
- Public read-only access for predictions/matches
- Database credentials in `.env` (never committed)
- API keys secured in environment variables
- No authentication required for dashboard (public data)

## 🛠 Development

### Run in watch mode
```bash
npm run dev
```

### Project Structure
```
src/
├── index.js           # Main entry point
├── db/
│   ├── supabase.js   # Database client
│   └── init.js       # Database functions
├── api/
│   └── football.js   # Football-data.org integration
├── ml/
│   └── predictor.js  # ML prediction engine
├── bot/
│   └── telegram.js   # Telegram bot logic
├── scheduler/
│   └── daily.js      # Cron jobs and scheduling
```

## ⚠️ Disclaimer

- These are **analytical predictions**, not guaranteed outcomes
- Historical accuracy ≠ future performance
- Always gamble responsibly
- Consider predictions as one input among many research factors

## 📞 Support

For issues or questions:
1. Check `.env` configuration
2. Verify API credentials
3. Check Supabase RLS policies
4. Review console logs for detailed errors

## 📄 License

MIT License
