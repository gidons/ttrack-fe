import React, { ChangeEvent, FormEvent, useState } from 'react'
import { Song } from '../types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';

export interface SongFormState {
    values: Partial<Omit<Song, 'id'>>;
    errors: Partial<Record<keyof SongFormState['values'], string>>;
}


/*
 * TODO genericize this whole pattern so it can be used in other forms:
 * - Type parameter T: has 'values'
 * - FormFieldValue
 * - SimpleFormProps<T>, FormState<T>
 * - SimpleForm<T>
 *   - change handlers
 *   - submit/reset handlers
 * ?
 */

export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface SongFormProps {
    formState: SongFormState;
    onFieldChange: (
        name: keyof SongFormState['values'],
        value: FormFieldValue,
    ) => void;
    onSubmit: (formValues: Partial<SongFormState['values']>) => Promise<void>;
    onReset?: (formValues: Partial<SongFormState['values']>) => void;
    submitButtonLabel: string;
    backButtonPath?: string;
}

export default function SongForm(props: SongFormProps) {
    const {
        formState,
        onFieldChange,
        onSubmit,
        onReset,
        submitButtonLabel,
        backButtonPath
    } = props;

    const formValues = formState.values;
    const formErrors = formState.errors;

    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleTextFieldChange = React.useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            onFieldChange(
                e.target.name as keyof SongFormState['values'],
                e.target.value
            )
        }, [onFieldChange]
    );
    
    const handleNumberFieldChange = React.useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            onFieldChange(
                e.target.name as keyof SongFormState['values'],
                Number(e.target.value)
            )
        }, [onFieldChange]
    );

    const handleSelectFieldChange = React.useCallback(
        (e: SelectChangeEvent<HTMLSelectElement>) => {
            onFieldChange(
                e.target.name as keyof SongFormState['values'],
                e.target.value.toString()
            )
        }, [onFieldChange]
    )

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            setIsSubmitting(true);
            try {
                await onSubmit(formValues);
            } finally {
                setIsSubmitting(false);
            }
        },
        [formValues, onSubmit],
    );

    const handleReset = React.useCallback(() => {
        if (onReset) {
            onReset(formValues);
        }
    }, [formValues, onReset]);

    const handleBack = React.useCallback(() => {
        navigate(backButtonPath ?? '/employees');
    }, [navigate, backButtonPath]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      onReset={handleReset}
      sx={{ width: '100%' }}
    >
          <FormGroup>
              <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                      <TextField
                          value={formValues.title ?? ''}
                          onChange={handleTextFieldChange}
                          name="title"
                          label="Title"
                          error={!!formErrors.title}
                          helperText={formErrors.title ?? ' '}
                          fullWidth
                      />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                    <TextField
                        value={formValues.arranger}
                        onChange={handleTextFieldChange}
                        name="arranger"
                        label="Arranger"
                        error={!!formErrors.arranger}
                        helperText={formErrors.arranger ?? ' '}
                        fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                      <FormControl error={!!formErrors.key} fullWidth>
                          <InputLabel id="song-key-label">Key</InputLabel>
                          <Select
                              value={formValues.key ?? ''}
                              onChange={handleSelectFieldChange as SelectProps['onChange']}
                              labelId="song-key-label"
                              name="key"
                              label="Key"
                              defaultValue=""
                              fullWidth
                          >
                              <MenuItem value="A">A</MenuItem>
                              <MenuItem value="Bb">Bb</MenuItem>
                              <MenuItem value="B">B</MenuItem>
                          </Select>
                          <FormHelperText>{formErrors.key ?? ' '}</FormHelperText>
                      </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                      <TextField
                          type="number"
                          value={formValues.durationSec ?? ''}
                          onChange={handleNumberFieldChange}
                          name="durationSec"
                          label="Duration in Seconds"
                          error={!!formErrors.durationSec}
                          helperText={formErrors.durationSec ?? ' '}
                          fullWidth
                      />
                  </Grid>
              </Grid>
          </FormGroup>
          <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                  variant="contained"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
              >
                  Back
              </Button>
              <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={isSubmitting}
              >
                  {submitButtonLabel}
              </Button>
          </Stack>          
      </Box>
    )
}
