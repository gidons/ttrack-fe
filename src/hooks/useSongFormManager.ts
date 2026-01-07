import * as React from 'react';
import { SongFormState, FormFieldValue } from '../components/SongForm';
import { validateSong } from '../data/songs';
import useNotifications from './useNotifications/useNotifications';

/*
 * TODO This code is now deprecated. I'm only keeping it around in case there's
 * stuff here that will be useful for making the SimpleSongForm better or for
 * generalizing it. 
 */

interface UseSongFormManagerConfig {
    initialValues: Partial<SongFormState['values']>;
    onSubmit: (formValues: Partial<SongFormState['values']>) => Promise<void>;
    onSubmitSuccess: () => void;
    successMessage: string;
    errorMessagePrefix: string;
}

export function useSongFormManager(config: UseSongFormManagerConfig) {
    const {
        initialValues,
        onSubmit,
        onSubmitSuccess,
        successMessage,
        errorMessagePrefix,
    } = config;
    console.log(`useSongFormManager: initialValues=${JSON.stringify(initialValues)}`)

    const notifications = useNotifications();
    const [formState, setFormState] = React.useState<SongFormState>(() => ({
        values: initialValues,
        errors: {},
    }));

    // Keep local form state in sync when initialValues changes (e.g. after loading)
    React.useEffect(() => {
        if (JSON.stringify(formState.values) == JSON.stringify(initialValues)) { return }
        console.log(`Updating formState to new initialValues`)
        // Replace values with new initialValues (e.g. after async load) and clear errors
        setFormState({ values: initialValues, errors: {} });
    }, [initialValues]);

    const formValues = formState.values;
    const formErrors = formState.errors;

    const setFormValues = React.useCallback((newValues: Partial<SongFormState['values']>) => {
        setFormState((prevState) => ({ ...prevState, values: newValues }));
    }, [setFormState]);

    const setFormErrors = React.useCallback((newErrors: Partial<SongFormState['errors']>) => {
        setFormState((prevState) => ({ ...prevState, errors: newErrors }));
    }, [setFormState]);

    const handleFormFieldChange = React.useCallback(
        (name: keyof SongFormState['values'], value: FormFieldValue) => {
            console.log(`Field change: ${name}='${value}'`)
            const newValues = { ...formValues, [name]: value };
            setFormValues(newValues);
            const { issues } = validateSong(newValues);
            const fieldIssues = issues?.find((issue) => issue.path === name)?.message;
            setFormErrors({ ...formErrors, [name]: fieldIssues });
        },
        [formValues, formErrors, setFormValues, setFormErrors]
    );
    
    const handleFormReset = React.useCallback(() => {
        setFormErrors({});
        setFormValues(initialValues);
    }, [initialValues, setFormValues, setFormErrors]);

    const handleFormSubmit = React.useCallback(async () => {
        const { issues } = validateSong(formValues);
        if (issues && issues.length > 0) {
            setFormErrors(
                Object.fromEntries(
                    issues.map((issue) => [issue.path?.[0], issue.message])
                )
            );
            return;
        }
        setFormErrors({});

        try {
            await onSubmit(formValues);
            notifications.show(successMessage, {
                severity: 'success',
                autoHideDuration: 3000,
            });
            onSubmitSuccess();
        } catch (error) {
            notifications.show(
                `${errorMessagePrefix}: ${(error as Error).message}`,
                {
                    severity: 'error',
                    autoHideDuration: 3000,
                }
            );
            throw error;
        }
    }, [formValues, notifications, onSubmit, setFormErrors, successMessage, errorMessagePrefix, onSubmitSuccess]);

    return {
        formState,
        formValues,
        formErrors,
        handleFormFieldChange,
        handleFormReset,
        handleFormSubmit,
    };
}
