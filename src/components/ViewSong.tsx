import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    getDownloadUrl,
    getMixesForSong,
    getPartsForSong,
    getSong,
    updateSong
} from '../data/songs';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { STD_VOICING_LIST, STD_VOICINGS, stereoMix, trackName, type Song, type Track } from '../types';
import { MixDialog } from './MixDialog';
import PageContainer from './PageContainer';
import StereoMixView from './StereoMixView';
import { TrackList } from './TrackList';
import { UploadPartDialog } from './UploadPartDialog';
import { IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon, FolderZip as FolderZipIcon } from '@mui/icons-material';
import { download } from './utils';
import DownloadZipButton from './DownloadZipButton';
import StandardForm from './StandardForm';


type DialogName = "createMix" | "uploadPart" | "";

export default function ViewSong() {

    const { songId, part: selectedPart, mixName: selectedMixName } = useParams();
    // console.log("Selected: mix=%s part=%s", selectedMixName, selectedPart);
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [song, setSong] = React.useState<Song | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [selectedTrack, setSelectedTrack] = React.useState<Track>(null);
    const [openDialog, setOpenDialog] = React.useState<DialogName>("");
    const [isEditingSong, setIsEditingSong] = React.useState(false);

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
        // navigate(`/songs/${songId}/edit`);
        console.log(`handleSongEdit`)
        setIsEditingSong(true);
    }, [setIsEditingSong]);

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
        setSong(await updateSong({ ...formValues, id: songId, eTag: song.eTag }));
        setIsEditingSong(false)
    }, [song, setSong, setIsEditingSong])
    
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

        function makeDisplayField(title: string, value: string, smSize: number = 6) {
            return (
                <Grid size={{ xs: 12, sm: smSize }}>
                    <Paper sx={{ px: 2, py: 1 }}>
                        <Typography variant="overline">{title}</Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            {value}&nbsp;
                        </Typography>
                    </Paper>
                </Grid>
            );
        }

        return song ? (
            <StandardForm<Song>
                initialValues={song}
                submitButtonLabel='Save'
                cancelButtonLabel='Cancel'
                onSubmit={handleEditSubmit}
                onCancel={() => { setIsEditingSong(false) }}
                validate={(song: Partial<Song>) => { return {} }}
                editable={isEditingSong}
                fields={[
                    {name: "title", displayName: "Title", smSize: 6},
                    {name: "shortTitle", displayName: "Short Title", smSize: 6},
                    {name: "arranger", displayName: "Arranger", smSize: 4},
                    {name: "key", displayName: "Key", smSize: 4, options: {
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

    return (
        <PageContainer
            title={isLoading ? "Loading..." : `${song.title}`}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: isLoading ? "Loading..." : `${song.title}` },
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
                    {openDialog == "uploadPart" && <UploadPartDialog
                        song={song}
                        onClose={() => { setOpenDialog("")}}
                        />}
                    <TrackList
                        songId={songId}
                        title="Parts"
                        typeColumns={[
                            { field: 'part', headerName: 'Part', type: 'string', width: 80 },
                        ]}
                        fetchTracks={getPartsForSong}
                        idProp="part"
                        selected={selectedPart}
                        // TODO [SCRUM-38] allow deletion of parts that aren't included in a mix
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        canDelete={(track: Track) => false}
                        onFoundSelected={handleFoundSelected}
                        playButtonPath={`/songs/${songId}/part/{id}`}
                        onAdd={() => setOpenDialog("uploadPart")}
                        downloadAll={
                            <Tooltip title="Download all-part WAV">
                                <IconButton size="small" onClick={() => download(song.allPartsMediaUrl)}>
                                    <DownloadIcon/>
                                </IconButton>
                            </Tooltip>
                        }
                    />
                </Box>
                <Box flexGrow='1'>
                    {openDialog == "createMix" && <MixDialog
                        song={song}
                        onClose={() => setOpenDialog("")}
                    />}
                    <TrackList
                        songId={songId}
                        title="Mixes"
                        typeColumns={[
                            { field: 'trackId', headerName: 'Mix', type: 'string', width: 160 },
                        ]}
                        fetchTracks={getMixesForSong}
                        idProp="name"
                        selected={selectedMixName}
                        onFoundSelected={handleFoundSelected}
                        canDelete={(track: Track) => track.trackId != 'All'}
                        playButtonPath={`/songs/${songId}/mix/{id}`}
                        onAdd={() => setOpenDialog("createMix")}
                        downloadAll={
                            <DownloadZipButton 
                                songId={songId}
                                hoverTitle='Download a zip file with all mixes'
                            />}
                    />
                </Box>
            </Stack>
            { selectedTrack ? (
                <Stack
                    sx={{ width: '100%', justifyContent: "center", alignItems: 'center' }}
                    spacing={2}
                    padding={2}
                >
                    <Typography variant="h6">Now playing: {trackName(selectedTrack)}</Typography>
                    <audio style={{ width: "500px" }} controls autoPlay src={getDownloadUrl(selectedTrack.mediaUrl)} />
                    <Box sx={{ width: '50%' }}><StereoMixView mix={mix} /></Box>
                </Stack>
            ) : (<div />) }
        </PageContainer>
    );
}
