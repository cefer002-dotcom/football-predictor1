import axios from 'axios';
import { addTeam, addMatch } from '../db/init.js';

const FOOTBALL_API_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || 'free';

const client = axios.create({
  baseURL: FOOTBALL_API_URL,
  headers: {
    'X-Auth-Token': API_KEY
  }
});

const SUPPORTED_LEAGUES = ['PL', 'BL1', 'SA', 'PD', 'FL1', 'PPL', 'DED', 'JSC'];

export async function fetchUpcomingMatches(daysAhead = 7) {
  try {
    const matches = [];

    for (const league of SUPPORTED_LEAGUES) {
      try {
        const response = await client.get('/matches', {
          params: {
            competitions: league,
            status: 'SCHEDULED'
          }
        });

        const leagueMatches = response.data.matches || [];

        for (const match of leagueMatches) {
          const matchDate = new Date(match.utcDate);
          const daysUntil = (matchDate - new Date()) / (1000 * 60 * 60 * 24);

          if (daysUntil > 0 && daysUntil <= daysAhead) {
            try {
              const homeTeam = await ensureTeam(match.homeTeam);
              const awayTeam = await ensureTeam(match.awayTeam);

              const existing = await checkMatchExists(match.id);
              if (!existing) {
                const newMatch = await addMatch(
                  homeTeam.id,
                  awayTeam.id,
                  match.utcDate,
                  match.competition.code,
                  match.id.toString()
                );
                matches.push(newMatch);
              }
            } catch (error) {
              console.error(`Error processing match ${match.id}:`, error.message);
            }
          }
        }
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`Rate limited. Waiting...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
        } else if (error.response?.status !== 404) {
          console.error(`Error fetching league ${league}:`, error.message);
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

export async function fetchMatchOdds(externalMatchId) {
  try {
    const response = await client.get(`/matches/${externalMatchId}`);
    const match = response.data;

    if (!match.odds) {
      return {
        o1: 2.0,
        ox: 3.0,
        o2: 3.5
      };
    }

    const bookmakers = match.odds.bookmakers || [];
    if (bookmakers.length > 0) {
      const bets = bookmakers[0].bets || [];
      const winDraw = bets.find(b => b.name === 'WIN_DRAW_WIN');

      if (winDraw && winDraw.values) {
        return {
          o1: winDraw.values.find(v => v.resultType === '1')?.odds || 2.0,
          ox: winDraw.values.find(v => v.resultType === 'X')?.odds || 3.0,
          o2: winDraw.values.find(v => v.resultType === '2')?.odds || 3.5
        };
      }
    }

    return {
      o1: 2.0,
      ox: 3.0,
      o2: 3.5
    };
  } catch (error) {
    console.error(`Error fetching odds for match ${externalMatchId}:`, error.message);
    return {
      o1: 2.0,
      ox: 3.0,
      o2: 3.5
    };
  }
}

export async function fetchTeamStats(externalTeamId, season) {
  try {
    const response = await client.get(`/teams/${externalTeamId}/matches`, {
      params: {
        season,
        status: 'FINISHED'
      }
    });

    const matches = response.data.result || [];

    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let gamesPlayed = 0;

    for (const match of matches) {
      if (match.status === 'FINISHED') {
        gamesPlayed++;
        const score = match.score.fullTime;

        if (match.homeTeam.id === externalTeamId) {
          goalsFor += score.home;
          goalsAgainst += score.away;

          if (score.home > score.away) wins++;
          else if (score.home < score.away) losses++;
          else draws++;
        } else {
          goalsFor += score.away;
          goalsAgainst += score.home;

          if (score.away > score.home) wins++;
          else if (score.away < score.home) losses++;
          else draws++;
        }
      }
    }

    return {
      games_played: gamesPlayed,
      wins,
      draws,
      losses,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      possession_avg: 50,
      shots_per_game: (goalsFor + (gamesPlayed > 0 ? (gamesPlayed * 0.5) : 0)) / Math.max(gamesPlayed, 1)
    };
  } catch (error) {
    console.error(`Error fetching team stats for ${externalTeamId}:`, error.message);
    return null;
  }
}

async function ensureTeam(teamData) {
  try {
    const { data, error } = await (await import('../db/supabase.js')).supabase
      .from('teams')
      .select('id')
      .eq('name', teamData.name)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    return await addTeam(
      teamData.name,
      teamData.id.toString(),
      teamData.area?.name || 'Unknown',
      'Football'
    );
  } catch (error) {
    console.error(`Error ensuring team ${teamData.name}:`, error.message);
    throw error;
  }
}

async function checkMatchExists(externalId) {
  try {
    const { data, error } = await (await import('../db/supabase.js')).supabase
      .from('matches')
      .select('id')
      .eq('external_id', externalId.toString())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error checking match existence:`, error.message);
    return false;
  }
}
