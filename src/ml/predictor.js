import { getTeamStats } from '../db/init.js';

const MIN_CONFIDENCE_THRESHOLD = 0.75;
const BOOKMAKER_WEIGHT = 0.4;
const STATS_WEIGHT = 0.35;
const FORM_WEIGHT = 0.15;
const HOME_ADVANTAGE = 0.05;

export async function predictMatch(match, bookmakerOdds) {
  try {
    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;
    const season = new Date(match.match_date).getFullYear();

    const homeStats = await getTeamStats(homeTeamId, season);
    const awayStats = await getTeamStats(awayTeamId, season);

    if (!homeStats || !awayStats) {
      return null;
    }

    const bookmakerProbs = calculateBookmakerProbability(bookmakerOdds);
    const statsProbs = calculateStatsProbability(homeStats, awayStats);
    const formProbs = calculateFormProbability(homeStats, awayStats);

    const p1 = (bookmakerProbs.p1 * BOOKMAKER_WEIGHT +
                statsProbs.p1 * STATS_WEIGHT +
                formProbs.p1 * FORM_WEIGHT +
                HOME_ADVANTAGE) / (BOOKMAKER_WEIGHT + STATS_WEIGHT + FORM_WEIGHT + HOME_ADVANTAGE);

    const p2 = (bookmakerProbs.p2 * BOOKMAKER_WEIGHT +
                statsProbs.p2 * STATS_WEIGHT +
                formProbs.p2 * FORM_WEIGHT) / (BOOKMAKER_WEIGHT + STATS_WEIGHT + FORM_WEIGHT);

    const px = 1 - p1 - p2;

    const confidenceScore = Math.max(p1, px, p2);
    const predictionType = getPredictionType(p1, px, p2);

    if (confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
      return null;
    }

    const recommendedBet = getRecommendedBet(predictionType, bookmakerOdds, confidenceScore);

    return {
      type: predictionType,
      confidence: confidenceScore,
      probabilities: { p1, px, p2 },
      recommendedBet,
      expectedValue: calculateEV(recommendedBet, bookmakerOdds, { p1, px, p2 })
    };
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
}

function calculateBookmakerProbability(odds) {
  const p1 = 1 / (odds.o1 || 2);
  const px = 1 / (odds.ox || 3);
  const p2 = 1 / (odds.o2 || 2);
  const total = p1 + px + p2;

  return {
    p1: p1 / total,
    px: px / total,
    p2: p2 / total
  };
}

function calculateStatsProbability(homeStats, awayStats) {
  const homeWinRate = homeStats.wins / (homeStats.games_played || 1);
  const awayWinRate = awayStats.wins / (awayStats.games_played || 1);
  const homeGoalsPerGame = homeStats.goals_for / (homeStats.games_played || 1);
  const awayGoalsPerGame = awayStats.goals_for / (awayStats.games_played || 1);

  const homeStrength = (homeWinRate * 0.6 + homeGoalsPerGame * 0.1);
  const awayStrength = (awayWinRate * 0.6 + awayGoalsPerGame * 0.1);

  const totalStrength = homeStrength + awayStrength;

  if (totalStrength === 0) {
    return { p1: 0.33, px: 0.34, p2: 0.33 };
  }

  const p1 = Math.min(0.7, homeStrength / totalStrength * 1.2);
  const p2 = Math.min(0.6, awayStrength / totalStrength * 0.9);
  const px = 1 - p1 - p2;

  return {
    p1: Math.max(0.1, p1),
    px: Math.max(0.1, px),
    p2: Math.max(0.1, p2)
  };
}

function calculateFormProbability(homeStats, awayStats) {
  const homeForm = (homeStats.wins - homeStats.losses) / Math.max(homeStats.games_played, 5);
  const awayForm = (awayStats.wins - awayStats.losses) / Math.max(awayStats.games_played, 5);

  const p1 = 0.5 + (homeForm * 0.15);
  const p2 = 0.5 - (awayForm * 0.15);
  const px = 0.1;

  const total = p1 + p2 + px;

  return {
    p1: p1 / total,
    px: px / total,
    p2: p2 / total
  };
}

function getPredictionType(p1, px, p2) {
  const max = Math.max(p1, px, p2);

  if (max === p1) return '1';
  if (max === p2) return '2';
  return 'X';
}

function getRecommendedBet(predictionType, odds, confidence) {
  if (confidence < 0.8) return null;

  const relevantOdd = {
    '1': odds.o1,
    'X': odds.ox,
    '2': odds.o2
  }[predictionType];

  if (relevantOdd > 2.0) {
    return `${predictionType} @${relevantOdd.toFixed(2)}`;
  }

  return null;
}

function calculateEV(bet, odds, probs) {
  if (!bet) return 0;

  const prediction = bet[0];
  const prob = probs[`p${prediction}`] || 0;
  const odd = odds[`o${prediction}`] || 1;

  return prob * (odd - 1) - (1 - prob);
}

export function filterByConfidence(predictions, minConfidence = 0.75) {
  return predictions
    .filter(p => p && p.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
