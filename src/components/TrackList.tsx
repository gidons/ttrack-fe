import { PlayArrow } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { DataGrid, GridActionsCellItem, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import React from 'react';
import { isTrackUpdating, secondsToHMS, Track } from '../types';
import { Button, IconButton, Stack, styled, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import { download } from './utils';
import { useBackend } from '../backend/useBackend';

/**
 * This component is intended to be included in the song page, not to be an independent page.
 */

interface TrackListProps {
    songId: string;
    title: string;
    typeColumns: GridColDef[];
    fetchTracks: (songId: string) => Promise<Track[]>;
    idProp: string;
    /** The selected track ID, if any */ 
    selected?: string;
    onFoundSelected: (track: Track) => void;
    canDelete: (track: Track) => boolean;
    playButtonPath: string;
    // Add action: either a callback or a path to go to
    onAdd?: () => void;
    downloadAll: JSX.Element;
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

function toUpdatedTime(updated: Date): string {
    function unitsAgo(count: number, unit: string) {
        return `${count} ${unit}${count > 1 ? "s" : ""} ago`
    }
    const secAgo = Math.trunc((new Date().getTime() - updated.getTime()) / 1000)
    if (secAgo < 2) {
        return "Just now"
    }
    if (secAgo < 60) {
        return unitsAgo(secAgo, "second")
    }
    const minAgo = Math.trunc(secAgo / 60)
    if (minAgo < 60) {
        return unitsAgo(minAgo, "minute")
    }
    const hoursAgo = Math.trunc(minAgo / 60);
    if (hoursAgo < 24) {
        return unitsAgo(hoursAgo, "hour")
    }
    const daysAgo = Math.trunc(hoursAgo / 24);
    if (daysAgo < 3) {
        return unitsAgo(daysAgo, "day")
    }
    return updated.toLocaleDateString()
}

function renderUpdatedCell(params: GridRenderCellParams<Track>) {
    const track = params.row
    const updated = track.updated
    const isUpdating = isTrackUpdating(track)
    return (
        <Box className='center'>
            <Typography>
                {isUpdating ? "updating..." : toUpdatedTime(updated)}
            </Typography>
        </Box>
    )
}

export function TrackList({ 
    songId,
    title,
    typeColumns, 
    fetchTracks, 
    selected,
    onFoundSelected,
    playButtonPath,
    canDelete,
    onAdd,
    downloadAll
}: TrackListProps) {

    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [tracks, setTracks] = React.useState<Array<Track>>([]);
    const navigate = useNavigate();
    const dialogs = useDialogs();
    const backend = useBackend();
    const songClient = backend.song(songId)

    const idProp = 'trackId';

    const handleDownload = React.useCallback((row) => () => {
        download(row.mediaUrl)
    }, []);
    
    const handleRowDelete = React.useCallback((row: Track) => async() => {
        if (canDelete(row)) {
            const confirmed = await dialogs.confirm(
                `Do you wish to delete ${row.trackId}?`,
                {
                    title: `Delete track?`,
                    severity: 'error',
                    okText: 'Delete',
                    cancelText: 'Cancel',
                },
            );
            if (confirmed) {
                await songClient.deleteTrack(row.url)
                await loadData()
            }
        } else {
            await dialogs.alert(`Track ${row.trackId} may not be deleted at this time.`)
        }
    }, []);
    
    const handleRowPlay = React.useCallback((row: Track) => () => {
        navigate(playButtonPath.replace('{id}', row[idProp]));
    }, [navigate, playButtonPath]);
    
    const columns = React.useMemo<GridColDef[]>(() => (
        ([] as GridColDef[]).concat(
            typeColumns
        ).concat([
            { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80, valueFormatter: secondsToHMS,
                 sortable: false, disableColumnMenu: true },
            { field: 'updated', headerName: 'Updated', type: 'date', width: 140, renderCell: renderUpdatedCell,
                sortable: true, disableColumnMenu: true
             },
            {
                field: 'actions',
                type: 'actions',
                flex: 1,
                align: 'right',
                disableColumnMenu: true,
                getActions: ({row}: GridRowParams) => {
                    return [
                    <GridActionsCellItem
                        key="play-item"
                        icon={<PlayArrow />}
                        label="Play"
                        disabled={!row.mediaUrl}
                        onClick={handleRowPlay(row)}
                    />,
                    <GridActionsCellItem
                        key="download-item"
                        icon={<Download />}
                        label="Download"
                        disabled={!row.mediaUrl}
                        onClick={handleDownload(row)}
                    />,
                    <GridActionsCellItem
                        key="delete-item"
                        icon={<DeleteIcon />}
                        label="Delete"
                        disabled={!canDelete(row)}
                        onClick={handleRowDelete(row)}
                    />,
                ]},
            },
        ])), [handleDownload, handleRowDelete, canDelete]);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const fetchedTracks = await fetchTracks(songId);
            setTracks(fetchedTracks)
            findSelectedTrack();
        } catch (listDataError) {
            setError(listDataError as Error);
        }

        setIsLoading(false);
    }, []);

    const handleRefresh = React.useCallback(() => { 
        if (!isLoading) { loadData() } 
    }, [isLoading, loadData])

    const handleAdd = React.useCallback(async () => {
        onAdd()
        // const created = await onAdd();
        // if (created) {
        //     loadData();
        // }
    }, [onAdd, loadData])

    function findSelectedTrack() {
        if (!selected || isLoading) { return; }
        console.log(`Searching for track with trackId of '${selected}'`);
        const selectedTrack = tracks.find((t) => t.trackId == selected);
        if (selectedTrack) {
            onFoundSelected(selectedTrack);
        }
    }

    React.useEffect(() => { loadData() }, [loadData])
    React.useEffect(() => { findSelectedTrack() }, [selected, isLoading, tracks]);

    return (
        <Stack direction="column">
            <TableHeader>
                <Typography variant="h6">{title}</Typography>
                <TableToolbar>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        <div>
                            <IconButton size="small" aria-label="refresh" onClick={handleRefresh}>
                                <RefreshIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                    { downloadAll }
                    { onAdd ? (
                            <Button 
                                startIcon={<AddIcon/>}
                                onClick={handleAdd}>
                                    Add
                            </Button>
                        ) : (<div/>) 
                    }
                </TableToolbar>
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