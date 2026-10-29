import express, { type Express, type Request, type Response } from 'express';
import {initDb, getDbConn } from './init.ts';

const port = process.env.PORT || 3000;
const app: Express = express();

app.use(express.json());

await initDb();
const db_conn = await getDbConn();
await db_conn.get('SELECT 1');

app.listen(port, () => {
    console.log('Server is running on port ' + port);
});

app.get('/', async (req, res) => {
    res.status(200).send('Welcome to the nfl-stats-radar Data API!');
});

app.get('/api/search/:query', async (req, res) => {
    const searchQuery = req.params.query;
    console.log('The search query was: ' + searchQuery)
    const playerSearch = await db_conn.all(
        `SELECT player_id, player_display_name
        FROM player_stats_season_2026
        WHERE player_display_name LIKE ?
        LIMIT 10`,
        [`%${req.params.query}%`],
    )
    res.json(playerSearch);
})