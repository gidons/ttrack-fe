import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { StereoMix } from '../types';

export interface StereoMixViewProps {
    mix: StereoMix;
    parts: string[]; // labels for each slider (part names)
}

export default function StereoMixView({ mix, parts }: StereoMixViewProps) {
    const left = mix.leftFactors ?? [];
    const right = mix.rightFactors ?? [];

    const count = Math.max(left.length, right.length, parts.length);

    // helper to format number to 2 decimals
    const fmt = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : '0.00');

    const rowHeight=40;

    return (
        <Box sx={{ width: '50%' }}>
            <Stack spacing={2}>
                <Grid container size={12}>
                    <Grid size={2}>
                        <Typography variant="h6" gutterBottom>Part</Typography>
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="h6" gutterBottom>Left</Typography>
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="h6" gutterBottom>Right</Typography>
                    </Grid>
                </Grid>
                {Array.from({length: count }).map((_, i) => (
                    <Grid container spacing={2} key={`row-${i}`}>
                        <Grid size={2}>
                            <Typography variant="subtitle1" color="text.secondary">{parts[i]}</Typography>
                        </Grid>
                        <Grid size={5}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid size={8}>
                                    <Slider
                                        value={left[i] ?? 0}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        disabled
                                        aria-label={`left-factor-${i}`}
                                    />
                                </Grid>
                                <Grid size={4}>
                                    <TextField
                                        // sx={{height: 50}}
                                        value={fmt(left[i])}
                                        size="small"
                                        disabled
                                        fullWidth
                                    />
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
                                        disabled
                                        aria-label={`right-factor-${i}`}
                                    />
                                </Grid>
                                <Grid size={4}>
                                    <TextField
                                        value={fmt(right[i])}
                                        size="small"
                                        disabled
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                 ))}
            </Stack>
        </Box>
    );
}
