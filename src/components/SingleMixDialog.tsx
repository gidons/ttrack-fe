import { Alert, Box, Button, DialogActions, FormControl, Grid, InputLabel, Link, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { fullMixForParts, MixTrack, NULL_STEREO_MIX, Song, stereoMix, StereoMix, Track } from "../types";
import StereoMixView from "./StereoMixView";
import { useBackend } from "../backend/useBackend";
import { AddMixDialogProps } from "./MixDialog";

export function SingleMixDialog({song, targetTrackId, existingTracks, onSwitchMode, onClose} : AddMixDialogProps) {
    console.log(`SingleMixDialog: start render; song=${song?.id}`);

    const INITIAL_CUSTOM_MIX: StereoMix = {...NULL_STEREO_MIX, name: "custom"};

    // Is this an edit of an existing track or creation of a new track?
    const isEdit = !!targetTrackId
    const targetTrack = existingTracks.find(t => t.trackId == targetTrackId) as (MixTrack | null)
    const editError = (isEdit && !targetTrack) ? new Error(`Track ${targetTrackId} not found. Please refresh the page.`) : null

    const [isLoading, setIsLoading] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<Error>(editError);
    const [defaultMixes, setDefaultMixes] = React.useState<StereoMix[]>([]);
    const [existingMixNames, setExistingMixNames] = React.useState(new Set<string>())
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(
        targetTrack?.mix ?? INITIAL_CUSTOM_MIX
    );
    const [customTrackName, setCustomTrackName] = React.useState(
        targetTrack?.mix.name ?? 'Custom'
    );
    const [isCustomMix, setIsCustomMix] = React.useState(true);

    const backend = useBackend()
    const songClient = backend.song(song.id)

    const reset = React.useCallback(() => {
        console.log("Resetting.")
        setDefaultMixes([])
        setExistingMixNames(new Set())
        setCurrentMix(INITIAL_CUSTOM_MIX)
        setCustomTrackName('Custom')
        setIsCustomMix(true)
    }, 
    [setDefaultMixes, setExistingMixNames, setCurrentMix, setCustomTrackName, setIsCustomMix])

    const loadData = React.useCallback(async () => {
        if (!song || isEdit) { return }
        console.log(`Loading dialog data for song ${song.id}`);
        setIsLoading(true)
        try {
            const parts = await songClient.listParts();
            if (currentMix.parts.length != parts.length) {
                setCurrentMix(fullMixForParts("custom", parts.map(pt => pt.part)))
            }
            const fetchedMixes = await songClient.listMixes();
            console.log(`Existing mix names: ${[...existingMixNames].join()}`);
            setExistingMixNames(new Set(fetchedMixes.map(m => m.mix.name)))
            const fetchedDflMixes = await songClient.listDefaultMixes();
            setDefaultMixes(fetchedDflMixes);
        } catch (fetchError) {
            console.error(`fetchError: ${fetchError}`)
            setError(fetchError as Error);
        } finally {
            setIsLoading(false)
        }
    }, [song, isEdit, setDefaultMixes, setError]);

    React.useEffect(() => { 
        loadData() 
    }, [loadData, song])

    const trackName = React.useMemo(() => isCustomMix ? customTrackName : currentMix.name, [isCustomMix, currentMix])

    const handleCancel = React.useCallback(async () => {
        reset()
        onClose(false)
    }, [onClose]);

    const handleSelectedMixChange = React.useCallback(
        (e: SelectChangeEvent<HTMLSelectElement>) => {
            const selectedMixName = e.target.value.toString();
            // console.log(`Mix name changed to '${selectedMixName}'`)
            if (selectedMixName == 'custom') {
                // TODO generate full mix locally
                const fullMix = defaultMixes.find((m) => m.name == 'Full Mix');
                const customMix: StereoMix = { ...fullMix, name: "custom" };
                console.log(`Setting mix to custom full: ${JSON.stringify(customMix)}`);
                setCurrentMix(customMix);
                setIsCustomMix(true);
            } else {
                const selectedMix = defaultMixes.find((m) => m.name == selectedMixName);
                if (selectedMix && (selectedMix != currentMix)) {
                    console.log(`Setting mix to ${JSON.stringify(selectedMix)}`)
                    setCurrentMix(selectedMix);
                    setIsCustomMix(false);
                } else {
                    console.log("Mix not found.");
                }
            }
        }, [setCurrentMix, setIsCustomMix, defaultMixes]
    )

    const handleTrackNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        console.log(`handleTrackNameChange: '${e.target.value}'`)
        setCustomTrackName(e.target.value);
    }, [setCustomTrackName]);

    const handleSubmit = React.useCallback(async () => {
        const mix: StereoMix = { ...currentMix, name: trackName }
        console.log("Creating track with mix: " + JSON.stringify(mix));
        try {
            setIsSubmitting(true)
            const created = await songClient.createMix(mix, isCustomMix, isEdit);
            console.log("Created track: " + JSON.stringify(created));
            onClose(true)
            reset()
        } catch(e) {
            setError(e as Error);
            throw e;
        } finally {
            setIsSubmitting(false)
        }
    }, [song, trackName, currentMix, setIsSubmitting]);

    return (
        <Stack spacing={1}>
            <Typography variant="h6">Create new mix for <em>{song?.title??"..."}</em></Typography>
            {isEdit || <Link onClick={onSwitchMode}>Switch to Bulk Mode</Link>}
            {error && (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>)}
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', padding: 1 }}>
                {!isEdit && 
                <FormControl fullWidth>
                    <InputLabel id="mix-name-label">Mix</InputLabel>
                    <Select
                        value={currentMix?.name ?? 'custom'}
                        onChange={handleSelectedMixChange as SelectProps['onChange']}
                        labelId="mix-name-label"
                        name="mix"
                        label="Mix"
                        disabled={isEdit}
                        fullWidth
                    >
                        {defaultMixes
                            .filter(m => !existingMixNames.has(m.name))
                            .map(m => 
                            <MenuItem key={`mix-${m.name}`} value={m.name}>{m.name}</MenuItem>
                        )}
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                </FormControl>}
                <FormControl fullWidth>
                    <TextField 
                        name='trackName'
                        value={isCustomMix ? customTrackName : currentMix.name}
                        aria-label='Track Name'
                        label='Track Name'
                        disabled={!isCustomMix || isEdit}
                        onChange={handleTrackNameChange}
                    />
                </FormControl>
            </Grid>
            <DialogActions sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Button onClick={handleCancel}>
                    Cancel
                </Button>
                <Button 
                    variant="contained"
                    color="primary"
                    loading={isSubmitting}
                    disabled={isLoading /* || !isValid()*/} 
                    onClick={handleSubmit}
                    type="submit">
                    {isEdit ? "Save" : "Create"}
                </Button>
            </DialogActions>
            {/* Note: each mix view has to have its own key to allow for separate states. */}
            <StereoMixView 
                key={`stereomix-view-${currentMix?.name ?? 'null'}`} 
                mix={currentMix} 
                isEditable={isCustomMix}
                onMixChange={setCurrentMix}/>
        </Stack>
    )

}

