import cron from 'node-cron';
import {
  getUpcomingMatches,
  fetchUpcomingMatches,
  fetchMatchOdds,
  fetchTeamStats
} from '../api/football.js';
import { predictMatch, filterByConfidence } from '../ml/predictor.js';
import {
  savePrediction,
  saveDailyBatch,
  updateTeamStats,
  getTeamStats
} from '../db/init.js';
import { sendDailyPredictions, getDailyPredictions } from '../bot/telegram.js';
import { supabase } from '../db/supabase.js';

export function startDailyPredictions() {
  cron.schedule('0 9 * * *', async () => {
    console.log('🚀 Starting daily prediction analysis at 09:00 UTC...');
    await runDailyAnalysis();
  });

  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Syncing football data at 01:00 UTC...');
    await syncFootballData();
  });

  console.log('✅ Daily prediction scheduler initialized');
}

async function runDailyAnalysis() {
  try {
    await syncFootballData();

    const today = new Date().toISOString().split('T')[0];
    const upcomingMatches = await getUpcomingMatches(3);

    if (!upcomingMatches || upcomingMatches.length === 0) {
      console.log('⚠️  No upcoming matches found');
      return;
    }

    console.log(`📋 Analyzing ${upcomingMatches.length} matches...`);

    const predictions = [];

    for (const match of upcomingMatches) {
      try {
        const externalId = match.external_id || match.id;

        const odds = await fetchMatchOdds(externalId);

        const prediction = await predictMatch(match, odds);

        if (prediction) {
          const savedPred = await savePrediction(
            match.id,
            prediction.type,
            prediction.confidence,
            prediction.probabilities,
            prediction.recommendedBet,
            odds
          );

          predictions.push({
            ...savedPred,
            match,
            ...prediction
          });
        }
      } catch (error) {
        console.error(`Error analyzing match ${match.id}:`, error.message);
      }
    }

    const topPredictions = filterByConfidence(predictions, 0.75);

    if (topPredictions.length > 0) {
      const matchIds = topPredictions.map(p => p.match_id);
      await saveDailyBatch(today, matchIds, topPredictions.length);

      const dailyPredictions = await getDailyPredictions(today);
      await sendDailyPredictions(dailyPredictions);

      console.log(`✅ Generated ${topPredictions.length} top predictions for today`);
    } else {
      console.log('⚠️  No high-confidence predictions generated');
    }
  } catch (error) {
    console.error('❌ Error in daily analysis:', error);
  }
}

async function syncFootballData() {
  try {
    console.log('🔄 Syncing upcoming matches...');
    const newMatches = await fetchUpcomingMatches(7);
    console.log(`✅ Synced ${newMatches.length} matches`);

    const season = new Date().getFullYear();
    const { data: teams } = await supabase.from('teams').select('id, code');

    if (teams && teams.length > 0) {
      console.log(`📊 Updating team statistics for ${teams.length} teams...`);

      for (const team of teams.slice(0, 10)) {
        try {
          if (team.code) {
            const stats = await fetchTeamStats(parseInt(team.code), season);
            if (stats) {
              await updateTeamStats(team.id, season, stats);
            }
          }
        } catch (error) {
          console.error(`Error syncing stats for team ${team.id}:`, error.message);
        }
      }
    }

    console.log('✅ Data sync complete');
  } catch (error) {
    console.error('❌ Error syncing football data:', error);
  }
}

async function getDailyPredictions(date) {
  try {
    const { data, error } = await supabase
      .from('daily_predictions')
      .select(`
        id,
        batch_date,
        predictions_count,
        match_ids,
        predictions:predictions(
          id,
          match_id,
          prediction_type,
          confidence,
          probability_1,
          probability_x,
          probability_2,
          recommended_bet,
          match:matches(
            id,
            match_date,
            league,
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name),
            odds_1,
            odds_x,
            odds_2
          )
        )
      `)
      .eq('batch_date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching daily predictions:', error);
    return null;
  }
}
