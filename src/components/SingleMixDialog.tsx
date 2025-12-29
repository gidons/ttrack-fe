import React from "react";
import { fullMixForParts, MixTrack, NULL_STEREO_MIX, Song, StereoMix } from "../types";
import { createMixTrack, getDefaultMixesForSong, getMixesForSong, getPartsForSong } from "../data/songs";
import { Button, DialogActions, FormControl, Grid, InputLabel, Link, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography } from "@mui/material";
import StereoMixView from "./StereoMixView";

export interface SingleMixDialogProps {
    open: boolean,
    song: Song,
    onSwitchToBulk: () => void,
    onClose: (success: boolean) => void
}

export function SingleMixDialog({open, song, onSwitchToBulk, onClose} : SingleMixDialogProps) {
    console.log(`SingleMixDialog: start render; open=${open}, song=${song?.id}`);

    const INITIAL_CUSTOM_MIX: StereoMix = {...NULL_STEREO_MIX, name: "custom"};

    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<Error>(null);
    const [defaultMixes, setDefaultMixes] = React.useState<StereoMix[]>([]);
    const [existingMixNames, setExistingMixNames] = React.useState(new Set<string>())
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(INITIAL_CUSTOM_MIX);
    const [customTrackName, setCustomTrackName] = React.useState('Custom');
    const [createdTrack, setCreatedTrack] = React.useState<Partial<MixTrack>>({});
    const [isCustomMix, setIsCustomMix] = React.useState(true);

    const reset = React.useCallback(() => {
        console.log("Resetting.")
        setDefaultMixes([])
        setExistingMixNames(new Set())
        setCurrentMix(INITIAL_CUSTOM_MIX)
        setCustomTrackName('Custom')
        setCreatedTrack({})
        setIsCustomMix(true)
    }, 
    [setDefaultMixes, setExistingMixNames, setCurrentMix, setCustomTrackName, setIsCustomMix])

    const loadData = React.useCallback(async () => {
        if (!song || !open) { return }
        console.log(`Loading dialog data for song ${song.id}`);
        setIsLoading(true)
        try {
            const parts = await getPartsForSong(song.id);
            setCurrentMix(fullMixForParts("custom", parts.map(pt => pt.part)))
            const fetchedMixes = await getMixesForSong(song.id);
            console.log(`Existing mix names: ${[...existingMixNames].join()}`);
            setExistingMixNames(new Set(fetchedMixes.map(m => m.mix.name)))
            const fetchedDflMixes = await getDefaultMixesForSong(song.id);
            setDefaultMixes(fetchedDflMixes);
        } catch (fetchError) {
            console.error(`fetchError: ${fetchError}`)
            setError(fetchError as Error);
        } finally {
            setIsLoading(false)
        }
    }, [open, song, setDefaultMixes, setError]);

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
            console.log(`Mix name changed to '${selectedMixName}'`)
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
                const created = await createMixTrack(song.id, mix, isCustomMix);
                console.log("Created track: " + JSON.stringify(created));
                onClose(true)
                reset()
            } catch(e) {
                setError(e as Error);
                throw e;
            }
        }, [song, trackName, currentMix]
    );

    return (open ?
        <Stack spacing={1}>
            <Typography variant="h6">Create new mix for <em>{song?.title??"..."}</em></Typography>
            <Link onClick={onSwitchToBulk}>Switch to Bulk Mode</Link>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', padding: 1 }}>
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
                        {defaultMixes
                            .filter(m => !existingMixNames.has(m.name))
                            .map(m => 
                            <MenuItem value={m.name}>{m.name}</MenuItem>
                        )}
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                    {/* <FormHelperText>{formErrors.key ?? ' '}</FormHelperText> */}
                </FormControl>
                <FormControl fullWidth>
                    <TextField 
                        name='trackName'
                        value={isCustomMix ? customTrackName : currentMix.name}
                        aria-label='Track Name'
                        label='Track Name'
                        disabled={!isCustomMix}
                        onChange={handleTrackNameChange}
                    />
                </FormControl>
            </Grid>
            <DialogActions sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Button disabled={!open} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button 
                    variant="contained"
                    color="primary"
                    disabled={!open || isLoading /* || !isValid()*/} 
                    onClick={handleSubmit}
                    type="submit">
                    Create
                </Button>
            </DialogActions>
            {/* Note: each mix view has to have its own key to allow for separate states. */}
            <StereoMixView key={`stereomix-view-${currentMix?.name ?? 'null'}`} mix={currentMix} isEditable={isCustomMix}/>
        </Stack>
        : <div/> // !open
    );

}

