import { Close } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router';
import { useBackend } from '../backend/useBackend';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { STD_VOICING_LIST, stereoMix, trackName, type Song, type Track } from '../types';
import KeyField from './common/KeyField';
import { MixDialog } from './MixDialog';
import PageContainer from './common/PageContainer';
import StandardForm from './common/StandardForm';
import StereoMixView from './common/StereoMixView';
import { TrackList } from './TrackList';
import { UploadPartDialog } from './UploadPartDialog';
import SongDataList from './SongDataList';


export default function ViewSong() {

    const { songId, part: selectedPart, mixName: selectedMixName } = useParams();

    const backend = useBackend();
    const songClient = backend.song(songId);
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [song, setSong] = React.useState<Partial<Song> | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [selectedTrack, setSelectedTrack] = React.useState<Track>(null);
    
    const isNewSong = songId == 'new'
    const isEditingSong = window.location.pathname.includes('edit') || isNewSong;

    if (selectedTrack && !selectedMixName && !selectedPart) {
        setSelectedTrack(null)
    }

    const loadData = React.useCallback(async () => {
        setError(null);
        if (isNewSong) {
            setIsLoading(false)
            setSong({})
            return
        }
        setIsLoading(true);

        try {
            const fetchedSong = await songClient.get();

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
        navigate(`/songs/${songId}/edit`)
    }, [navigate]);

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

    const handleEditSubmit = React.useCallback(async (formValues) => {
        if (isNewSong) {
            const newSong = await backend.createSong(formValues);
            navigate(`/songs/${newSong.id}`)
        } else {
            setSong(await songClient.update({ ...formValues, id: isNewSong ? null : songId, eTag: isNewSong ? null : song.eTag}));
            navigate(`/songs/${songId}`)
        }
    }, [song, isNewSong, setSong, navigate])
    
    const handleFoundSelected = React.useCallback((track: Track) => {
        console.log("Setting selected track to: " + JSON.stringify(track));
        setSelectedTrack(track);
    }, [setSelectedTrack]);

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

        return song ? (
            <StandardForm<Song>
                initialValues={song}
                submitButtonLabel='Save'
                cancelButtonLabel='Cancel'
                onSubmit={handleEditSubmit}
                onCancel={() => { navigate(`/songs/${isNewSong ? "" : songId}`) }}
                // TODO add validation
                validate={(song: Partial<Song>) => { return {} }}
                editable={isEditingSong}
                fields={[
                    {name: "title", displayName: "Title", smSize: 6},
                    {name: "shortTitle", displayName: "Short Title", smSize: 6},
                    {name: "arranger", displayName: "Arranger", smSize: 4},
                    {name: "key", displayName: "Key", smSize: 4, type: KeyField, options: {
                        A: "A", 
                        Bb: "B♭",
                        B: "B",
                        C: "C",
                        "C#": "C♯" 
                    }},
                    {name: "voicing", displayName: "Voicing", smSize: 4, options: 
                        Object.fromEntries(STD_VOICING_LIST.map(v => ([v.name, v.displayName])))
                    }
                ]}
                actionButtons={(
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
                </Stack>)}
            />
        ) : null;
    }, [
        isLoading,
        error,
        song,
        isEditingSong,
        handleBack,
        handleSongEdit,
        handleSongDelete,
    ]);

    const mix = React.useMemo(() => stereoMix(selectedTrack), [selectedTrack]);
    const showTracks = !isNewSong && !isLoading

    return (
        <PageContainer
            title={isLoading ? "Loading..." : isNewSong ? "New Song" : `${song.title}`}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: isLoading ? "Loading..." : isNewSong ? "New" : `${song.title}` },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderView}</Box>
            <Divider sx={{ my: 3 }} />
            <Stack
                marginTop={3}
                direction="row"
                spacing={2}
                sx={{ width: '100%' }}>
                {showTracks &&
                <Stack 
                    spacing={2}
                    sx={{ width: '50%' }}>
                    <TrackList
                        song={song as Song}
                        title="Parts"
                        typeColumns={[
                            { field: 'part', headerName: 'Part', type: 'string', width: 80 },
                        ]}
                        fetchTracks={() => songClient.listParts()}
                        idProp="part"
                        selected={selectedPart}
                        // TODO [SCRUM-38] allow deletion of parts that aren't included in a mix
                        canDelete={() => false}
                        onFoundSelected={handleFoundSelected}
                        playButtonPath={`/songs/${songId}/part/{id}/play`}
                        addDialog={UploadPartDialog}
                    />
                    <SongDataList song={song as Song}/>
                </Stack>}
                {showTracks &&
                <Box sx={{ width: '50%' }}>
                    <TrackList
                        song={song as Song}
                        title="Mixes"
                        typeColumns={[
                            { field: 'trackId', headerName: 'Mix', type: 'string', width: 160 },
                        ]}
                        fetchTracks={() => songClient.listMixes().then(l => l.filter(t => t.trackId != 'All'))}
                        idProp="name"
                        selected={selectedMixName}
                        onFoundSelected={handleFoundSelected}
                        canDelete={(track: Track) => track.trackId != 'All'}
                        playButtonPath={`/songs/${songId}/mix/{id}/play`}
                        addDialog={MixDialog}
                    />
                </Box>}
            </Stack>
            { selectedTrack && (
                <Stack
                    sx={{ width: '100%', justifyContent: "center", alignItems: 'center' }}
                    spacing={2}
                    padding={2}
                >
                    <Typography variant="h6">Now playing: {trackName(selectedTrack)}</Typography>
                    <Button startIcon={<Close/>} onClick={() => navigate(`/songs/${songId}`)}>Close</Button>
                    <audio style={{ width: "500px" }} controls autoPlay src={backend.url(selectedTrack.mediaUrl)} />
                    <Box sx={{ width: '50%' }}><StereoMixView mix={mix} /></Box>
                </Stack>
            )}
        </PageContainer>
    );
}
