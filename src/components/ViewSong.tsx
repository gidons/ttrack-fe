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
import { isMixTrack, MixTrack, stereoMix, StereoMix, trackName, type Song, type Track } from '../types'
import {
    getDownloadUrl,
    getMixesForSong,
    getPartsForSong,
    getSong, updateSong, validateSong
} from '../data/songs';
import PageContainer from './PageContainer';
import { TrackList } from './TrackList';
import StereoMixView from './StereoMixView';
import { useTrackDialogs } from './trackDialogs';

export default function ViewSong() {
    const { songId, part: selectedPart, mixName: selectedMixName } = useParams();
    console.log("Selected: mix=%s part=%s", selectedMixName, selectedPart);
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const { openCreateMixDialog, openUploadPartDialog } = useTrackDialogs();
    const notifications = useNotifications();

    const [song, setSong] = React.useState<Song | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [selectedTrack, setSelectedTrack] = React.useState<Track>(null);

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

    const handleFoundSelected = React.useCallback((track: Track) => {
        console.log("Setting selected track to: " + JSON.stringify(track));
        setSelectedTrack(track);
    }, [setSelectedTrack]);

    const handleAddMix = React.useCallback(async () => {
        if (!song) {
            return;
        }
        console.log("Opening mix dialog");
        const createdTrack = await openCreateMixDialog(song);
        console.log("Created track: " + JSON.stringify(createdTrack));
        loadData();
    }, [song, loadData]);

    const handleAddPart = React.useCallback(async () => {
        if (!song) { return }
        const createdTrack = await openUploadPartDialog(song);
        console.log("Created track: " + JSON.stringify(createdTrack));
        loadData();
    }, [song, loadData]);

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

    const mix = stereoMix(selectedTrack);

    const partTracksList = <TrackList
        songId={songId}
        title="Parts"
        typeColumns={[
            { field: 'part', headerName: 'Part', type: 'string', width: 80 },
        ]}
        fetchTracks={getPartsForSong}
        idProp="part"
        selected={selectedPart}
        onFoundSelected={handleFoundSelected}
        playButtonPath={`/songs/${songId}/part/{id}`} 
        onAdd={handleAddPart}/>;

    const mixTracksList = <TrackList
        songId={songId}
        title="Mixes"
        typeColumns={[
            { field: 'trackId', headerName: 'Mix', type: 'string', width: 160 },
        ]}
        fetchTracks={getMixesForSong}
        idProp="name"
        selected={selectedMixName}
        onFoundSelected={handleFoundSelected}
        playButtonPath={`/songs/${songId}/mix/{id}`}
        onAdd={handleAddMix} />;
        
    const playerView = selectedTrack ? (
        <Stack
            sx={{ width: '100%', justifyContent: "center", alignItems: 'center' }}
            spacing={2}
            padding={2}
        >
            <Typography variant="h6">Now playing: {trackName(selectedTrack)}</Typography>
            <audio style={{ width: "500px" }} controls autoPlay src={getDownloadUrl(selectedTrack.mediaUrl)} />
            <Box sx={{width:'50%'}}><StereoMixView mix={mix}/></Box>
        </Stack>
    ) : (<div />);

    return (
        <PageContainer
            title={isLoading ? "Loading..." : `${song.title}`}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: isLoading ? "Loading..." : `${song.title}` },
            ]}
        >
            {/* <CreateMixDialog open={addMixDialogOpen} onClose={handleAddMixClose} song={song}/> */}
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderView}</Box>
            <Divider sx={{ my: 3 }} />
            <Stack
                marginTop={3}
                direction="row"
                spacing={2}
                sx={{ width: '100%' }}>
                <Box flexGrow='1'
                    sx={{ width: '50%' }}>               
                    {partTracksList}
                </Box>
                <Box flexGrow='1'>
                    {mixTracksList}
                </Box>
            </Stack>
            { playerView }
        </PageContainer>
    );
}
