import { Checkbox, FormControlLabel, Grid, MenuItem, Select, Stack } from "@mui/material";
import React from "react";
import { displayKeyValue, FLAT_SYM, SHARP_SYM } from "../utils";
import { FormFieldSpec, FormFieldState, TextDisplayField } from "./StandardForm";

export type KeyFieldSpec = FormFieldSpec
export type KeyFieldProps = KeyFieldSpec & FormFieldState

export default function KeyField(props: KeyFieldProps) {
    const { initialValue, name, displayName, smSize, onChange, key, editable } = props
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
                TextDisplayField({ ...props, initialValue: displayKeyValue(value) })
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
    const [, letter, accidental, mode] = (value.match(pattern) || ['','','',''])
    // console.log(`KeyEditor: value=${value} letter=${letter}`)

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
                    <FormControlLabel label={SHARP_SYM}
                        control={
                        <Checkbox sx={{padding: 0}}
                            checked={accidental == '#'}
                            onChange={(e) => handleAccidentalChange(e.target.checked ? "#" : "")}/>}
                    />
                    <FormControlLabel label={FLAT_SYM}
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