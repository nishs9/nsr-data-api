import type { PlayerStats } from '../types/player.ts';
import { Database } from 'sqlite';

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