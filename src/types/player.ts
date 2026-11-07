// Definition for a single statistic category
export interface StatDefinition {
    key: string;
    label: string;
    description?: string;
    higherIsBetter?: boolean;
}

// Player stats (raw values for a season)
export interface PlayerStats {
    [key: string]: string | number | null | undefined; 
}

export interface CellStats {
    completions: number;
    attempts: number;
    completionPct: number | null;
    airYards: number;
    passingYards: number;
    passingAirEpa: number;
    airEpaPerPlay: number | null;
    totalPassingEpa: number;
    totalPassingEpaPerPlay: number | null;
    touchdowns: number;
    interceptions: number;
}
  
export interface PassMapData {
    // key format: "{distance}_{location}"
    [key: string]: CellStats;
}
  
export interface AggregatedRow {
    distance_category: string;
    location_category: string;
    completions: number;
    attempts: number;
    air_yards: number;
    passing_yards: number;
    passing_air_epa: number;
    total_passing_epa: number;
    touchdowns: number;
    interceptions: number;
}