import { Stack, Typography } from "@mui/material";
import React from "react";
import { ValueSpinner } from "./ValueSpinner";

export function PitchAndSpeedControl() {
    const [pitchShift, setPitchShift] = React.useState(0)
    const [speedFactor, setSpeedFactor] = React.useState(1)
    return (
        <Stack spacing={1}>
            <Typography variant="subtitle1">Pitch Shift:</Typography>
            <ValueSpinner
                values={["-3", "-2", "-1", "0", "+1", "+2", "+3"]}
                initialValue={pitchShift.toString()}
                onChange={v => setPitchShift(parseInt(v))}/>
            <Typography variant="subtitle1">Speed Factor:</Typography>
            <ValueSpinner
                values={["50%", "66%", "75%", "90%", "100%", "110%", "125%", "133%", "150%"]}
                initialValue={(speedFactor * 100) + "%"}
                onChange={v => {
                    const pct = v.replace("%","")
                    setSpeedFactor(parseInt(pct) / 100)
                }}/>
        </Stack>
    )
}