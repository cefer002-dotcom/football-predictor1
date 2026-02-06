import { supabase } from './supabase.js';

export async function initializeDatabase() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .limit(1);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export async function addTeam(name, code, country, league) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, code, country, league }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function addMatch(homeTeamId, awayTeamId, matchDate, league, externalId) {
  const { data, error } = await supabase
    .from('matches')
    .insert([{
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate,
      league,
      external_id: externalId
    }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getUpcomingMatches(daysAhead = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      home_team_id,
      away_team_id,
      match_date,
      league,
      status,
      home_team:teams!home_team_id(name, code),
      away_team:teams!away_team_id(name, code)
    `)
    .gte('match_date', now.toISOString())
    .lte('match_date', future.toISOString())
    .eq('status', 'scheduled')
    .order('match_date', { ascending: true });

  if (error) throw error;
  return data;
}

export async function savePrediction(matchId, type, confidence, probs, bet, odds) {
  const { data, error } = await supabase
    .from('predictions')
    .insert([{
      match_id: matchId,
      prediction_type: type,
      confidence,
      probability_1: probs.p1,
      probability_x: probs.px,
      probability_2: probs.p2,
      recommended_bet: bet,
      odds_1: odds.o1,
      odds_x: odds.ox,
      odds_2: odds.o2
    }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getTeamStats(teamId, season) {
  const { data, error } = await supabase
    .from('team_stats')
    .select('*')
    .eq('team_id', teamId)
    .eq('season', season)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateTeamStats(teamId, season, stats) {
  const { data, error } = await supabase
    .from('team_stats')
    .upsert([
      {
        team_id: teamId,
        season,
        ...stats
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getDailyPredictions(date) {
  const { data, error } = await supabase
    .from('daily_predictions')
    .select(`
      *,
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
}

export async function saveDailyBatch(date, matchIds, predictionsCount) {
  const { data, error } = await supabase
    .from('daily_predictions')
    .insert([{
      batch_date: date,
      match_ids: matchIds,
      predictions_count: predictionsCount
    }])
    .select();

  if (error) throw error;
  return data[0];
}
