import React from "react";
import { Song } from "../types";
import { Button, DialogActions, FormControl, Grid, Input, InputLabel, MenuItem, Select, SelectChangeEvent, SelectProps, Stack, TextField } from "@mui/material";
import { uploadPartTracks } from "../data/songs";

export interface UploadPartDialogProps {
    song: Song,
    onClose: (success: boolean) => void
}

export function UploadPartDialog({ song, onClose } : UploadPartDialogProps) {
    const defaultParts = ["Bass", "Bari", "Lead", "Tenor"];
    const [error, setError] = React.useState<Error>(null);
    // TODO add loadData() that gets the existing parts
    const [isLoading, setIsLoading] = React.useState(false);
    // Each row: { selectedPartName, customPartName, isCustomPart, audioFile }
    const [rows, setRows] = React.useState([
        { selectedPartName: "", customPartName: "", isCustomPart: false, audioFile: null }
    ]);

    const reset = React.useCallback(() => {
        setRows([{ selectedPartName: "", customPartName: "", isCustomPart: false, audioFile: null }])
    }, [setRows])

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

    const handleCancel = React.useCallback(() => {
        onClose(false)
        reset()
    }, [onClose, reset]);
    
    const handleSubmit = React.useCallback(async () => {
        const parts: string[] = rows.map(row => row.isCustomPart ? row.customPartName : row.selectedPartName);
        const files: File[] = rows.map(row => row.audioFile);
        try {
            const tracks = await uploadPartTracks(song.id, parts, files);
            onClose(true)
            reset()
        } catch(e) {
            setError(e as Error);
            throw e;
        }
    }, [song, rows, onClose, reset]);
    
    return (
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
                    { row.isCustomPart ? (<Grid size={{ xs: 4, sm: 3 }}>
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
                    </Grid>) : <div/>}
                    <Grid size={row.isCustomPart ? { xs: 4, sm: 5 } : { xs: 8, sm: 7 }}>
                        <FormControl fullWidth>
                            <Input
                                type='file'
                                aria-label='Audio file'
                                onChange={handleAudioFileChange(idx)}
                            />
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 } }>
                        <button type="button" onClick={handleAddRow} aria-label="Add row" style={{ marginRight: 8 }}>+</button>
                        {idx > 0 && (
                            <button type="button" onClick={() => handleRemoveRow(idx)} aria-label="Remove row">x</button>
                        )}
                    </Grid>
                </Grid>
            ))}
            <DialogActions sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Button onClick={handleCancel}>
                    Cancel
                </Button>
                <Button 
                    variant="contained"
                    color="primary"
                    disabled={isLoading /* || !isValid()*/} 
                    onClick={handleSubmit}
                    type="submit">
                    Create
                </Button>
            </DialogActions>
        </Stack>)
}
