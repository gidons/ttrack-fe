import { Add, Delete, Edit, PlayArrow, Refresh } from '@mui/icons-material';
import Download from '@mui/icons-material/Download';
import { Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { DataGrid, GridActionsCellItem, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import React from 'react';
import { useNavigate } from 'react-router';
import { useBackend } from '../backend/useBackend';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import { isTrackUpdating, secondsToHMS, Song, Track } from '../types';
import DownloadZipButton from './DownloadZipButton';
import LoadingComponent from './common/LoadingComponent';
import { TableHeader, TableToolbar } from './common/TableHeader';
import { download } from './utils';

/**
 * This component is intended to be included in the song page, not to be an independent page.
 */

export interface AddTrackDialogProps {
    song: Song,
    isOpen: boolean,
    existingTracks: Track[],
    targetTrackId?: string,
    onClose: (success: boolean) => void
}

interface TrackListProps {
    song: Song;
    title: string;
    typeColumns: GridColDef[];
    fetchTracks: (songId: string) => Promise<Track[]>;
    idProp: string;
    /** The selected track ID, if any */ 
    selected?: string;
    onFoundSelected: (track: Track) => void;
    canDelete: (track: Track) => boolean;
    playButtonPath: string;
    addDialog: (props: AddTrackDialogProps) => JSX.Element;
}

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
        <Box className='vcenter'>
            <Typography>
                {isUpdating ? "updating..." : toUpdatedTime(updated)}
            </Typography>
        </Box>
    )
}

export function TrackList({ 
    song,
    title,
    typeColumns, 
    fetchTracks, 
    selected,
    onFoundSelected,
    playButtonPath,
    canDelete,
    addDialog,
}: TrackListProps) {

    const [isLoading, setIsLoading] = React.useState(true);
    const [tracks, setTracks] = React.useState<Array<Track>>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [addDialogTargetTrackId, setAddDialogTargetTrackId] = React.useState<string|null>(null)
    const navigate = useNavigate();
    const dialogs = useDialogs();
    const backend = useBackend();
    const songClient = backend.song(song.id)

    const idProp = 'trackId';

    const handleDownload = React.useCallback((row) => () => {
        download(row.mediaUrl)
    }, []);

    const handleEdit = React.useCallback((row) => () => {
        setAddDialogTargetTrackId(row.trackId)
        setIsAddDialogOpen(true)
    }, [])
    
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
                setIsLoading(true)
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
                        key="edit-item"
                        icon={<Edit />}
                        label="Edit"
                        disabled={!row.mediaUrl}
                        onClick={handleEdit(row)}
                        />,
                    <GridActionsCellItem
                        key="delete-item"
                        icon={<Delete/>}
                        label="Delete"
                        disabled={!canDelete(row)}
                        onClick={handleRowDelete(row)}
                    />,
                ]},
            },
        ])), [handleDownload, handleEdit, handleRowDelete, canDelete]);

    const loadData = React.useCallback(async () => {
        const fetchedTracks = await fetchTracks(song.id)
        setTracks(fetchedTracks)
        findSelectedTrack()
    }, [setTracks, findSelectedTrack, song])

    const handleAdd = React.useCallback(async () => {
        setAddDialogTargetTrackId(null)
        setIsAddDialogOpen(true)
    }, [setIsAddDialogOpen])

    const handleAddClose = React.useCallback(() => { 
        setIsAddDialogOpen(false)
        setAddDialogTargetTrackId(null)
    }, [setIsAddDialogOpen])

    function findSelectedTrack() {
        if (!selected || isLoading) { return; }
        console.log(`Searching for track with trackId of '${selected}'`);
        const selectedTrack = tracks.find((t) => t.trackId == selected);
        if (selectedTrack) {
            onFoundSelected(selectedTrack);
        }
    }

    React.useEffect(() => { findSelectedTrack() }, [selected, isLoading, tracks, onFoundSelected]);

    return (
        <Stack direction="column" width='100%'>
            {addDialog({ isOpen: isAddDialogOpen, song: song, existingTracks: tracks, targetTrackId: addDialogTargetTrackId, onClose: handleAddClose })}
            <TableHeader>
                <Typography variant="h6">{title}</Typography>
                <TableToolbar>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        {isLoading ? <CircularProgress size={20}/> :
                        <IconButton size="small" aria-label="refresh" onClick={() => setIsLoading(true)}>
                            <Refresh/>
                        </IconButton>}
                    </Tooltip>
                    <DownloadZipButton 
                        songId={song.id}
                        trackIds={tracks.map(t => t.trackId)}
                    />
                    <Button 
                        startIcon={<Add/>}
                        onClick={handleAdd}>
                            Add
                    </Button>
                </TableToolbar>
            </TableHeader>
            <LoadingComponent
                loadData={loadData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}>
                <DataGrid
                    rows={tracks}
                    columns={columns}
                    getRowId={(row) => row[idProp]}
                />
            </LoadingComponent>
        </Stack>
    );
}