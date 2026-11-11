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

  const STAT_QUALIFIERS: Record<string, string> = {
    'QB': "attempts > 150",
    'RB': "carries > 100",
    'WR': "receptions > 15",
    'TE': "receptions > 15"
  }

  const MID_SEASON_STAT_QUALIFIERS: Record<string, string> = {
    'QB': "attempts > 5",
    'RB': "carries > 3",
    'WR': "receptions > 2",
    'TE': "receptions > 2"
  }

  const GAME_LOG_QUERY_COLUMNS = [
    'week', 'opponent_team', 'completions', 'attempts', 'passing_air_yards', 'passing_yards', 
    'passing_epa', 'passing_tds', 'comp_pct', 'sack_rate', 'rushing_epa', 'rushing_yards', 'receiving_epa', 
    'receiving_yards', 'target_share', 'targets', 'air_yards_share', 'racr', 'wopr', 'total_turnovers', 
    'fantasy_points_ppr', 'receptions', 'receiving_tds', 'receiving_yards_after_catch', 
    'carries', 'rushing_tds', 'yac_pct', 'yards_per_carry', 'yards_per_target', 'passing_interceptions'
  ];

  export { AVAILABLE_STATS, VALID_POSITIONS, STAT_QUALIFIERS, 
    MID_SEASON_STAT_QUALIFIERS, GAME_LOG_QUERY_COLUMNS };