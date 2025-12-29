import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { StereoMix } from '../types';
import { OutlinedInput } from '@mui/material';

export interface StereoMixViewProps {
    mix: StereoMix;
    isEditable?: boolean;
}

export default function StereoMixView({ mix: { name, spec, parts }, isEditable = false }: StereoMixViewProps) {
    console.log(`StereoMixView: name=${name}, spec=${spec}, parts=${parts}`)
    const [left, setLeft] = React.useState(spec.leftFactors ?? []);
    const [right, setRight] = React.useState(spec.rightFactors ?? []);

    const count = Math.max(left.length, right.length, parts.length);

    // helper to format number to 2 decimals
    const fmt = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : '0.00');

    const updateFactors = (factors: number[], index: number, newValue: number): number[] => {
        const newFactors = [...factors];
        const oldValue = factors[index];
        const oldOtherTotal = 1.0 - oldValue;
        const newOtherTotal = 1.0 - newValue;
        if (oldOtherTotal == 0.0) {
            for (let i = 0; i < factors.length; i++) {
                if (i == index) {
                    newFactors[i] = newValue;
                } else {
                    newFactors[i] = newOtherTotal / (factors.length - 1);
                }
            }
        } else {
            const coeff = newOtherTotal / oldOtherTotal;
            for (let i = 0; i < factors.length; i++) {
                if (i == index) {
                   newFactors[i] = newValue;
                } else {
                    newFactors[i] = factors[i] * coeff;
                }
            }
        }
        return newFactors;   
    }

    const handleFactorSliderChange = React.useCallback((isLeft: boolean, partIndex: number, value: number) => {
        console.log(`handleFactorSliderChange(${isLeft}, ${partIndex}, ${value})`);
        if (isLeft) {
            setLeft(f => updateFactors(f, partIndex, value));
        } else {
            setRight(f => updateFactors(f, partIndex, value));
        }
    }, [setLeft, setRight]);

    interface CompactTextInputProps { value: string }
    function CompactTextInput({value} : CompactTextInputProps) {
        return <OutlinedInput
            slotProps={{
                input: { style: { padding: 0, textAlign: 'center', margin: 0 } }
            }}
            value={value}
            disabled
            fullWidth
        />
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Stack spacing={2}>
                <Grid container size={12}>
                    <Grid size={2}>
                        <Typography variant="overline" gutterBottom>Part</Typography>
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="overline" gutterBottom>Left</Typography>
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="overline" gutterBottom>Right</Typography>
                    </Grid>
                </Grid>
                {Array.from({length: count }).map((_, i) => (
                    <Grid container spacing={2} key={`row-${i}`}>
                        <Grid size={2}>
                            <Typography variant="body1" color="text.secondary">{parts[i]}</Typography>
                        </Grid>
                        <Grid size={5}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid size={8}>
                                    <Slider
                                        value={left[i] ?? 0}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        disabled={!isEditable}
                                        aria-label={`left-factor-${i}`}
                                        onChange={(e,v) => handleFactorSliderChange(true, i, v)}
                                        />
                                </Grid>
                                <Grid size={4}>
                                    <CompactTextInput value={fmt(left[i])}/>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid size={5}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid size={8}>
                                    <Slider
                                        value={right[i] ?? 0}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        disabled={!isEditable}
                                        aria-label={`right-factor-${i}`}
                                        onChange={(e,v) => handleFactorSliderChange(false, i, v)}
                                    />
                                </Grid>
                                <Grid size={4}>
                                    <CompactTextInput value={fmt(right[i])}/>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                 ))}
            </Stack>
        </Box>
    );
}
