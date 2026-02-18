import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { StereoMix } from '../../types';
import { OutlinedInput } from '@mui/material';
import { PitchAndSpeedControl } from './PitchAndSpeedControl';

export interface StereoMixViewProps {
    mix: StereoMix
    isEditable?: boolean
    maxLevel?: number
    onMixChange?: (mix: StereoMix) => void
}

export default function StereoMixView({ mix, isEditable = false, maxLevel = 1.0, onMixChange }: StereoMixViewProps) {
    // console.log(`StereoMixView: name=${name}, spec=${spec}, parts=${parts}`)
    const { spec: { leftFactors, rightFactors }, parts, pitchShift, speedFactor } = mix

    const count = Math.max(leftFactors.length, rightFactors.length, parts.length);

    // helper to format number to 2 decimals
    const fmt = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : '0.00');

    const updateFactors = (factors: number[], index: number, newValue: number): number[] => {
        const newFactors = [...factors];
        const oldValue = factors[index];
        const oldOtherTotal = maxLevel - oldValue;
        const newOtherTotal = maxLevel - newValue;
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
        const newFactors = updateFactors(isLeft ? leftFactors : rightFactors, partIndex, value);
        if (onMixChange) {
            onMixChange({ ...mix, spec: { 
                leftFactors: isLeft ? newFactors : leftFactors, 
                rightFactors: isLeft ? rightFactors : newFactors 
            }})
        }
    }, [onMixChange, mix]);

    const handlePitchChange = React.useCallback((newValue: number) => onMixChange({...mix, pitchShift: newValue}), [onMixChange, mix])
    const handleSpeedChange = React.useCallback((newValue: number) => onMixChange({...mix, speedFactor: newValue}), [onMixChange, mix])

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
                                        color={leftFactors[i] ?? 0 > 1 ? 'warning' : 'primary'}
                                        value={leftFactors[i] ?? 0}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        disabled={!isEditable}
                                        aria-label={`left-factor-${i}`}
                                        onChange={(e,v) => handleFactorSliderChange(true, i, v)}
                                        />
                                </Grid>
                                <Grid size={4}>
                                    <CompactTextInput value={fmt(leftFactors[i])}/>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid size={5}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid size={8}>
                                    <Slider
                                        color={rightFactors[i] ?? 0 > 1 ? 'warning' : 'primary'}
                                        value={rightFactors[i] ?? 0}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        disabled={!isEditable}
                                        aria-label={`right-factor-${i}`}
                                        onChange={(e,v) => handleFactorSliderChange(false, i, v)}
                                    />
                                </Grid>
                                <Grid size={4}>
                                    <CompactTextInput value={fmt(rightFactors[i])}/>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                 ))}
                 <PitchAndSpeedControl
                    pitchShift={pitchShift}
                    speedFactor={speedFactor}
                    direction='row'
                    onPitchShiftChange={handlePitchChange}
                    onSpeedFactorChange={handleSpeedChange}/>
            </Stack>
        </Box>
    );
}
