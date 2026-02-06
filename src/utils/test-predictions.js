import { supabase } from '../db/supabase.js';
import { getUpcomingMatches, fetchMatchOdds, fetchTeamStats } from '../api/football.js';
import { predictMatch, filterByConfidence } from '../ml/predictor.js';
import { savePrediction } from '../db/init.js';

export async function testPredictionSystem() {
  console.log('🧪 Testing prediction system...\n');

  try {
    console.log('1️⃣  Fetching upcoming matches...');
    const matches = await getUpcomingMatches(3);

    if (!matches || matches.length === 0) {
      console.log('⚠️  No upcoming matches found for testing');
      return;
    }

    console.log(`✅ Found ${matches.length} matches\n`);

    const predictions = [];

    for (let i = 0; i < Math.min(matches.length, 5); i++) {
      const match = matches[i];
      console.log(`\n2️⃣  Testing match: ${match.home_team.name} vs ${match.away_team.name}`);

      try {
        const odds = await fetchMatchOdds(match.external_id || match.id);
        console.log(`   Odds: 1=${odds.o1.toFixed(2)} X=${odds.ox.toFixed(2)} 2=${odds.o2.toFixed(2)}`);

        const prediction = await predictMatch(match, odds);

        if (prediction) {
          console.log(`   ✅ Prediction: ${prediction.type}`);
          console.log(`   📊 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
          console.log(`   📈 Probabilities: 1=${(prediction.probabilities.p1 * 100).toFixed(0)}% X=${(prediction.probabilities.px * 100).toFixed(0)}% 2=${(prediction.probabilities.p2 * 100).toFixed(0)}%`);

          if (prediction.recommendedBet) {
            console.log(`   💰 Recommended: ${prediction.recommendedBet}`);
          }

          predictions.push({
            match,
            odds,
            prediction
          });
        } else {
          console.log(`   ⚠️  No high-confidence prediction (below 75% threshold)`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n\n3️⃣  Filtering top predictions...`);
    const topPredictions = filterByConfidence(
      predictions.map(p => ({
        match_id: p.match.id,
        ...p.prediction
      })),
      0.75
    );

    console.log(`✅ Top ${topPredictions.length} predictions for today:\n`);

    topPredictions.forEach((pred, idx) => {
      const match = predictions.find(p => p.match.id === pred.match_id).match;
      console.log(`${idx + 1}. ${match.home_team.name} vs ${match.away_team.name}`);
      console.log(`   Prediction: ${pred.type} (${(pred.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`   Bet: ${pred.recommendedBet || 'None'}\n`);
    });

    console.log('✅ Test complete!');

    return topPredictions;
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

export async function getSystemStats() {
  try {
    console.log('\n📊 System Statistics\n');

    const { data: matches } = await supabase.from('matches').select('id');
    console.log(`Total matches in DB: ${matches?.length || 0}`);

    const { data: teams } = await supabase.from('teams').select('id');
    console.log(`Total teams in DB: ${teams?.length || 0}`);

    const { data: predictions } = await supabase.from('predictions').select('id');
    console.log(`Total predictions in DB: ${predictions?.length || 0}`);

    const { data: results } = await supabase.from('results').select('is_correct');
    const correct = results?.filter(r => r.is_correct).length || 0;
    const total = results?.length || 0;
    console.log(`Prediction accuracy: ${total > 0 ? ((correct / total) * 100).toFixed(1) : 0}% (${correct}/${total})`);

    console.log('');
  } catch (error) {
    console.error('Error getting stats:', error);
  }
}
