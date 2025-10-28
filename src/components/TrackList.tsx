import { PlayArrow } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add'
import Download from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowParams } from '@mui/x-data-grid';
import React from 'react';
import { getDownloadUrl } from '../data/songs';
import { secondsToHMS, Track } from '../types';
import { Button, Stack, styled, Typography } from '@mui/material';
import { useNavigate } from 'react-router';


/**
 * This component is intended to be included in the song page, not to be an independent page.
 */

interface TrackListProps {
    songId: string;
    title: string;
    typeColumns: GridColDef[];
    fetchTracks: (songId: string) => Promise<Track[]>;
    idProp: string;
    onPlay: (track) => void;
    addButtonPath?: string;
}

const TableHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}));

const TableToolbar = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(1),
  // Ensure the toolbar is always on the right side, even after wrapping
  marginLeft: 'auto',
}));

export function TrackList({ 
    songId,
    title,
    typeColumns, 
    fetchTracks, 
    idProp,
    // TODO pass a player control? 
    onPlay,
    addButtonPath
}: TrackListProps) {

    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [tracks, setTracks] = React.useState<Array<Track>>([]);
    const navigate = useNavigate();

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
    
    const handleRowPlay = React.useCallback((row) => () => {
        onPlay(row);
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
                        icon={<PlayArrow />}
                        label="Play"
                        onClick={handleRowPlay(row)}
                    />,
                    <GridActionsCellItem
                        key="download-item"
                        icon={<Download />}
                        label="Download"
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
        <Stack direction="column">
            <TableHeader>
                <Typography variant="h6">{title}</Typography>
                { addButtonPath ? (
                    <TableToolbar>
                        <Button 
                            startIcon={<AddIcon/>}
                            onClick={() => { navigate(addButtonPath) }}
                        >Add</Button>
                    </TableToolbar>
                ) : (<div/>) 
                }
            </TableHeader>
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
        </Stack>
    );
}