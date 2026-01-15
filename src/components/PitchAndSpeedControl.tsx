import { Stack, Typography } from "@mui/material";
import React from "react";
import { ValueSpinner } from "./ValueSpinner";

export interface PitchAndSpeedControlProps {
    pitchShift: number,
    speedFactor: number,
    direction?: "row" | "column",
    onPitchShiftChange: (newValue: number) => void,
    onSpeedFactorChange: (newValue: number) => void
}

export function PitchAndSpeedControl({ pitchShift, speedFactor, direction = "column", onPitchShiftChange, onSpeedFactorChange }: PitchAndSpeedControlProps) {
    return (
        <Stack spacing={1} direction={direction}>
            <Stack>
                <Typography variant="subtitle1">Pitch Shift (Semitones):</Typography>
                <ValueSpinner
                    values={["-3", "-2", "-1", "0", "+1", "+2", "+3"]}
                    value={pitchShift <= 0 ? pitchShift.toString() : "+" + pitchShift}
                    onChange={v => {
                        const iv = parseInt(v)
                        console.log(`onChange: pitchShift='${v}' -> ${iv}`) 
                        if (iv < 12 && iv > -12) {
                            onPitchShiftChange(iv)
                        }
                    } }/>
            </Stack>
            <Stack>
                <Typography variant="subtitle1">Speed Factor:</Typography>
                <ValueSpinner
                    values={["50%", "66%", "75%", "90%", "100%", "110%", "125%", "133%", "150%"]}
                    value={(Math.round(speedFactor * 100)) + "%"}
                    onChange={v => {
                        const pct = v.replace("%","")
                        const pv = Math.round(parseInt(pct)) / 100
                        console.log(`onChange: speedFactor='${v}' -> ${pv}`) 
                        if (pv > 0 && pv < 3) {
                            onSpeedFactorChange(pv)
                        }
                    }}/>
            </Stack>
        </Stack>
    )
}