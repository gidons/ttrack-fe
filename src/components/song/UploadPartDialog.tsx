import { Alert, Box, Button, DialogActions, FormControl, Grid, Input, InputLabel, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { isPartTrack, STD_VOICING_LIST, Track } from "../../types";
import { AddTrackDialogProps } from "./TrackList";

export function UploadPartDialog({ song, isOpen, existingTracks, targetTrackId, onClose } : AddTrackDialogProps) {
    interface UploadRow {
        selectedPartName: string,
        customPartName: string,
        isCustomPart: boolean,
        audioFile: File
    }

    const isEdit = !!targetTrackId
    const targetTrack: Track | null = existingTracks.find(t => t.trackId == targetTrackId)
    const editError = (isEdit && !targetTrack) ? new Error(`Track ${targetTrackId} not found. Please refresh the page.`) : null

    const CUSTOM_PART_NAME = "custom"
    const EMPTY_CUSTOM_ROW: UploadRow = { selectedPartName: CUSTOM_PART_NAME, customPartName: "", isCustomPart: true, audioFile: null }

    const defaultParts = React.useMemo(() =>
        STD_VOICING_LIST.find(v => v.name == song.voicing)?.parts || []
    , [song]);
    const [error, setError] = React.useState<Error>(editError);
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const existingParts = existingTracks.filter(isPartTrack).map(t => t.trackId)
    const missingParts = defaultParts.filter(p => !existingParts.includes(p))
    // console.log(`existingParts: ${existingParts}; missingParts: ${missingParts}; targetTrack: ${targetTrack?.trackId ?? "null"}`)
    const [rows, setRows] = React.useState<UploadRow[]>([EMPTY_CUSTOM_ROW]);
    const backend = useBackend()
    const navigate = useNavigate()
    const songClient = backend.song(song.id)

    const reset = React.useCallback(() => {
        setRows([EMPTY_CUSTOM_ROW])
    }, [setRows])

    React.useEffect(() => {
        if (targetTrack) {
            setRows([{ selectedPartName: targetTrack.trackId, customPartName: "", isCustomPart: false, audioFile: null }])
        } else if (missingParts.length > 0) {
            setRows(missingParts.map(p => ({ selectedPartName: p, customPartName: "", isCustomPart: false, audioFile: null })))
        } else {
            setRows([EMPTY_CUSTOM_ROW])
        }
    }, [song, isOpen, existingTracks, targetTrackId, setRows])

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

    const handleAddRow = React.useCallback(() => {
        setRows(rows => [...rows, { selectedPartName: "", customPartName: "", isCustomPart: false, audioFile: null }]);
    }, [setRows]);

    const handleRemoveRow = (rowIdx: number) => {
        setRows(rows => rows.filter((_, idx) => idx !== rowIdx));
    };

    const handleCancel = React.useCallback(() => {
        onClose(false)
        reset()
    }, [onClose, reset]);
    
    const handleSubmit = React.useCallback(async () => {
        const parts: string[] = rows.map(row => row.isCustomPart ? row.customPartName : row.selectedPartName);
        const files: File[] = rows.map(row => row.audioFile);
        try {
            setIsSubmitting(true)
            await songClient.uploadParts(parts, files);
            onClose(true)
            reset()
        } catch(e) {
            setError(e as Error);
        } finally {
            setIsSubmitting(false)
        }
    }, [song, rows, onClose, reset]);
    
    const isValid = React.useCallback(() => {
        return rows.filter(r => r.audioFile != null).length > 0
    }, [rows])

    return isOpen && (
        <Stack spacing={2}>
            <Typography variant="h6">Upload {isEdit ? "updated" : "new"} part audio</Typography>
            {error && (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>)}
            {rows.map((row, idx) => (
                <Grid key={idx} container spacing={2} alignItems="center" sx={{ padding: 1 }}>
                    <Grid size={{ xs: 4, sm: 3 }}>
                      {isEdit ? 
                        <TextField
                                value={row.selectedPartName}
                                disabled={true}
                                name="defaultPart"
                                label="Part"
                                fullWidth/>
                        :
                        <FormControl fullWidth>
                            <InputLabel required id={`part-selector-label-${idx}`}>Part</InputLabel>
                            <Select
                                value={row.selectedPartName ?? CUSTOM_PART_NAME}
                                onChange={handleSelectedPartChange(idx) as SelectProps['onChange']}
                                labelId={`part-selector-label-${idx}`}
                                name="defaultPart"
                                label="Part"
                                fullWidth
                            >
                                {missingParts.map((part) => 
                                    <MenuItem key={part} value={part}>{part}</MenuItem>
                                )}
                                <MenuItem value={CUSTOM_PART_NAME}>Custom</MenuItem>
                            </Select>
                        </FormControl>
                      }
                    </Grid>
                    { row.isCustomPart && (<Grid size={{ xs: 4, sm: 3 }}>
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
                    </Grid>)}
                    <Grid size={row.isCustomPart ? { xs: 4, sm: 5 } : { xs: 8, sm: 7 }}>
                        <FormControl fullWidth>
                            <Input
                                type='file'
                                aria-label='Audio file'
                                onChange={handleAudioFileChange(idx)}
                            />
                        </FormControl>
                    </Grid>
                    {isEdit || <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 } }>
                        {rows.length > 1 && <button type="button" onClick={() => handleRemoveRow(idx)} aria-label="Remove row">x</button>}
                        {(idx == rows.length - 1) && <button type="button" onClick={handleAddRow} aria-label="Add row" style={{ marginRight: 8 }}>+</button>}
                    </Grid>}
                </Grid>
            ))}
            <DialogActions sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Button onClick={handleCancel}>
                    Cancel
                </Button>
                <Button 
                    variant="contained"
                    color="primary"
                    loading={isSubmitting}
                    disabled={!isValid()} 
                    onClick={handleSubmit}
                    type="submit">
                    Create
                </Button>
            </DialogActions>
        </Stack>)
}
