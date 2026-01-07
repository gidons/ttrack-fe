import React from 'react';
import { Song, STD_VOICING_LIST } from '../types';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router';
import { verifyIsSongExceptId } from '../data/songs';

export interface SongFormProps {
    initialValues: Partial<Song>;
    onSubmit: (formValues: Partial<Song>) => Promise<void>;
    onReset?: (formValues: Partial<Song>) => void;
    submitButtonLabel: string;
    backButtonPath?: string;
}

export default function SongForm(props: SongFormProps) {
    const {
        initialValues,
        onSubmit,
        onReset,
        submitButtonLabel,
        backButtonPath
    } = props;

    const textValue = (v: string) => v
    const numberValue = (v: string) => Number(v)

    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [formValues, setFormValues] = React.useState<Partial<Song>>(initialValues)
    const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof Song, string>>>({})

    type MyEvent = { target: { name: string, value: unknown } }

    const handleFieldChange = React.useCallback(
        (e: MyEvent, converter: (text: string) => unknown) => {
            const value = converter(e.target.value as string)
            setFormValues((old: Partial<Song>) => ({ ...old, [e.target.name]: value }))
        }, [setFormValues]
    );

    const handleFieldChangeFor = (converter: (text: string) => unknown) => (e: MyEvent) => handleFieldChange(e, converter);
    
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
        navigate(backButtonPath ?? '/songs');
    }, [navigate, backButtonPath]);

    function makeTextField(property: string, name: string, label: string, smSize: number) {
        return (
            <Grid size={{ xs: 12, sm: smSize }} sx={{ display: 'flex' }}>
                <TextField
                    value={formValues[property] ?? ''}
                    onChange={handleFieldChangeFor(textValue)}
                    name={name}
                    label={label}
                    error={!!formErrors[name]}
                    helperText={formErrors[name] ?? ' '}
                    fullWidth
                />
            </Grid>
        );
    }

    function makeDropdownField(property: string, name: string, label: string, smSize: number, options: object) {
        return (
            <Grid size={{ xs: 12, sm: smSize }} sx={{ display: 'flex' }}>
                <FormControl error={!!formErrors[property]} fullWidth>
                    <InputLabel id="song-voicing-label">{label}</InputLabel>
                    <Select
                        value={formValues[property] ?? ''}
                        onChange={handleFieldChangeFor(textValue)}
                        labelId={`song-${name}-label`}
                        name={name}
                        label={label}
                        defaultValue=""
                        fullWidth
                    >{
                        Object.keys(options).map(k =>  
                            <MenuItem key={`${name}-${k}`} value={k}>{options[k]}</MenuItem>
                        )
                    }
                    </Select>
                    <FormHelperText>{formErrors.voicing ?? ' '}</FormHelperText>
                </FormControl>
            </Grid>
        )
    }

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
                {makeTextField('title', 'title', 'Title', 6)}
                {makeTextField('shortTitle', 'shortTitle', 'Short Title', 6)}
                {makeTextField('arranger', 'arranger', 'Arranger', 4)}
                {makeDropdownField('key', 'key', 'Key', 4, {
                    A: "A", 
                    Bb: "B♭",
                    B: "B",
                    C: "C",
                    "C#": "C♯" 
                })}
                {makeDropdownField('voicing', 'voicing', 'Voicing', 4, Object.fromEntries(STD_VOICING_LIST.map(v => ([v.name, v.displayName]))))}
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
                  disabled={verifyIsSongExceptId(formValues)}
                  loading={isSubmitting}
              >
                  {submitButtonLabel}
              </Button>
          </Stack>          
      </Box>
    )
}
