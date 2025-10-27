import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { secondsToHMS, type Song } from '../types'
import {
    getMixesForSong,
    getPartsForSong,
    getSong, updateSong, validateSong
} from '../data/songs';
import PageContainer from './PageContainer';
import { TrackList } from './TrackList';

export default function ViewSong() {
    const { songId } = useParams();
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [song, setSong] = React.useState<Song | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const fetchedSong = await getSong(songId);

            setSong(fetchedSong);
        } catch (fetchError) {
            setError(fetchError as Error);
        }
        setIsLoading(false);
    }, [songId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSongEdit = React.useCallback(() => {
        navigate(`/songs/${songId}/edit`);
    }, [navigate, songId]);

    const handleSongDelete = React.useCallback(async () => {
        if (!song) {
            return;
        }

        const confirmed = await dialogs.confirm(
            `Do you wish to delete ${song.title}?`,
            {
                title: `Delete song?`,
                severity: 'error',
                okText: 'Delete',
                cancelText: 'Cancel',
            },
        );

        if (confirmed) {
            setIsLoading(true);
            try {
                alert("TODO: Delete song");
                // await deleteSong(Number(songId));

                navigate('/songs');

                notifications.show('Song deleted successfully.', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } catch (deleteError) {
                notifications.show(
                    `Failed to delete song. Reason:' ${(deleteError as Error).message}`,
                    {
                        severity: 'error',
                        autoHideDuration: 3000,
                    },
                );
            }
            setIsLoading(false);
        }
    }, [song, dialogs, songId, navigate, notifications]);

    const handleBack = React.useCallback(() => {
        navigate('/songs');
    }, [navigate]);

    const renderView = React.useMemo(() => {
        if (isLoading) {
            return (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        m: 1,
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }
        if (error) {
            return (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>
            );
        }

        function makeDisplayField(title: string, value: string) {
            return (
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper sx={{ px: 2, py: 1 }}>
                        <Typography variant="overline">{title}</Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            {value}
                        </Typography>
                    </Paper>
                </Grid>
            );
        }

        return song ? (
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <Grid container spacing={2} sx={{ width: '100%' }}>
                    {makeDisplayField("Title", song.title)}
                    {makeDisplayField("Arranger", song.arranger)}
                    {makeDisplayField("Key", song.key)}
                    {/* {makeDisplayField("Duration", secondsToHMS(song.durationSec))} */}
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Button
                        variant="contained"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleSongEdit}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleSongDelete}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        ) : null;
    }, [
        isLoading,
        error,
        song,
        handleBack,
        handleSongEdit,
        handleSongDelete,
    ]);

    const pageTitle = `Song ${songId}`;

    return (
        <PageContainer
            title={pageTitle}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: pageTitle },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderView}</Box>
            <Divider sx={{ my: 3 }} />
            <Stack
                marginTop={3}
                direction="row"
                spacing={2}
                sx={{ width: '100%' }}>
                <Box flexGrow='1'
                    sx={{ width: '50%' }}>               
                    <Typography variant="h6">Parts</Typography>
                    <TrackList
                        songId={songId}
                        typeColumns={[
                            { field: 'part', headerName: 'Part', type: 'string', width: 80 },
                        ]}
                        fetchTracks={getPartsForSong}
                        idProp="part"
                    />
                </Box>
                <Box flexGrow='1'>
                    <Typography variant="h6">Mixes</Typography>
                    <TrackList
                        songId={songId}
                        typeColumns={[
                            { field: 'name', headerName: 'Mix', type: 'string', width: 160 },
                        ]}
                        fetchTracks={getMixesForSong}
                        idProp="name"
                    />
                </Box>
            </Stack>
        </PageContainer>
    );
}
