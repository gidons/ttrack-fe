import * as React from 'react';
import { MixTrack, NULL_STEREO_MIX, PartTrack, Song, StereoMix } from '../types';
import { createMixTrack, getDefaultMixesForSong, getMixesForSong, getSong } from '../data/songs';
import { useParams } from 'react-router';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography } from '@mui/material';
import StereoMixView from './StereoMixView';

export interface CreateMixDialogProps {
    open: boolean;
    onClose: (newTrack?: MixTrack) => void;
    song: Song;
}

export default function CreateMixDialog({ open, onClose, song }: CreateMixDialogProps) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [defaultMixes, setDefaultMixes] = React.useState<StereoMix[]>([]);
    const [existingMixes, setExistingMixes] = React.useState<StereoMix[]>([]);
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(NULL_STEREO_MIX);
    const [trackName, setTrackName] = React.useState('');
    const [createdTrack, setCreatedTrack] = React.useState<Partial<MixTrack>>({});
    const [isCustomMix, setIsCustomMix] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            console.log(`Loading dialog data for song ${song.id}`);
            const fetchedMixes = await getMixesForSong(song.id);
            setExistingMixes(fetchedMixes.map((t) => t.mix));

            const fetchedDflMixes = await getDefaultMixesForSong(song.id);
            setDefaultMixes(fetchedDflMixes);
        } catch (fetchError) {
            setError(fetchError as Error);
        }
        setIsLoading(false);
    }, [song]);

    // Fetch on creation. We shouldn't have to refresh during the lifetime of the dialog.
    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleClose = () => {
        // TODO validate
        onClose(createdTrack as MixTrack);
    }

    const handleSelectedMixChange = React.useCallback(
        (e: SelectChangeEvent<HTMLSelectElement>) => {
            const selectedMixName = e.target.value.toString();
            console.log(`Mix name changed to '${selectedMixName}'`)
            if (selectedMixName == 'custom') {
                // TODO generate full mix locally
                const fullMix = defaultMixes.find((m) => m.name == 'Full Mix');
                const customMix: StereoMix = { ...fullMix, name: "custom" };
                console.log(`Setting mix to custom full: ${JSON.stringify(customMix)}`);
                setCurrentMix(customMix);
                setIsCustomMix(true);
                setTrackName('');
            } else {
                const selectedMix = defaultMixes.find((m) => m.name == selectedMixName);
                if (selectedMix && (selectedMix != currentMix)) {
                    console.log(`Setting mix to ${JSON.stringify(selectedMix)}`)
                    setCurrentMix(selectedMix);
                    setIsCustomMix(false);
                    setTrackName(n => n || selectedMix.name);
                } else {
                    console.log("Mix not found.");
                }
            }
        }, [setCurrentMix, setIsCustomMix, isLoading, defaultMixes]
    )

    const handleTrackNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // console.log(`onChange: ${e.target.value}`)
        setTrackName(e.target.value);
    }, [setCreatedTrack]);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            setIsSubmitting(true);
            const mix: StereoMix = { ...currentMix, name: trackName }
            console.log("Creating track with mix: " + JSON.stringify(mix));
            try {
                await createMixTrack(song.id, mix, isCustomMix);
            } catch(e) {
                event.preventDefault();
                setError(e as Error);
            } finally {
                setIsSubmitting(false);
            }
        }, [trackName, currentMix, isSubmitting, setIsSubmitting]
    );

    const view = (() => {
        if (isLoading || isSubmitting) {
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
        } else if (error) {
            return  (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>
            );
        } else {
            return (
                <Stack spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <FormControl fullWidth>
                            <InputLabel id="mix-name-label">Mix</InputLabel>
                            <Select
                                value={currentMix?.name ?? ''}
                                onChange={handleSelectedMixChange as SelectProps['onChange']}
                                labelId="mix-name-label"
                                name="mix"
                                label="Mix"
                                fullWidth
                            >
                                {defaultMixes.map((m) => 
                                    <MenuItem value={m.name}>{m.name}</MenuItem>
                                )}
                                <MenuItem value="custom">Custom</MenuItem>
                            </Select>
                            {/* <FormHelperText>{formErrors.key ?? ' '}</FormHelperText> */}
                        </FormControl>
                        <FormControl fullWidth>
                            <TextField 
                                name='trackName'
                                value={trackName}
                                aria-label='Track Name'
                                label='Track Name'
                                disabled={!isCustomMix}
                                onChange={handleTrackNameChange}
                            />
                        </FormControl>
                    </Grid>
                    {/* Note: each mix view has to have its own key to allow for separate states. */}
                    <StereoMixView key={`stereomix-view-${currentMix?.name ?? 'null'}`} mix={currentMix} isEditable={isCustomMix}/>
                </Stack>
            );
        }
    })();

    return (<Dialog 
        sx={{ width: '100%' }} 
        open={open} 
        onClose={handleClose}
        slotProps={{
            paper: {
                component: 'form',
                onSubmit: handleSubmit
            }
        }}
        >
        <DialogTitle>
            <Typography variant='h5'>Create new mix for <em>{song?.title??"..."}</em></Typography>
        </DialogTitle>
        <DialogContent>
            <Box sx={{margin: 1}}>
                {view}
            </Box>
        </DialogContent>
        <DialogActions>
            <Button disabled={!open}>Cancel</Button>
            <Button disabled={!open} loading={isLoading || isSubmitting} type="submit">OK</Button>
        </DialogActions>
    </Dialog>)

}