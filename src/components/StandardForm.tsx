import React from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Paper, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid, { GridSize } from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { isEmpty } from './utils';

export interface FormFieldSpec {
    initialValue?: string;
    name: string;
    displayName: string;
    smSize?: GridSize;
    options?: object;
}

interface FormFieldProps extends FormFieldSpec {
    error?: string;
    onChange: (value: string) => void;
    key?: string;
    editable: boolean
}

function TextDisplayField({ initialValue, displayName, smSize, key }: FormFieldProps) {
    return (
        <Paper sx={{ px: 2, py: 1 }}>
            <Typography variant="overline">{displayName}</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
                {initialValue}&nbsp;
            </Typography>
        </Paper>
    )
}

function TextFormField(props: FormFieldProps) {
    const { initialValue, name, displayName, smSize, onChange, error, key, editable } = props
    const [value, setValue] = React.useState(initialValue)
    return (
        <Grid size={{ xs: 12, sm: smSize }} sx={editable ? { display: 'flex' } : {}} key={key}>
            { editable ? (
            <TextField
                value={value || ""}
                onChange={(e) => { setValue(e.target.value); onChange(e.target.value) }}
                name={name}
                label={displayName}
                error={!!error}
                helperText={error ?? ' '}
                key={key}
                fullWidth
            />
            ) : (
                TextDisplayField({ ...props, initialValue: value })
            )}
        </Grid>
    );
}

export interface DropdownFieldProps extends FormFieldProps {
    options: object
}

export function DropdownFormField(props: DropdownFieldProps) {
    const { initialValue, error, name, displayName, smSize, options, onChange, key, editable } = props;
    const [value, setValue] = React.useState(initialValue)
    return (
        <Grid size={{ xs: 12, sm: smSize }} sx={editable ? { display: 'flex' } : {}} key={key}>
            {editable ? (
            <FormControl error={!!error} fullWidth>
                <InputLabel id={`${name}-label`}>{displayName}</InputLabel>
                <Select
                    value={value ?? ''}
                    onChange={(e) => { setValue(e.target.value); onChange(e.target.value) } }
                    labelId={`${name}-label`}
                    name={name}
                    label={displayName}
                    defaultValue=""
                    fullWidth
                >{
                    Object.keys(options).map(k =>  
                        <MenuItem key={`${name}-${k}`} value={k}>{options[k]}</MenuItem>
                    )
                }
                </Select>
                <FormHelperText>{error ?? ' '}</FormHelperText>
            </FormControl>) : (
                TextDisplayField({ ...props, initialValue: options[value] ?? "" })
            )}
        </Grid>
    )
}

export interface StandardFormProps<T> {
    initialValues: Partial<T>;
    validate: (formValues: Partial<T>) => Partial<Record<keyof T, string>>;
    submitButtonLabel: string;
    onSubmit: (formValues: Partial<T>) => Promise<void>;
    cancelButtonLabel: string;
    onCancel: () => void;
    editable: boolean;
    fields: FormFieldSpec[];
    actionButtons?: JSX.Element;
}

/**
 * A simple standardized form for entering and/or displaying data in a typed "bean".
 * How this works:
 * - The caller provides a list of FormFieldSpecs, each describing a field that maps to a specific property.
 * - The StandardForm renders a component for each field, e.g. a TextFormField or a DropdownFormField.
 * - Each field component is responsible for maintaining its value.
 * - The form maintains the value of the "bean", but this is NOT used in rendering the field components,
 *   which prevents looping updates.
 * - When the value changes, the field component calls back to the form. The form then updates its bean
 *   state (again, this does not flow back to the components).
 * - On value change, the form also validates the bean, getting back a map of field-name to error. These
 *   errors are passed down to the field components as a prop.
 * - When the Submit button is clicked, the form passes the state from its internal bean to the submit callback.
 */
export default function StandardForm<T>(props: StandardFormProps<T>) {
    const {
        initialValues,
        validate,
        submitButtonLabel,
        onSubmit,
        cancelButtonLabel,
        onCancel,
        editable,
        fields,
        actionButtons
    } = props;

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [formValues, setFormValues] = React.useState<Partial<T>>(initialValues)
    const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof T, string>>>({})

    const propsToField = React.useCallback((props: FormFieldSpec) => {
        // eslint-disable-next-line react/prop-types
        const { name } = props
        const fullProps: FormFieldProps = { ...props, 
            onChange: (value) => { setFormValues((old: Partial<T>) => ({ ...old, [name]: value })) },
            initialValue: initialValues[name],
            key: `field-${name}`,
            editable: editable
        }
        if (fullProps['options']) {
            return DropdownFormField(fullProps as DropdownFieldProps)
        } else {
            return TextFormField(fullProps)
        }
    }, [initialValues, editable, setFormValues])

    React.useEffect(() => {
        // console.log(`Validating: ${JSON.stringify(formValues)}`)
        const errors = validate(formValues)
        // console.log(`Errors: ${JSON.stringify(errors)}`)
        setFormErrors(errors)
    }, [formValues, setFormErrors])

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

    return (
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        autoComplete="off"
        sx={{ width: '100%' }}
      >
        <FormGroup>
            <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
                {fields.map(propsToField)}
            </Grid>
        </FormGroup>
        {editable ? (
          <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                  variant="contained"
                  startIcon={<ArrowBackIcon />}
                  onClick={onCancel}
              >
                  {cancelButtonLabel}
              </Button>
              <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!isEmpty(formErrors)}
                  loading={isSubmitting}
              >
                  {submitButtonLabel}
              </Button>
          </Stack>) : actionButtons} 
      </Box>
    )
}
