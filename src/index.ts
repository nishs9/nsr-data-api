import express, { type Express } from 'express';
import {initDb, getDbConn } from './init.ts';
import type { ScatterPlotDataPoint, ScatterQueryResult } from './types/scatter-plot.ts';
import type { AggregatedRow } from "./types/player.ts";
import { calculatePercentiles, getStatsForPosition, getStatsForPositionPercentile, processAggregatedData } from './utils/helpers.ts';
import { AVAILABLE_STATS, VALID_POSITIONS, STAT_QUALIFIERS, MID_SEASON_STAT_QUALIFIERS } from './utils/constants.ts';

const port = process.env.PORT || 3000;
const app: Express = express();

app.use(express.json());

await initDb();
// TODO: Get rid of this shared connection this is just temporary 
const db_conn = await getDbConn();
await db_conn.get('SELECT 1');

app.listen(port, () => {
    console.log('Server is running on port ' + port);
});

app.get('/', async (req, res) => {
    return res.status(200).send('Welcome to the nfl-stats-radar Data API!');
});

app.get('/api/search/:query', async (req, res) => {
    try {
        const searchTerm = req.params.query;
        console.log('The search term was: ' + searchTerm)

        // DB query to find players across all seasons, prioritizing most recent appearances
        const searchQuery = `
        WITH RankedPlayers AS (
            SELECT player_id, player_display_name, recent_team, season,
                ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY season DESC) as rn
            FROM ( SELECT player_id, player_display_name, recent_team, 2026 as season FROM player_stats_season_2026
            UNION ALL SELECT player_id, player_display_name, recent_team, 2025 FROM player_stats_season_2025
            UNION ALL SELECT player_id, player_display_name, recent_team, 2024 FROM player_stats_season_2024
            UNION ALL SELECT player_id, player_display_name, recent_team, 2023 FROM player_stats_season_2023
            UNION ALL SELECT player_id, player_display_name, recent_team, 2022 FROM player_stats_season_2022
            UNION ALL SELECT player_id, player_display_name, recent_team, 2021 FROM player_stats_season_2021
            UNION ALL SELECT player_id, player_display_name, recent_team, 2020 FROM player_stats_season_2020
            UNION ALL SELECT player_id, player_display_name, recent_team, 2019 FROM player_stats_season_2019
            UNION ALL SELECT player_id, player_display_name, recent_team, 2018 FROM player_stats_season_2018
            UNION ALL SELECT player_id, player_display_name, recent_team, 2017 FROM player_stats_season_2017
            UNION ALL SELECT player_id, player_display_name, recent_team, 2016 FROM player_stats_season_2016
            UNION ALL SELECT player_id, player_display_name, recent_team, 2015 FROM player_stats_season_2015
            UNION ALL SELECT player_id, player_display_name, recent_team, 2014 FROM player_stats_season_2014
            UNION ALL SELECT player_id, player_display_name, recent_team, 2013 FROM player_stats_season_2013
            UNION ALL SELECT player_id, player_display_name, recent_team, 2012 FROM player_stats_season_2012
            UNION ALL SELECT player_id, player_display_name, recent_team, 2011 FROM player_stats_season_2011
            UNION ALL SELECT player_id, player_display_name, recent_team, 2010 FROM player_stats_season_2010
            UNION ALL SELECT player_id, player_display_name, recent_team, 2009 FROM player_stats_season_2009
            UNION ALL SELECT player_id, player_display_name, recent_team, 2008 FROM player_stats_season_2008
            UNION ALL SELECT player_id, player_display_name, recent_team, 2007 FROM player_stats_season_2007
            UNION ALL SELECT player_id, player_display_name, recent_team, 2006 FROM player_stats_season_2006
            UNION ALL SELECT player_id, player_display_name, recent_team, 2005 FROM player_stats_season_2005
            UNION ALL SELECT player_id, player_display_name, recent_team, 2004 FROM player_stats_season_2004
            UNION ALL SELECT player_id, player_display_name, recent_team, 2003 FROM player_stats_season_2003
            UNION ALL SELECT player_id, player_display_name, recent_team, 2002 FROM player_stats_season_2002
            UNION ALL SELECT player_id, player_display_name, recent_team, 2001 FROM player_stats_season_2001
            UNION ALL SELECT player_id, player_display_name, recent_team, 2000 FROM player_stats_season_2000
            UNION ALL SELECT player_id, player_display_name, recent_team, 1999 FROM player_stats_season_1999
            )
        )
        SELECT player_id, player_display_name, recent_team
        FROM RankedPlayers
        WHERE rn = 1 AND player_display_name LIKE ?
        ORDER BY player_display_name
        LIMIT 10;
        `;

        const playerSearch = await db_conn.all(
            searchQuery,
            [`%${req.params.query}%`],
        )
        return res.json(playerSearch);
    } catch (error) {
        console.error("Player search errored out for an unexpected reason" + error)
        return res.status(500).json({error: 'Player search errored out for an unexpected reason!'})
    }
});

app.get('/api/power-rankings', async (req, res) => {
    try {
        if (req.query.week) {
            const week = Number(req.query.week);
            if (isNaN(week) || week < 1) {
                const errMsg = "Invalid value passed in for week: " + week
                console.error(errMsg);
                return res.status(400).json({ error: errMsg })
            }
            const rankingsQuery = `
            SELECT 
                r.team,
                t.team_name,
                t.team_logo_squared,
                r.games_played,
                r.wins,
                r.losses,
                r.win_pct,
                round(r.comp_rpi * 100, 3) as comp_rpi,
                r.rpi_rank
            FROM historical_rpi_data r
            LEFT JOIN teams t ON r.team = t.team_abbr
            WHERE r.week = ?
            ORDER BY r.rpi_rank
            `;
            
            const weekRankings = await db_conn.all(rankingsQuery, [week]);
            return res.status(200).json({ rankings: weekRankings, week });
        } else {
            const rankingsQuery = `
                SELECT 
                    r.team,
                    t.team_name,
                    t.team_logo_squared,
                    r.games_played,
                    r.wins,
                    r.losses,
                    r.win_pct,
                    round(r.comp_rpi * 100, 3) as comp_rpi,
                    r.rpi_rank
                FROM historical_rpi_data r
                LEFT JOIN teams t ON r.team = t.team_abbr
                WHERE r.week = (SELECT MAX(week) FROM historical_rpi_data)
                ORDER BY r.rpi_rank
            `;
            
            const latestRankings = await db_conn.all(rankingsQuery);
            return res.status(200).json({ rankings: latestRankings });
        }
    } catch (error) {
        const errMsg = "Error encountered while fetching power rankings"
        console.error(errMsg, error)
        return res.status(500).json({ error: errMsg })
    }
});

app.get('/api/power-rankings/historical', async (req, res) => {
    try {
        const rawTeams = req.query.teams;
        console.log(rawTeams)
        if (!rawTeams) {
            const errMsg = "No teams were passed in with the historical power rankings request"
            console.error(errMsg);
            return res.status(400).json({ error: errMsg });
        }

        if (typeof rawTeams !== 'string') {
            const errMsg = "A valid teams query parameter is required";
            console.error(errMsg);
            return res.status(400).json({ error: errMsg })
        }

        const teams = rawTeams?.split(',').map(t => t.trim()).filter(t => t);
        if (teams.length === 0) {
            const errMsg = "Error while parsing team input";
            console.error(errMsg);
            return res.status(400).json({ error: errMsg })
        }

        const teamPlaceholders = teams.map(() => '?').join(',');
        const rpiQuery = `
            SELECT 
            r.team,
            t.team_name,
            t.team_logo_squared,
            r.week,
            r.rpi_rank,
            r.comp_rpi
            FROM historical_rpi_data r
            LEFT JOIN teams t ON r.team = t.team_abbr
            WHERE r.team IN (${teamPlaceholders})
            ORDER BY r.week, r.rpi_rank
        `;
        const historicalRpiResults = await db_conn.all(rpiQuery, teams);
        return res.json( { data: historicalRpiResults })
    } catch (error) {
        const errMsg = "Encountered an unexpected error while fetching historical RPI rankings!";
        console.error(errMsg, error);
        return res.status(500).json({ error: errMsg });
    }
});  

app.get('/api/scatter-plot', async (req, res) => {
    try {
        // Check for all required parameters in query string and
        // ensure they pass some simple validations
        if (!req.query.season || !req.query.xStat || !req.query.yStat) {
            const errMsg = "Missing one or more required parameters: {season, xStat, yStat}";
            console.error(errMsg);
            return res.status(400).json({error: errMsg});
        }
        const season = Number(req.query.season);
        const xStat = String(req.query.xStat);
        const yStat = String(req.query.yStat);

        let positions = String(req.query.positions);
        if (positions === "undefined") {
            positions = "QB";
        }

        if (isNaN(season) || season < 1999 || season > 2026) {
            const errMsg = "Invalid season. Must be between 1999 and 2026"
            console.error(errMsg);
            return res.status(400).json({error: errMsg});
        }

        if (!AVAILABLE_STATS.includes(xStat) || !AVAILABLE_STATS.includes(yStat) ) {
            const errMsg = "Invalid statistic passed in for at least one of the axes";
            console.error(errMsg);
            return res.status(400).json({error: errMsg});
        }

        // Make sure DB table exists + some prep tasks before we query
        const tableName = `player_stats_season_${season}`;
        const doesTableExist = await db_conn.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
        );
        if (!doesTableExist) {
            const errMsg = `Data not available for the ${season}`;
            console.error(errMsg);
            return res.status(404).json({error: errMsg});
        }

        let selectedPositions: string[] = [];
        if (positions) {
            selectedPositions = positions.split(',').map(p => p.trim()).filter(p => p.length > 0);
            const invalidPositions = selectedPositions.filter(p => !VALID_POSITIONS.includes(p));
            console.log(selectedPositions, invalidPositions);
            if (invalidPositions.length > 0) {
                const errMsg = `Invalid positions passed in: ${invalidPositions.join(", ")}. 
                                Valid positions are: ${VALID_POSITIONS.join(", ")}`;
                console.error(errMsg);
                res.status(400).json({error: errMsg});
            }
        }

        // Prepare final query
        let query = `
            SELECT 
                player_id,
                player_display_name,
                position,
                recent_team,
                ${xStat} as x_value,
                ${yStat} as y_value
            FROM ${tableName}
            WHERE season_type = 'REG'
                AND ${xStat} IS NOT NULL
                AND ${yStat} IS NOT NULL
                AND position IN ('QB', 'RB', 'WR', 'TE')
        `
        const queryParams: string[] = [];
        if (selectedPositions.length > 0) {
            const placeholders = selectedPositions.map(() => `?`).join(',');
            query += ` AND position IN (${placeholders})`;
            queryParams.push(...selectedPositions);
        }
        query += ` ORDER BY player_display_name`;
        const scatterResults = await db_conn.all(query, queryParams);
        const dataPoints: ScatterPlotDataPoint[] = (scatterResults as ScatterQueryResult[]).map((row) => ({
            playerId: row.player_id,
            playerName: row.player_display_name,
            position: row.position,
            team: row.recent_team,
            xValue: row.x_value,
            yValue: row.y_value,
        }));

        return res.status(200).json({
            dataPoints,
            metadata: {
                season,
                xStat,
                yStat,
                positions: selectedPositions.length > 0 ? selectedPositions : ['all'],
                totalPoints: dataPoints.length,
            },
            availableStats: AVAILABLE_STATS,
        });
    } catch (error) {
        console.error("Error in scatter plot API: ", error);
        return res.status(500).json({error: "Internal server error"});
    }
});

app.get('/api/stats/comparison', async(req, res) => {
    try {
        console.log(req.query);
        if (!req.query.position || !req.query.season || !req.query.statType) {
            const errMsg = "Missing required parameters in payload: position, season, and/or statType";
            console.error(errMsg);
            return res.status(400).json({error:errMsg});
        }
        const position = String(req.query.position);
        const season = Number(req.query.season);
        const statType = String(req.query.statType);
        const playerId = req.query.playerId;

        // Make sure DB table exists + some prep tasks before we query
        const tableName = `player_stats_season_${season}`;
        const doesTableExist = await db_conn.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
        );
        if (!doesTableExist) {
            const errMsg = `Data not available for the ${season}`;
            console.error(errMsg);
            return res.status(404).json({error: errMsg});
        }

        // Validate that the requested statistic exists for the given season
        // (needed because some stats like air yards and EPA don't appear in older data)
        const tableInfo = await db_conn.all(`PRAGMA table_info(${tableName})`);
        const validColumns = tableInfo.map(col => col.name);

        if (!validColumns.includes(statType)) {
            const errMsg = `Invalid stat type passed in: ${statType}`;
            console.error(errMsg);
            return res.status(400).json({error:errMsg});
        }

        // Get the requested stat's UI label + the correct stat qualifiers
        const statDefinitions = getStatsForPosition(position);
        const statDef = statDefinitions.find(def => def.key === statType);
        const statLabel = statDef?.label || statType;
        const qualifier = season === 2026 ? MID_SEASON_STAT_QUALIFIERS[position] : STAT_QUALIFIERS[position];

        // Query to get the target player and qualifying players
        const query = `
            SELECT 
                player_id, player_display_name, ${statType}
            FROM ${tableName}
            WHERE 
                player_id = ? 
                AND season_type = 'REG'
            UNION
            SELECT 
                player_id, player_display_name, ${statType}
            FROM ${tableName}
            WHERE 
                position = ? 
                AND ${statType} IS NOT NULL 
                AND season_type = 'REG'
                AND ${qualifier}
            ORDER BY ${statType} DESC
        `;
        const raw_players = await db_conn.all(query, [playerId, position]);
        const ret_players = raw_players.map(player => ({
            playerId: player.player_id,
            name: player.player_display_name,
            value: player[statType],
        }));
        return res.status(200).json(
            {
                players: ret_players,
                metadata: {
                    position,
                    season,
                    statType,
                    statLabel,
                },
            }
        );
    } catch (error) {
        const errMsg = "Unexpected error encountered while fetching player stat comparison: " + error;
        console.error(errMsg);
        return res.status(500).json({error:errMsg});
    }
});

app.get('/api/player/:playerId', async (req, res) => {
    try {
        if (!req.params.playerId) {
            const errMsg = "Player ID is a require parameters!"
            console.error(errMsg);
            return res.status(400).json({error:errMsg});
        }
        const playerId = req.params.playerId;

        let season: number = NaN;
        if (req.query.season) {
            season = Number(req.query.season);
            if (season > 2026 || season < 1999) {
                const errMsg = "Season should be between 1999-2026. Not: " + season;
                console.error(errMsg);
                return res.status(400).json({error:errMsg});
            }
        }
        
        const years = Array.from({ length: 2026 - 1999 + 1 }, (_, i) => 2026 - i);
        const playerInfoUnionQueries = years.map( (year) => { 
                return `
                    SELECT 
                        player_id, player_display_name, 
                        position, recent_team, headshot_url, 
                        ${year} as season 
                    FROM player_stats_season_${year} 
                    WHERE 
                        player_id = ? 
                        AND season_type = 'REG'`; 
            }
        )
        .join('\nUNION ALL ');

        const playerInfoQuery = `
            SELECT 
                player_id, player_display_name, position, 
                recent_team, headshot_url, season,
                ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY season DESC) as rn 
            FROM (${playerInfoUnionQueries}) 
            ORDER BY season DESC`;

        const queryParams = Array(years.length).fill(playerId);
        const playerInfo = await db_conn.get(playerInfoQuery, queryParams);
        if (!playerInfo) {
            const errMsg = `No player data found for player id: ${playerId}`;
            console.error(errMsg);
            return res.status(404).json({error:errMsg});
        }

        const seasonsUnionQueries = years.map((year) => {
                return `
                    SELECT ${year} as season 
                    FROM player_stats_season_${year} 
                    WHERE player_id = ? AND season_type = 'REG'`
            }
        )
        .join('\nUNION ALL ');
        
        const seasonsQuery = `
            SELECT DISTINCT season 
            FROM (${seasonsUnionQueries})
            ORDER BY season DESC`;

        const seasonQueryParams = Array(years.length).fill(playerId);
        const seasonsResult = await db_conn.all(seasonsQuery, seasonQueryParams);
        const seasons = seasonsResult.map((s: { season: number }) => s.season);

        // Default to the most recent season if not specified
        const targetSeason = season || (seasons.length > 0 ? seasons[0] : null);

        // If no valid season is found, return just the bare minimum player info
        if (!targetSeason) {
            return res.json({
                playerInfo,
                seasons,
                stats: null,
                percentiles: null
            });
        }

        // Get player stats for the resolved target season
        const statsQuery = `SELECT * FROM player_stats_season_${targetSeason} WHERE player_id = ? AND season_type = 'REG'`;
        const playerStats = await db_conn.get(statsQuery, [playerId]);

        // If player stats for the given season exist, calculate the percentiles
        let percentileStats = null;
        if (playerStats) {
            const position = playerStats.position;
            const positionStats = getStatsForPositionPercentile(position)
            if (positionStats.length > 0) {
                percentileStats = await calculatePercentiles(db_conn, playerStats, position, targetSeason, positionStats);
            }
        }

        const columnsToQuery = ['season', 'recent_team', 'games', 'completions', 'attempts', 'passing_air_yards', 'passing_yards', 
            'passing_epa', 'passing_tds', 'comp_pct', 'sack_rate', 'rushing_epa', 'rushing_yards', 'receiving_epa', 'receiving_yards', 'target_share', 
            'air_yards_share', 'racr', 'wopr', 'total_turnovers', 'fantasy_points_ppr', 'receptions', 'targets', 'receiving_tds', 'receiving_yards_after_catch', 
            'carries', 'rushing_tds', 'yac_pct', 'yards_per_carry', 'yards_per_target', 'interceptions'];
      
        // Get career stats for all seasons
        const careerStatsUnionQueries = years
            .map(
                (year) =>
                `SELECT ${columnsToQuery.join(', ')} FROM player_stats_season_${year} WHERE player_id = ? AND season_type = 'REG'`
            )
            .join('\nUNION ALL ');
        const careerStatsQuery = `SELECT ${columnsToQuery.join(', ')} FROM (${careerStatsUnionQueries}) ORDER BY season DESC`;
    
        const careerStatsQueryParams = Array(years.length).fill(playerId);
        const careerStats = await db_conn.all(careerStatsQuery, careerStatsQueryParams);
        return res.json({
            playerInfo,
            seasons,
            stats: playerStats,
            percentiles: percentileStats,
            careerStats
        })
    } catch (error) {
        const errMsg = "Unexpected error encountered while fetching player stats: " + error;
        console.error(errMsg);
        return res.status(500).json({error:errMsg});
    }
});

app.get('/api/player/:playerId/pass-map', async (req, res) => {
    if (!req.params.playerId || !req.query.season) {
        const errMsg = "Player ID and Season are required inputs!";
        console.error(errMsg);
        return res.status(400).json({error:errMsg});
    }
    const playerId = String(req.params.playerId);
    const season = Number(req.query.season);
    if (season < 2010 || season > 2026) {
        const errMsg = "Pass maps are only available from 2010 to the present day. You passed in " + season;
        console.error(errMsg);
        return res.status(400).json({error:errMsg});
    }
    
    let startWeek: number | null = null;
    let endWeek: number | null = null;
    if (req.query.weekStart) {
        startWeek = Number(req.query.weekStart);
        if (isNaN(startWeek) || startWeek < 1 || startWeek > 18) {
            const errMsg = "Starting week must be a number and between 1 and 18 (inclusive)!";
            console.error(errMsg);
            return res.status(400).json({error:errMsg});
        }
    }
    if (req.query.weekEnd) {
        endWeek = Number(req.query.weekEnd);
        if (isNaN(endWeek) || endWeek < 1 || endWeek > 18) {
            const errMsg = "Ending week must be a number and between 1 and 18 (inclusive)!";
            console.error(errMsg);
            return res.status(400).json({error:errMsg});
        }
    }
    if (startWeek !== null && endWeek !== null && startWeek > endWeek) {
        const errMsg = `Starting week should be less than the end week: Start: ${startWeek} // End: ${endWeek}`;
        console.error(errMsg);
        return res.status(400).json({error:errMsg});
    }

    try {
        // Validate that we have a play-by-play table available
        // for the given season
        const tableExistsQuery = `
            SELECT name from sqlite_master
            WHERE type='table' AND name=?
        `;
        const tableExists = await db_conn.get(tableExistsQuery, [`play_by_play_${season}`]);
        if (!tableExists) {
            const errMsg = "Play-by-play data not available for " + season;
            console.error(errMsg);
            return res.status(404).json({error:errMsg});
        }
    } catch (error) {
        const errMsg = "Encountered an unexpected error while checking table existence: " + error;
        console.error(errMsg);
        return res.status(500).json({error:errMsg});
    }

    // Construct the pass map query
    const whereConditions = [
        "play_type = 'pass'",
        "passer_player_id = ?",
        "season_type = 'REG'",
        "pass_location IS NOT NULL",
        "air_yards IS NOT NULL"
    ];
    const queryParams: (string | number)[] = [playerId];

    // Account for week bounds if they were passed in the request
    if (startWeek !== null && endWeek !== null) {
        whereConditions.push("week >= ? AND week <= ?");
        queryParams.push(startWeek, endWeek);
    } else if (startWeek !== null) {
        whereConditions.push("week >= ?");
        queryParams.push(startWeek);
    } else if (endWeek !== null) {
        whereConditions.push("week <= ?");
        queryParams.push(endWeek);
    }

    const query = `
      SELECT 
        CASE 
          WHEN air_yards <= 5 THEN 'short'
          WHEN air_yards <= 10 THEN 'medium'
          WHEN air_yards <= 15 THEN 'medium_long'
          ELSE 'long'
        END as distance_category,
        LOWER(pass_location) as location_category,
        SUM(CASE WHEN complete_pass = 1 THEN 1 ELSE 0 END) as completions,
        COUNT(CASE WHEN pass_attempt = 1 AND sack = 0 THEN 1 END) as attempts,
        SUM(CASE WHEN pass_attempt = 1 AND sack = 0 THEN COALESCE(air_yards, 0) ELSE 0 END) as air_yards,
        SUM(CASE WHEN pass_attempt = 1 AND sack = 0 THEN COALESCE(yards_gained, 0) ELSE 0 END) as passing_yards,
        SUM(CASE WHEN pass_attempt = 1 AND sack = 0 THEN COALESCE(air_epa, 0) ELSE 0 END) as passing_air_epa,
        SUM(CASE WHEN pass_attempt = 1 AND sack = 0 THEN COALESCE(qb_epa, 0) ELSE 0 END) as total_passing_epa,
        SUM(CASE WHEN pass_touchdown = 1 THEN 1 ELSE 0 END) as touchdowns,
        SUM(CASE WHEN interception = 1 THEN 1 ELSE 0 END) as interceptions
      FROM play_by_play_${season}
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY distance_category, location_category
    `;

    let aggregatedRows: AggregatedRow[];
    let passMapData;
    let totalPlays;
    try {
        aggregatedRows = await db_conn.all(query, queryParams) as AggregatedRow[];
        passMapData = processAggregatedData(aggregatedRows);
        totalPlays = aggregatedRows.reduce((sum, row) => sum + row.attempts, 0);
    } catch (queryError) {
        const errMsg = "Error encountered while querying + processing pbp data: " + queryError;
        console.error(errMsg);
        return res.status(500).json({error:errMsg});
    }

    return res.status(200).json({
        passMapData,
        season,
        totalPlays,
        weekStart: startWeek,
        weekEnd: endWeek
    });
});

app.get('/api/player/:playerId/game-logs', async (req, res) => {

});