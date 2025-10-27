import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Download from '@mui/icons-material/Download';
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
    const [tracks, setTracks] = React.useState<Array<Track>>([]);

    const handleDownload = React.useCallback((row) => () => {
        const link = document.createElement('a');
        link.href = getDownloadUrl(row.mediaUrl);
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);
    
    const handleRowDelete = React.useCallback((row) => () => {
        alert(`Deleting track ID ${row.id}`);
    }, []);
    
    const columns = React.useMemo<GridColDef[]>(() => (
        ([] as GridColDef[]).concat(
            typeColumns
        ).concat([
            { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80, valueFormatter: secondsToHMS, sortable: false },
            {
                field: 'actions',
                type: 'actions',
                flex: 1,
                align: 'right',
                getActions: ({row}: GridRowParams) => {
                    return [
                    <GridActionsCellItem
                        key="download-item"
                        icon={<Download />}
                        label="Edit"
                        onClick={handleDownload(row)}
                    />,
                    <GridActionsCellItem
                        key="delete-item"
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={handleRowDelete(row)}
                    />,
                ]},
            },
        ])), [handleDownload, handleRowDelete]);

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