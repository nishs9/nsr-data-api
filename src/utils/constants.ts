// List of available stats from player_stats_season_* tables
// Add or remove column names here as needed
const AVAILABLE_STATS = [
    'completions',
    'attempts',
    'passing_air_yards',
    'passing_yards',
    'passing_epa',
    'passing_tds',
    'comp_pct',
    'sack_rate',
    'rushing_epa',
    'rushing_yards',
    'carries',
    'rushing_tds',
    'receiving_epa',
    'receiving_yards',
    'receptions',
    'targets',
    'receiving_tds',
    'receiving_yards_after_catch',
    'target_share',
    'air_yards_share',
    'racr',
    'wopr',
    'total_turnovers',
    'fantasy_points_ppr',
    'yac_pct',
    'yards_per_carry',
    'yards_per_target',
    'passing_interceptions',
    'games',
    // Add more column names here as needed
  ];

  const VALID_POSITIONS = ["QB", "RB", "WR", "TE"];

  export { AVAILABLE_STATS, VALID_POSITIONS };