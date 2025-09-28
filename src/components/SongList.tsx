import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Song } from '../types';

interface SongListProps {
  songs: Array<Song>;
}

export function SongList({ songs }: SongListProps) {
    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Title', width: 300 },
        { field: 'arranger', headerName: 'Arranger', width: 150 },
        { field: 'key', headerName: 'Key', width: 80 },
        { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80,
            valueFormatter: secondsToHMS
         },
    ];

    function secondsToHMS(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const hDisplay = h > 0 ? h + ":" : "";
        const mDisplay = m > 0 ? m + ":" : "";
        const sDisplay = s.toString().padStart(2, '0');
        return (hDisplay + mDisplay + sDisplay).trim();
    }
    
    return (
        <div style={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={songs}
                columns={columns}
                getRowId={(row) => row.id}
            />
        </div>
    );
}