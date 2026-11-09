import { Close } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import { useBackend } from '../../backend/useBackend';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import { STD_VOICING_LIST, stereoMix, trackName, type Song, type Track } from '../../types';
import KeyField from '../common/KeyField';
import StandardForm from '../common/StandardForm';
import StereoMixView from '../common/StereoMixView';
import { MixDialog } from './MixDialog';
import SongDataList from './SongDataList';
import { TrackList } from './TrackList';
import { UploadPartDialog } from './UploadPartDialog';
import { SongPageContext } from './SongPage';

export interface ViewOrEditSongProps {
    isEditingSong?: boolean
}

export default function ViewOrEditSong({ isEditingSong=false }: ViewOrEditSongProps) {

    const { songId, part: selectedPart, mixName: selectedMixName } = useParams();
    const { songState: [song, setSong], reload, asyncData, reloadAsyncData, setChildProps } = useOutletContext<SongPageContext>()

    if (song.id != songId) {
        throw new Error(`Unexpected discrepancy: song ID from params (${songId}) is different from passed song (${song.id})`)
    }

    const backend = useBackend();
    const songClient = backend.song(songId);
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [isSaving, setIsSaving] = React.useState(false)
    const [selectedTrack, setSelectedTrack] = React.useState<Track>(null);
    
    if (selectedTrack && !selectedMixName && !selectedPart) {
        setSelectedTrack(null)
    }

    React.useEffect(() => {
        setChildProps({})
    }, [])

    // This component also serves the part/mix "play" routes. The edit page is a sibling
    // of those routes, so the path must be absolute: a relative one would resolve
    // underneath the current play route (e.g. .../mix/<name>/play/edit), which doesn't exist.
    const handleSongEdit = React.useCallback(() => {
        navigate(`/songs/${songId}/edit`)
    }, [navigate, songId]);

    const handleSongDelete = React.useCallback(async () => {
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
            setIsSaving(true);
            try {
                await songClient.delete();

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
            setIsSaving(false);
        }
    }, [song, dialogs, songId, navigate, notifications]);

    const handleBack = React.useCallback(() => {
        navigate('..');
    }, [navigate]);

    const handleEditSubmit = React.useCallback(async (formValues) => {
        const merged = await songClient.update({ ...formValues, id: songId, eTag: song.eTag})
        // const noNulls = Object.fromEntries(Object.entries(newSong).filter(e => e[1] != null))
        // const merged = { ...song, ...noNulls }
        console.log(`Merged song: ${JSON.stringify(merged)}`)
        setSong(merged)
        navigate(`/songs/${songId}`)
    }, [song, songClient, setSong, navigate])
    
    const handleFoundSelected = React.useCallback((track: Track) => {
        console.log("Setting selected track to: " + JSON.stringify(track));
        setSelectedTrack(track);
    }, [setSelectedTrack]);

    const songForm = React.useMemo(() => 
        <StandardForm<Song>
            initialValues={song}
            submitButtonLabel='Save'
            cancelButtonLabel='Cancel'
            onSubmit={handleEditSubmit}
            onCancel={() => { navigate('..') }}
            // TODO add validation
            validate={(song: Partial<Song>) => { return {} }}
            editable={isEditingSong}
            fields={[
                {name: "title", displayName: "Title", smSize: 6},
                {name: "shortTitle", displayName: "Short Title", smSize: 6},
                {name: "arranger", displayName: "Arranger", smSize: 4},
                {name: "key", displayName: "Key", smSize: 4, type: KeyField},
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
                        loading={isSaving}
                        startIcon={<DeleteIcon />}
                        onClick={handleSongDelete}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>)}/>
    , [
        song,
        isEditingSong,
        handleBack,
        handleSongEdit,
        handleSongDelete,
    ]);

    const mix = React.useMemo(() => stereoMix(selectedTrack), [selectedTrack]);

    return (
        <Stack>
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{songForm}</Box>
            <Divider sx={{ my: 3 }} />
            <Stack
                marginTop={3}
                direction="row"
                spacing={2}
                sx={{ width: '100%' }}>
                <Stack 
                    spacing={2}
                    sx={{ width: '50%' }}>
                    <TrackList
                        song={song as Song}
                        title="Parts"
                        typeColumns={[
                            { field: 'part', headerName: 'Part', type: 'string', width: 80 },
                        ]}
                        trackPromise={asyncData.parts}
                        reloadTracks={() => reloadAsyncData('parts')}
                        idProp="part"
                        selected={selectedPart}
                        // TODO [SCRUM-38] allow deletion of parts that aren't included in a mix
                        canDelete={() => false}
                        onFoundSelected={handleFoundSelected}
                        playButtonPath={`/songs/${songId}/part/{id}/play`}
                        addDialog={UploadPartDialog}
                    />
                    <SongDataList song={song as Song} dataPromise={asyncData.text} reloadData={() => reloadAsyncData('text')}/>
                </Stack>
                <Box sx={{ width: '50%' }}>
                    <TrackList
                        song={song as Song}
                        title="Mixes"
                        typeColumns={[
                            { field: 'trackId', headerName: 'Mix', type: 'string', width: 160 },
                        ]}
                        trackPromise={asyncData.mixes.then(l => l.filter(t => t.trackId != 'All'))}
                        reloadTracks={() => reloadAsyncData('mixes')}
                        idProp="name"
                        selected={selectedMixName}
                        onFoundSelected={handleFoundSelected}
                        canDelete={(track: Track) => track.trackId != 'All'}
                        playButtonPath={`/songs/${songId}/mix/{id}/play`}
                        addDialog={MixDialog}
                    />
                </Box>
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
        </Stack>
    );
}
