import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataGrid, GridActionsCellItem, GridColDef, GridEventListener, GridRowParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router';
import { secondsToHMS, Song, Track } from '../types';
import { getDownloadUrl } from '../data/songs'


/**
 * This component is intended to be included in the song page, not to be an independent page.
 */

interface TrackListProps {
    songId: string;
    typeColumns: GridColDef[];
    fetchTracks: (songId: string) => Promise<Track[]>;
    idProp: string;
}

export function TrackList({ songId, typeColumns, fetchTracks, idProp }: TrackListProps) {

    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [tracks, setTracks] = React.useState<Array<Track>>([])

    const columns = React.useMemo<GridColDef[]>(() => (
        ([] as GridColDef[]).concat(
            typeColumns
        ).concat([
            { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80, valueFormatter: secondsToHMS },
            { field: 'mediaUrl', headerName: 'Download', renderCell: ({value}) => (<a href={getDownloadUrl(value)} download>Download</a>) }
        // TODO add actions: edit, delete
        ])), []);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const fetchedTracks = await fetchTracks(songId);
            setTracks(fetchedTracks)
        } catch (listDataError) {
            setError(listDataError as Error);
        }

        setIsLoading(false);
    }, []);

    const handleRefresh = React.useCallback(() => { 
        if (!isLoading) { loadData() } 
    }, [isLoading, loadData])
    function handleCreateClick() { return <Alert severity="info">Creating</Alert> }

    React.useEffect(() => { loadData() }, [loadData])

    return (
        <Box sx={{ flex: 1, width: '100%' }}>
            {error ? (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>
            ) : (
                <DataGrid
                    rows={tracks}
                    columns={columns}
                    getRowId={(row) => row[idProp]}
                />
            )}
        </Box>
    );
}