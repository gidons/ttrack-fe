import { FormControl, Grid, Input, InputLabel, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography, useEventCallback } from '@mui/material';
import * as React from 'react';
import { createMixTrack, getDefaultMixesForSong, getMixesForSong, uploadPartTrack } from '../data/songs';
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

export interface MixDialogProps extends DialogProps<{song: Song}, MixTrack> {
}

export function MixDialog({open, payload: { song }, onClose } : MixDialogProps) {
    const [error, setError] = React.useState<Error>(null);
    const [defaultMixes, setDefaultMixes] = React.useState<StereoMix[]>([]);
    const [existingMixes, setExistingMixes] = React.useState<StereoMix[]>([]);
    const [currentMix, setCurrentMix] = React.useState<StereoMix>(NULL_STEREO_MIX);
    const [trackName, setTrackName] = React.useState('');
    const [createdTrack, setCreatedTrack] = React.useState<Partial<MixTrack>>({});
    const [isCustomMix, setIsCustomMix] = React.useState(false);

    const loadData = React.useCallback(async () => {
        try {
            console.log(`Loading dialog data for song ${song.id}`);
            const fetchedMixes = await getMixesForSong(song.id);
            setExistingMixes(fetchedMixes.map((t) => t.mix));

            const fetchedDflMixes = await getDefaultMixesForSong(song.id);
            setDefaultMixes(fetchedDflMixes);
        } catch (fetchError) {
            setError(fetchError as Error);
        }
    }, [song]);

    const handleClose = React.useCallback(async () => {
        console.log(`handleClose`);
        return onClose(isValidMixTrack(createdTrack) ? createdTrack : null);
    }, [onClose, createdTrack]);

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
        }, [setCurrentMix, setIsCustomMix, defaultMixes]
    )

    const handleTrackNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTrackName(e.target.value);
    }, [setCreatedTrack]);

    const onSubmit = React.useCallback(() => {
            const mix: StereoMix = { ...currentMix, name: trackName }
            console.log("Creating track with mix: " + JSON.stringify(mix));
            try {
                return createMixTrack(song.id, mix, isCustomMix);
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
            </Grid>
            {/* Note: each mix view has to have its own key to allow for separate states. */}
            <StereoMixView key={`stereomix-view-${currentMix?.name ?? 'null'}`} mix={currentMix} isEditable={isCustomMix}/>
        </Stack>
    );
    
    const payload: FormDialogPayload<MixTrack> = {
        title: title,
        content: content,
        onSubmit: onSubmit,
        loadData: loadData
    }
    
    return <FormDialog
        open={open}
        payload={payload}
        onClose={handleClose}
    />
}

export interface UploadPartDialogProps extends DialogProps<{song: Song}, PartTrack> {
}

export function UploadPartDialog({ open, payload: { song }, onClose } : UploadPartDialogProps) {
    const defaultParts = ["Bass", "Bari", "Lead", "Tenor"];

    const [error, setError] = React.useState<Error>(null);
    const [selectedPartName, setPartName] = React.useState("");
    const [customPartName, setCustomPartName] = React.useState("");
    const [isCustomPart, setIsCustomPart] = React.useState(false);
    const [createdTrack, setCreatedTrack] = React.useState<Partial<PartTrack>>({});
    const [audioFile, setAudioFile] = React.useState<File>(null);

    const title = <div>Upload part audio for <em>{song?.title??"..."}</em></div>;

    const handleCustomPartNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomPartName(e.target.value);
    }, [setCustomPartName]);

    const handleSelectedPartChange = React.useCallback((e: SelectChangeEvent<HTMLSelectElement>) => {
        const selectedPartName = e.target.value.toString();
        setIsCustomPart(selectedPartName == 'custom');
        setPartName(selectedPartName);
    }, [setPartName, setIsCustomPart]);

    const handleAudioFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files[0];
        setAudioFile(selectedFile);
    }, [setAudioFile]);

    const content = 
        <Stack spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', padding: 1 }}>
                <FormControl fullWidth>
                    <InputLabel required id="part-selector-label">Part</InputLabel>
                    <Select
                        value={selectedPartName ?? ''}
                        onChange={handleSelectedPartChange as SelectProps['onChange']}
                        labelId="part-selector-label"
                        name="defaultPart"
                        label="Part"
                        fullWidth
                    >
                        {defaultParts.map((part) => 
                            <MenuItem value={part}>{part}</MenuItem>
                        )}
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <TextField 
                        name='partName'
                        value={customPartName}
                        aria-label='Part Name'
                        label='Part Name'
                        disabled={!isCustomPart}
                        onChange={handleCustomPartNameChange}
                    />
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                <FormControl>
                    <Input
                        type='file'
                        aria-label='Audio file'
                        onChange={handleAudioFileChange}/>
                </FormControl>
            </Grid>
        </Stack>;

    const partName = isCustomPart ? customPartName : selectedPartName;

    const validateForm = React.useCallback(() => {
        let errors: DialogValidationError[] = [];
        if (!audioFile) { errors.push({ field: 'audioFile', message: 'Please select a file for upload' })}
        if (!partName) { errors.push({ field: 'partName', message: 'Please select or set a name for the part'})}
        console.log("validate: " + JSON.stringify(errors));
        return errors;
    }, [audioFile, partName]);

    const onSubmit = React.useCallback(async () => {
        console.log(`Creating track for part '${selectedPartName}' with file ${audioFile}`);
        try {
            return uploadPartTrack(song.id, partName, audioFile);
        } catch(e) {
            setError(e as Error);
            throw e;
        }
    }, [song, partName, audioFile]);

    const handleClose = React.useCallback(async () => {
        console.log(`handleClose`);
        return onClose(isValidPartTrack(createdTrack) ? createdTrack : null);
    }, [onClose, createdTrack]);

    const payload: FormDialogPayload<PartTrack> = {
        title: title,
        content: content,
        onSubmit: onSubmit,
        validate: validateForm
    }
    return <FormDialog
        open={open}
        payload={payload}
        onClose={() => handleClose()}
    />
}

export interface OpenCreateMixDialog {
    (song: Song): Promise<MixTrack>;
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
    
    const openCreateMixDialog = useEventCallback<OpenCreateMixDialog>((song) => {
        // const onClose = noOpClose<MixTrack>();
        return dialogs.open(MixDialog, { song }, {});
    });

    const openUploadPartDialog = useEventCallback<OpenUploadPartDialog>((song) => {
        // const onClose = noOpClose<PartTrack>();
        return dialogs.open(UploadPartDialog, { song }, { });
    });

    return React.useMemo(() => ({ 
        openCreateMixDialog,
        openUploadPartDialog 
    }), [openCreateMixDialog, openUploadPartDialog]);
};