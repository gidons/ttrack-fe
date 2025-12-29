//
// DEPRECATED
//



import { Button, Checkbox, FormControl, FormControlLabel, Grid, Input, InputLabel, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography, useEventCallback } from '@mui/material';
import * as React from 'react';
import { createMixTrack, getDefaultMixesForSong, getMixesForSong, uploadPartTrack, uploadPartTracks } from '../data/songs';
import { DialogValidationError, FormDialog, FormDialogPayload } from '../hooks/useDialogs/FormDialog';
import { DialogProps, useDialogs } from '../hooks/useDialogs/useDialogs';
import { isValidMixTrack, isValidPartTrack, MixTrack, NULL_STEREO_MIX, PartTrack, Song, StereoMix, trackName } from '../types';
import StereoMixView from './StereoMixView';

function noOpClose<T>() { 
    return (t: T) => {
        console.log("noOpClose");
        return Promise.resolve(null) 
    }
};

/**********************************************************************************/
/*                                MixDialog
/**********************************************************************************/

export interface MixDialogProps extends DialogProps<{song: Song}, MixTrack> {
}

export function MixDialog({open, payload: { song }, onClose } : MixDialogProps) {
    console.log("MixDialog: start render");

    const INITIAL_CUSTOM_MIX: StereoMix = {...NULL_STEREO_MIX, name: "custom"};

    const [isLoading, setIsLoading] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<Error>(null);
    const [defaultMixes, setDefaultMixes] = React.useState<StereoMix[]>([]);
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(INITIAL_CUSTOM_MIX);
    const [trackName, setTrackName] = React.useState('');
    const [createdTrack, setCreatedTrack] = React.useState<Partial<MixTrack>>({});
    const [isCustomMix, setIsCustomMix] = React.useState(false);

    const loadData = React.useCallback(async () => {
        try {
            console.log(`Loading dialog data for song ${song.id}`);
            const fetchedMixes = await getMixesForSong(song.id);
            const existingMixNames = new Set(fetchedMixes.map(m => m.mix.name));
            console.log(`Existing mix names: ${[...existingMixNames].join()}`);

            // const fetchedDflMixes = await getDefaultMixesForSong(song.id);
            const fetchedDflMixes: StereoMix[] = [{name: "full mix", parts: ["Bass", "Lead"], spec: {leftFactors: [0.5, 0.5], rightFactors: [0.5, 0.5]}, speedFactor: 1, pitchShift: 0}];
            setDefaultMixes(fetchedDflMixes.filter(m => !existingMixNames.has(m.name)));
        } catch (fetchError) {
            setError(fetchError as Error);
        }
    }, [setDefaultMixes, setError]);

    const handleClose = React.useCallback(async (t) => {
        console.log(`handleClose: ` + JSON.stringify(t));
        return onClose(isValidMixTrack(t) ? t : null);
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
                setTrackName('');
            } else {
                const selectedMix = defaultMixes.find((m) => m.name == selectedMixName);
                if (selectedMix && (selectedMix != currentMix)) {
                    console.log(`Setting mix to ${JSON.stringify(selectedMix)}`)
                    setCurrentMix(selectedMix);
                    setIsCustomMix(false);
                    setTrackName(selectedMix.name);
                } else {
                    console.log("Mix not found.");
                }
            }
        }, [setCurrentMix, setIsCustomMix, defaultMixes]
    )

    const handleTrackNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTrackName(e.target.value);
    }, [setTrackName]);

    const onSubmit = React.useCallback(() => {
            const mix: StereoMix = { ...currentMix, name: trackName }
            console.log("Creating track with mix: " + JSON.stringify(mix));
            try {
                const created = createMixTrack(song.id, mix, isCustomMix);
                console.log("Created track: " + JSON.stringify(created));
                return created;
            } catch(e) {
                setError(e as Error);
                throw e;
            }
        }, [trackName, currentMix]
    );

    const title = <div>Create new mix for <em>{song?.title??"..."}</em></div>
    
    const content = (
        <Stack spacing={2}>
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
                <Button disabled={!open}>
                    Cancel
                </Button>
                <Button
                    disabled={!open || isLoading /* || !isValid()*/} 
                    loading={isSubmitting}
                    onClick={setIsSubmitting(true)}
                    type="submit">
                    Create
                </Button>
            </Grid>
            {/* Note: each mix view has to have its own key to allow for separate states. */}
            <StereoMixView key={`stereomix-view-${currentMix?.name ?? 'null'}`} mix={currentMix} isEditable={isCustomMix}/>
        </Stack>
    );

    const payload = React.useMemo<FormDialogPayload<MixTrack>>(() => ({
        title: title,
        content: content,
        onSubmit: onSubmit,
        loadData: loadData,
        // validate: validateForm
    }), [title, content, onSubmit, loadData]);

    return <FormDialog
        open={open}
        payload={payload}
        onClose={handleClose}
    />
}

/**********************************************************************************/
/*                                UploadPartDialog
/**********************************************************************************/

export interface UploadPartDialogProps extends DialogProps<{song: Song}, PartTrack> {
}

export function UploadPartDialog({ open, payload: { song }, onClose } : UploadPartDialogProps) {
    const defaultParts = ["Bass", "Bari", "Lead", "Tenor"];
    const [error, setError] = React.useState<Error>(null);
    // Each row: { selectedPartName, customPartName, isCustomPart, audioFile }
    const [rows, setRows] = React.useState([
        { selectedPartName: "", customPartName: "", isCustomPart: false, audioFile: null }
    ]);

    const title = <div>Upload part audio for <em>{song?.title??"..."}</em></div>;

    // Handlers for each row
    const handleSelectedPartChange = (rowIdx: number) => (e: SelectChangeEvent<HTMLSelectElement>) => {
        const selectedPartName = e.target.value.toString();
        setRows(rows => rows.map((row, idx) => idx === rowIdx ? {
            ...row,
            selectedPartName,
            isCustomPart: selectedPartName === 'custom',
            // Reset customPartName if not custom
            customPartName: selectedPartName === 'custom' ? row.customPartName : ""
        } : row));
    };

    const handleCustomPartNameChange = (rowIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setRows(rows => rows.map((row, idx) => idx === rowIdx ? { ...row, customPartName: value } : row));
    };

    const handleAudioFileChange = (rowIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files[0];
        setRows(rows => rows.map((row, idx) => idx === rowIdx ? { ...row, audioFile: selectedFile } : row));
    };

    const handleAddRow = () => {
        setRows(rows => [...rows, { selectedPartName: "", customPartName: "", isCustomPart: false, audioFile: null }]);
    };

    const handleRemoveRow = (rowIdx: number) => {
        setRows(rows => rows.filter((_, idx) => idx !== rowIdx));
    };

    const content = (
        <Stack spacing={2}>
            {rows.map((row, idx) => (
                <Grid key={idx} container spacing={2} alignItems="center" sx={{ padding: 1 }}>
                    <Grid size={{ xs: 4, sm: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel required id={`part-selector-label-${idx}`}>Part</InputLabel>
                            <Select
                                value={row.selectedPartName ?? ''}
                                onChange={handleSelectedPartChange(idx) as SelectProps['onChange']}
                                labelId={`part-selector-label-${idx}`}
                                name="defaultPart"
                                label="Part"
                                fullWidth
                            >
                                {defaultParts.map((part) => 
                                    <MenuItem key={part} value={part}>{part}</MenuItem>
                                )}
                                <MenuItem value="custom">Custom</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 4, sm: 3 }}>
                        <FormControl fullWidth>
                            <TextField 
                                name='partName'
                                value={row.customPartName}
                                aria-label='Part Name'
                                label='Part Name'
                                disabled={!row.isCustomPart}
                                onChange={handleCustomPartNameChange(idx)}
                            />
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 4, sm: 4 }}>
                        <FormControl fullWidth>
                            <Input
                                type='file'
                                aria-label='Audio file'
                                onChange={handleAudioFileChange(idx)}
                            />
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 } }>
                        <button type="button" onClick={handleAddRow} aria-label="Add row" style={{ marginRight: 8 }}>+</button>
                        {idx > 0 && (
                            <button type="button" onClick={() => handleRemoveRow(idx)} aria-label="Remove row">x</button>
                        )}
                    </Grid>
                </Grid>
            ))}
        </Stack>
    );

    // Validation: all rows must have file and part name
    const validateForm = React.useCallback(() => {
        let errors: DialogValidationError[] = [];
        rows.forEach((row, idx) => {
            const partName = row.isCustomPart ? row.customPartName : row.selectedPartName;
            if (!row.audioFile) {
                errors.push({ field: `audioFile${idx}`, message: `Row ${idx+1}: Please select a file for upload` });
            }
            if (!partName) {
                errors.push({ field: `partName${idx}`, message: `Row ${idx+1}: Please select or set a name for the part` });
            }
        });
        return errors;
    }, [rows]);

    const onSubmit = React.useCallback(async () => {
        // Gather part names and files
        const parts: string[] = rows.map(row => row.isCustomPart ? row.customPartName : row.selectedPartName);
        const files: File[] = rows.map(row => row.audioFile);
        try {
            const tracks = await uploadPartTracks(song.id, parts, files);
            return tracks[0];
        } catch(e) {
            setError(e as Error);
            throw e;
        }
    }, [song, rows]);

    const handleClose = React.useCallback(async (tracks) => {
        // Always return the first track if valid array
        if (Array.isArray(tracks) && tracks.length > 0 && tracks.every(isValidPartTrack)) {
            return onClose(tracks[0]);
        } else {
            return onClose(null);
        }
    }, [onClose]);

    const payload: FormDialogPayload<PartTrack> = {
        title: title,
        content: content,
        onSubmit: onSubmit,
        validate: validateForm
    };
    return <FormDialog
        open={open}
        payload={payload}
        onClose={handleClose}
    />
}

export interface OpenCreateMixDialog {
    (payload: {song: Song}): Promise<MixTrack>;
}

export interface OpenUploadPartDialog {
    (song: Song): Promise<PartTrack>;
}

export interface TrackDialogsHook {
    openCreateMixDialog: OpenCreateMixDialog;
    openUploadPartDialog: OpenUploadPartDialog;
}

export function useTrackDialogs(): TrackDialogsHook {
    const dialogs = useDialogs();
    
    const openCreateMixDialog = useEventCallback<OpenCreateMixDialog>((payload) => {
        // const onClose = noOpClose<MixTrack>();
        console.log(`openCreateMixDialog: ${payload}`)
        return dialogs.open(MixDialog, payload, {});
    });

    // const openUploadPartDialog = useEventCallback<OpenUploadPartDialog>((song) => {
    const openUploadPartDialog = (song) => {
        // const onClose = noOpClose<PartTrack>();
        return dialogs.open(UploadPartDialog, { song }, { });
    };

    return React.useMemo(() => ({ 
        openCreateMixDialog,
        openUploadPartDialog 
    }), [openCreateMixDialog, openUploadPartDialog]);
};