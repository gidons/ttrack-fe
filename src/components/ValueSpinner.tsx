import { Button, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove"
import React from "react";

export interface ValueSpinnerProps<T> {
    initialValue: T,
    values: T[],
    onChange: ((T) => void)
}

export function ValueSpinner<T>({initialValue, values, onChange}: ValueSpinnerProps<T>) {
    const initialIndex = values.indexOf(initialValue)
    if (initialIndex < 0) {
        throw new TypeError(`Initial value '${initialValue}' is not in the list of allowed values: [${values.join(",")}].`)
    }
    const [valueIndex, setValueIndex] = React.useState(initialIndex)

    const currentValue = React.useMemo(() => values[valueIndex], 
        [values, valueIndex])

    const handleIncrement = React.useCallback((e) => {
        setValueIndex(i => Math.min(i + 1, values.length - 1))
        onChange(currentValue)
    }, [setValueIndex, onChange])
    
    const handleDecrement = React.useCallback((e) => {
        setValueIndex(i => Math.max(i - 1, 0))
        onChange(currentValue)
    }, [setValueIndex])

    return (
    <Stack direction={"row"} spacing={0}>
        <Button
            onClick={handleDecrement}
        >
            <RemoveIcon/>
        </Button>
        <TextField
            slotProps={{
                htmlInput: {
                    sx: { textAlign: "center" },
                    // contentEditable: false
                }
            }}
            contentEditable={false}
            value={currentValue}
        />
        <Button
            onClick={handleIncrement}
        >
            <AddIcon/>
        </Button>
    </Stack>
    )

}