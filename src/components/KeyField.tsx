import React from "react";
import { FormFieldSpec, FormFieldState, TextDisplayField } from "./StandardForm";
import { Box, Checkbox, FormControlLabel, Grid, MenuItem, Select, Stack, TextField } from "@mui/material";
import { ValueSpinner } from "./ValueSpinner";
import { M } from "@clerk/clerk-react/dist/useAuth-fq1pQd_y";
import { CheckBox } from "@mui/icons-material";

export type KeyFieldSpec = FormFieldSpec
export type KeyFieldProps = KeyFieldSpec & FormFieldState

export default function KeyField(props: KeyFieldProps) {
    const { initialValue, name, displayName, smSize, onChange, error, key, editable } = props
    const [value, setValue] = React.useState(initialValue)
    return (
        <Grid size={{ xs: 12, sm: smSize }} sx={editable ? { display: 'flex' } : {}} key={key}>
            { editable ? (
            <KeyEditor
                value={value || ""}
                onChange={(newValue: string) => { setValue(newValue); onChange(newValue) }}
                name={name}
                displayName={displayName}
            />
            ) : (
                TextDisplayField({ ...props, initialValue: value })
            )}
        </Grid>
    )
}

interface KeyEditorProps {
    value: string,
    name: string,
    displayName: string,
    onChange: (value: string) => void, 
}
function KeyEditor({value, name, displayName, onChange}: KeyEditorProps) {
    const pattern = /([A-G])([#b]?)(m?)/
    const [match, letter, accidental, mode] = (value.match(pattern) || ['','','',''])
    console.log(`KeyEditor: value=${value} letter=${letter}`)

    const handleLetterChange = React.useCallback((newLetter: string) => {
        if (letter != newLetter) {
            onChange(newLetter + accidental + mode)
        }
    }, [value, onChange])

    const handleAccidentalChange = React.useCallback((newAcc: string) => {
        if (accidental != newAcc) {
            onChange(letter + newAcc + mode)
        }
    }, [value, onChange])

    const handleModeChange = React.useCallback((newMode: string) => {
        if (mode != newMode) {
            onChange(letter + accidental + newMode)
        }
    }, [value, onChange])

    return (
        <Grid key={`field-${name}`} size={12} spacing={1} container direction={"row"}>
            <Grid size={8}>
                <Select
                    aria-label={displayName}
                    value={letter} 
                    onChange={(e) => handleLetterChange(e.target.value)}
                    sx={{ width: "90%"}}
                    slotProps={{ input: { sx: { textAlign: "center" } } }}
                >
                    {['A','B','C','D','E','F','G'].map(l =>
                        <MenuItem key={`note-${name}-${l}`} value={l}>{l}</MenuItem>
                    )}
                </Select>
            </Grid>
            <Grid size={1} sx={{}} >
                <Stack>
                    <FormControlLabel label="♯"
                        control={
                        <Checkbox sx={{padding: 0}}
                            checked={accidental == '#'}
                            onChange={(e) => handleAccidentalChange(e.target.checked ? "#" : "")}/>}
                    />
                    <FormControlLabel label="♭"
                        control={
                        <Checkbox sx={{padding: 0}}
                            checked={accidental == 'b'} 
                            onChange={(e) => handleAccidentalChange(e.target.checked ? "b" : "")}/>
                        }
                    />
                </Stack>
            </Grid>
            <Grid size={2} marginLeft={1}>
                <FormControlLabel label="minor" sx={{ padding: 0 }}
                    control={
                    <Checkbox
                        checked={mode == 'm'}
                        onChange={(e) => handleModeChange(e.target.checked ? "m" : "")}
                    />
                }
                />
            </Grid>
        </Grid>
    )
}