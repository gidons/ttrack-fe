import { Button, Stack, SxProps, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove"
import React from "react";

export interface ValueSpinnerProps<T> {
    value: T,
    values: T[],
    onChange: ((v: T) => void),
    sx?: SxProps
}

/*
 TODO Find a way to make editing values easier.
 With current implementation, every keystroke generates an onChange call, and if the parent
 is doing validation, this can be frustrating. For example, PitchAndSpeedControl requires that
 the pitch be a number, but "-" is not a number, so entering "-3" is tricky.
 Possible approach:
 - Add text value as state
 - In handleChange, only change the state but don't propagate to parent
 - Add onBlur and propage to parent
*/
export function ValueSpinner<T>({value, values, onChange, sx}: ValueSpinnerProps<T>) {
    const valueIndex = values.indexOf(value)
    const isInvalidValue = (valueIndex < 0)

    if (isInvalidValue) {
        // throw new TypeError(`Initial value '${initialValue}' is not in the list of allowed values: [${values.join(",")}].`)
        console.warn(`Initial value '${value}' is not in the list of allowed values; using text field instead.`)
    }

    const handleIncrement = React.useCallback(() => {
        const newIndex = Math.min(valueIndex + 1, values.length - 1);
        // console.log(`ValueSpinner.handleIncrement: ${values[newIndex]}`)
        onChange(values[newIndex])
    }, [valueIndex, onChange])
    
    const handleDecrement = React.useCallback(() => {
        const newIndex = Math.max(valueIndex - 1, 0);
        // console.log(`ValueSpinner.handleDecrement: ${values[newIndex]}`)
        onChange(values[newIndex])
    }, [valueIndex, onChange])

    const handleTextChange = React.useCallback((e) => {
        onChange(e.target.value)
    }, [onChange])

    return (
    <Stack direction={"row"} spacing={0} sx={sx}>
        <Button
            onClick={handleDecrement}
            sx={{minWidth: 32}}
            disabled={isInvalidValue}
        >
            <RemoveIcon/>
        </Button>
        <TextField
            slotProps={{
                htmlInput: {
                    sx: { textAlign: "center" },
                }
            }}
            onChange={handleTextChange}
            contentEditable={isInvalidValue ? null : false}
            value={value}
        />
        <Button
            onClick={handleIncrement}
            sx={{minWidth: 32}}
            disabled={isInvalidValue}
        >
            <AddIcon/>
        </Button>
    </Stack>
    )

}