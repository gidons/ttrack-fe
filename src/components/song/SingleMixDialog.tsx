import { Alert, Box, Button, DialogActions, FormControl, Grid, InputLabel, Link, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { fullMixForParts, isMixTrack, MixTrack, NULL_STEREO_MIX, standardMixes, StereoMix } from "../../types";
import StereoMixView from "../common/StereoMixView";
import { useBackend } from "../../backend/useBackend";
import { AddMixDialogProps } from "./MixDialog";

export function SingleMixDialog({song, targetTrackId, existingTracks, onSwitchMode, onClose} : AddMixDialogProps) {
    const CUSTOM_NAME = 'custom' as const
    const CUSTOM_DISPLAY_NAME = 'Custom' as const
    const INITIAL_CUSTOM_MIX: StereoMix = {...NULL_STEREO_MIX, name: CUSTOM_NAME};

    // Is this an edit of an existing track or creation of a new track?
    const isEdit = !!targetTrackId
    const existingMixes = existingTracks.filter(isMixTrack)
    const existingMixNames = new Set(existingMixes.map(m => m.mix.name))
    const targetTrack = existingMixes.find(t => t.trackId == targetTrackId)
    const editError = (isEdit && !targetTrack) ? new Error(`Track ${targetTrackId} not found. Please refresh the page.`) : null

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<Error>(editError);
    const defaultMixesByType: Record<string, StereoMix[]> = React.useMemo(() => standardMixes(song.parts), [song.parts]);
    const defaultMixes: StereoMix[] = Object.entries(defaultMixesByType).flatMap(e => e[1])
    const customFullMix = React.useMemo(() => { return {...fullMixForParts(song.parts), name: CUSTOM_NAME} }, [song.parts])
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(targetTrack?.mix ?? customFullMix);
    const [customTrackName, setCustomTrackName] = React.useState(targetTrack?.mix.name ?? CUSTOM_DISPLAY_NAME);
    const [isCustomMix, setIsCustomMix] = React.useState(true);

    const backend = useBackend()
    const songClient = backend.song(song.id)

    const reset = React.useCallback(() => {
        // console.log("Resetting.")
        setCurrentMix(INITIAL_CUSTOM_MIX)
        setCustomTrackName(CUSTOM_DISPLAY_NAME)
        setIsCustomMix(true)
    }, 
    [setCurrentMix, setCustomTrackName, setIsCustomMix])

    React.useEffect(() => { 
        setCurrentMix(customFullMix)
    }, [customFullMix, setCurrentMix])

    const trackName = React.useMemo(() => isCustomMix ? customTrackName : currentMix.name, [isCustomMix, currentMix])

    const handleCancel = React.useCallback(async () => {
        reset()
        onClose(false)
    }, [onClose, reset]);

    const handleSelectedMixChange = React.useCallback(
        (e: SelectChangeEvent<HTMLSelectElement>) => {
            const selectedMixName = e.target.value.toString();
            // console.log(`Mix name changed to '${selectedMixName}'`)
            if (selectedMixName == CUSTOM_NAME) {
                setCurrentMix(customFullMix);
                setIsCustomMix(true);
            } else {
                const selectedMix = defaultMixes.find((m) => m.name == selectedMixName);
                if (selectedMix && (selectedMix != currentMix)) {
                    // console.log(`Setting mix to ${JSON.stringify(selectedMix)}`)
                    setCurrentMix(selectedMix);
                    setIsCustomMix(false);
                } else {
                    console.log(`Mix {selectedMixName} not found.`);
                }
            }
        }, [setCurrentMix, setIsCustomMix, defaultMixes]
    )

    const handleTrackNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
        } finally {
            setIsSubmitting(false)
        }
    }, [songClient, trackName, currentMix, setIsSubmitting, onClose, reset]);

    const handleMixChange = React.useCallback((newMix) => {
        console.log(`handleMixChange: mix=${JSON.stringify(newMix)}`)
        setCurrentMix(newMix)
    }, [setCurrentMix])

    return (
        <Stack spacing={1}>
            <Typography variant="h6">{isEdit ? "Edit mix" : "Create a new mix"}</Typography>
            {isEdit || (
                <Link onClick={onSwitchMode} sx={{ cursor: 'pointer' }} role="button">Switch to Bulk Mode</Link>
            )}
            {error && (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>)}
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', padding: 1 }}>
                {!isEdit && 
                <FormControl fullWidth>
                    <InputLabel id="mix-name-label">Mix</InputLabel>
                    <Select
                        value={currentMix?.name ?? CUSTOM_DISPLAY_NAME}
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
                        <MenuItem value={CUSTOM_NAME}>Custom</MenuItem>
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
                    disabled={false /* !isValid()*/} 
                    onClick={handleSubmit}
                    type="submit">
                    {isEdit ? "Save" : "Create"}
                </Button>
            </DialogActions>
            {/* Note: each mix view has to have its own key to allow for separate states. */}
            {currentMix && 
            <StereoMixView 
                key={`stereomix-view-${currentMix.name}`} 
                mix={currentMix} 
                isEditable={isCustomMix}
                onMixChange={handleMixChange}/>}
        </Stack>
    )

}

