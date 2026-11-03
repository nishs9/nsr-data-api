interface ScatterPlotDataPoint {
    playerId: string;
    playerName: string;
    position: string;
    team: string;
    xValue: number | null;
    yValue: number | null;
}

interface ScatterQueryResult {
    player_id: string;
    player_display_name: string;
    position: string;
    recent_team: string;
    x_value: number | null;
    y_value: number | null;
}

export type { ScatterPlotDataPoint, ScatterQueryResult };