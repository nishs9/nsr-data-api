import type { PlayerStats, StatDefinition, AggregatedRow, PassMapData } from '../types/player.ts';
import { Database } from 'sqlite';

// Helper function to define which stats to show for each position
export function getStatsForPositionPercentile(position: string): string[] {
  const positionStats: Record<string, string[]> = {
    'QB': ['passing_air_yards', 'passing_yards', 'passing_adot', 'passing_epa', 'comp_pct', 'sack_rate', 'rushing_epa', 'rushing_yards', 'pacr', 'total_turnovers', 'fantasy_points_ppr'],
    'RB': ['rushing_epa', 'rushing_yards', 'carries', 'yards_per_carry', 'receiving_epa', 'receiving_yards', 'target_share', 'air_yards_share', 'wopr', 'total_turnovers', 'fantasy_points_ppr'],
    'WR': ['receiving_epa', 'receiving_yards', 'target_share', 'air_yards_share', 'racr', 'wopr', 'total_turnovers', 'fantasy_points_ppr', 'yac_pct', 'receiving_adot'],
    'TE': ['receiving_epa', 'receiving_yards', 'target_share', 'air_yards_share', 'racr', 'wopr', 'total_turnovers', 'fantasy_points_ppr', 'yac_pct', 'receiving_adot']
  };
  return positionStats[position] || ['games', 'offensive_snaps', 'defensive_snaps'];
}    

// Helper function returning a collection of StatDefinitions for a given position
export function getStatsForPosition(position: string): StatDefinition[] {
  const positionStatsMap: Record<string, StatDefinition[]> = {
      'QB': [
      { key: 'passing_epa', label: 'Passing EPA', description: 'The total expected points added by the QB on pass plays', higherIsBetter: true },
      { key: 'rushing_epa', label: 'Rushing EPA', description: 'The total expected points added on rushing plays', higherIsBetter: true },
      { key: 'passing_yards', label: 'Passing Yards', description: 'Total passing yards on completions', higherIsBetter: true },
      { key: 'rushing_yards', label: 'Rushing Yards', description: 'Total rushing yards on carries', higherIsBetter: true },
      { key: 'comp_pct', label: 'Completion %', description: 'Percentage of passes completed', higherIsBetter: true },
      { key: 'pacr', label: 'PACR', description: 'Passing Air Conversion Ratio: Passing Yards / Air Yards', higherIsBetter: true },
      { key: 'passing_air_yards', label: 'Air Yards', description: 'Total air yards on all passing attempts', higherIsBetter: true },
      { key: 'passing_adot', label: 'ADOT', description: 'Average Depth of Target: Passing Air Yards / Attempts', higherIsBetter: true },
      { key: 'sack_rate', label: 'Sack Rate', description: 'Percentage of dropbacks where the QB was sacked', higherIsBetter: false },
      { key: 'total_turnovers', label: 'Total Turnovers', description: 'Total turnovers', higherIsBetter: false },
      { key: 'fantasy_points_ppr', label: 'Fantasy Points (PPR)', description: 'Fantasy points per game in PPR scoring', higherIsBetter: true }
      ],
      'RB': [
      { key: 'rushing_epa', label: 'Rushing EPA', description: 'The total expected points added on rushing plays', higherIsBetter: true },
      { key: 'rushing_yards', label: 'Rushing Yards', description: 'Total rushing yards', higherIsBetter: true },
      { key: 'carries', label: 'Carries', description: 'Total number of rushing attempts', higherIsBetter: true },
      { key: 'yards_per_carry', label: 'Yards Per Carry', description: 'Average rushing yards per rushing attempt', higherIsBetter: true },
      { key: 'receiving_epa', label: 'Receiving EPA', description: 'The total expected points added by the receiver on pass plays', higherIsBetter: true },
      { key: 'receiving_yards', label: 'Receiving Yards', description: 'Total receiving yards', higherIsBetter: true },
      { key: 'target_share', label: 'Target Share', description: 'Percentage share of team targets', higherIsBetter: true },
      { key: 'wopr', label: 'WOPR', description: 'Weighted Opportunity Rate: 1.5 * Target Share + 0.7 * Air Yard Share', higherIsBetter: true },
      { key: 'total_turnovers', label: 'Total Turnovers', description: 'Total turnovers', higherIsBetter: false },
      { key: 'fantasy_points_ppr', label: 'Fantasy Points (PPR)', description: 'Fantasy points per game in PPR scoring', higherIsBetter: true }
      ],
      'WR': [
      { key: 'receiving_epa', label: 'Receiving EPA', description: 'The total expected points added by the receiver on pass plays', higherIsBetter: true },
      { key: 'receiving_yards', label: 'Receiving Yards', description: 'Total receiving yards', higherIsBetter: true },
      { key: 'target_share', label: 'Target Share', description: 'Percentage share of team targets', higherIsBetter: true },
      { key: 'air_yards_share', label: 'Air Yards Share', description: 'Percentage share of team air yards', higherIsBetter: true },
      { key: 'racr', label: 'RACR', description: 'Receiving Air Conversion Ratio: Receiving Yards / Air Yards', higherIsBetter: true },
      { key: 'wopr', label: 'WOPR', description: 'Weighted Opportunity Rate: 1.5 * Target Share + 0.7 * Air Yard Share', higherIsBetter: true },
      { key: 'yac_pct', label: 'YAC %', description: 'Percentage of total receiving yards that came after the catch', higherIsBetter: true },
      { key: 'receiving_adot', label: 'ADOT', description: 'Average Depth of Target: Receiving Air Yards / Targets', higherIsBetter: true },
      { key: 'total_turnovers', label: 'Total Turnovers', description: 'Total turnovers', higherIsBetter: false },
      { key: 'fantasy_points_ppr', label: 'Fantasy Points (PPR)', description: 'Fantasy points per game in PPR scoring', higherIsBetter: true },
      ],
      'TE': [
      { key: 'receiving_epa', label: 'Receiving EPA', description: 'The total expected points added by the receiver on pass plays', higherIsBetter: true },
      { key: 'receiving_yards', label: 'Receiving Yards', description: 'Total receiving yards', higherIsBetter: true },
      { key: 'target_share', label: 'Target Share', description: 'Percentage share of team targets', higherIsBetter: true },
      { key: 'air_yards_share', label: 'Air Yards Share', description: 'Percentage share of team air yards', higherIsBetter: true },
      { key: 'racr', label: 'RACR', description: 'Receiving Air Conversion Ratio: Receiving Yards / Air Yards', higherIsBetter: true },
      { key: 'wopr', label: 'WOPR', description: 'Weighted Opportunity Rate: 1.5 * Target Share + 0.7 * Air Yard Share', higherIsBetter: true },
      { key: 'yac_pct', label: 'YAC %', description: 'Percentage of total receiving yards that came after the catch', higherIsBetter: true },
      { key: 'receiving_adot', label: 'ADOT', description: 'Average Depth of Target: Receiving Air Yards / Targets', higherIsBetter: true },
      { key: 'total_turnovers', label: 'Total Turnovers', description: 'Total turnovers', higherIsBetter: false },
      { key: 'fantasy_points_ppr', label: 'Fantasy Points (PPR)', description: 'Fantasy points per game in PPR scoring', higherIsBetter: true },
      ]
  };

  // Default stats if position not found
  return positionStatsMap[position] || [
      { key: 'games', label: 'Games Played', higherIsBetter: true }
  ];
}

export async function calculatePercentiles(
    db: unknown,
    playerStats: PlayerStats,
    position: string, 
    season: number, 
    statsToCalculate: string[]
  ): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  
  // Cast db to the expected type when using it
  const dbConnection = db as Database; 

  for (const stat of statsToCalculate) {
    if (playerStats[stat] === undefined) continue;
    
    const percentileQuery = `
      SELECT
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM player_stats_season_${season} WHERE position = ? AND ${stat} IS NOT NULL AND season_type = 'REG'))
        AS percentile
      FROM player_stats_season_${season}
      WHERE position = ? AND ${stat} IS NOT NULL AND ${stat} < ? AND season_type = 'REG'
    `;
    
    // Use dbConnection instead of db for database operations
    const percentileResult = await dbConnection.get(percentileQuery, [position, position, playerStats[stat]]);
    
    if (percentileResult) {
      result[stat] = Math.round(percentileResult.percentile);
    }
  }
  
  return result;
}

export function initializePassMapData(): PassMapData {
    const data: PassMapData = {};

    const distances = ['short', 'medium', 'medium_long', 'long'];
    const locations = ['left', 'middle', 'right'];

    for (const distance of distances) {
        for (const location of locations) {
        const key = `${distance}_${location}`;
        data[key] = {
            completions: 0,
            attempts: 0,
            completionPct: null,
            airYards: 0,
            passingYards: 0,
            passingAirEpa: 0,
            airEpaPerPlay: null,
            totalPassingEpa: 0,
            totalPassingEpaPerPlay: null,
            touchdowns: 0,
            interceptions: 0
        };
        }
    }
    return data;
}
  
export function processAggregatedData(rows: AggregatedRow[]): PassMapData {
    const passMapData = initializePassMapData();
    for (const row of rows) {
        const key = `${row.distance_category}_${row.location_category}`;
        if (passMapData[key]) {
            passMapData[key] = {
                completions: row.completions || 0,
                attempts: row.attempts || 0,
                completionPct: row.attempts > 0 
                ? Math.round((row.completions / row.attempts) * 1000) / 10 
                : null,
                airYards: row.air_yards || 0,
                passingYards: row.passing_yards || 0,
                passingAirEpa: row.passing_air_epa || 0,
                airEpaPerPlay: row.attempts > 0 
                ? row.passing_air_epa / row.attempts 
                : null,
                totalPassingEpa: row.total_passing_epa || 0,
                totalPassingEpaPerPlay: row.attempts > 0 
                ? row.total_passing_epa / row.attempts 
                : null,
                touchdowns: row.touchdowns || 0,
                interceptions: row.interceptions || 0
            };
        }
    }
    return passMapData;
}