import * as React from "react";
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate, useParams } from 'react-router';
import useNotifications from '../hooks/useNotifications/useNotifications';

import SongForm, { type SongFormState, type FormFieldValue } from "./SongForm";
import { getSong, updateSong, validateSong } from "../data/songs"
import PageContainer from "./PageContainer";
import { Song } from "../types";

function SongEditForm({
    initialValues, onSubmit
}: {
    initialValues: Partial<SongFormState['values']>,
    onSubmit: (formValues: Partial<SongFormState['values']>) => Promise<void>
}) {
    const { songId } = useParams();
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [formState, setFormState] = React.useState<SongFormState>(() => ({
        values: initialValues,
        errors: {},
    }));
    const formValues = formState.values;
    const formErrors = formState.errors;

    const setFormValues = React.useCallback((newValues: Partial<SongFormState['values']>) => {
        setFormState((prevState: SongFormState) => ({ ...prevState, values: newValues }))
    }, []);
    const setFormErrors = React.useCallback((newErrors: Partial<SongFormState['errors']>) => {
        setFormState((prevState: SongFormState) => ({ ...prevState, errors: newErrors }))
    }, []);

    const handleFormFieldChange = React.useCallback((name: keyof SongFormState['values'], value: FormFieldValue) => {
        const newValues = { ...formValues, [name]: value };
        setFormValues(newValues);
        const { issues } = validateSong(newValues);
        const fieldIssues = issues?.find((issue) => issue.path == name)?.message
        setFormErrors({ ...formErrors, [name]: fieldIssues })
    }, [formValues, formErrors, setFormValues, setFormErrors])

    const handleFormReset = React.useCallback(() => {
        setFormValues(initialValues);
        setFormErrors({}); // TODO maybe not safe? Initial values might be bad?
    }, [initialValues, setFormValues, setFormErrors])

    const handleFormSubmit = React.useCallback(async () => {
        const { issues } = validateSong(formValues);
        if (issues && issues.length > 0) {
            setFormErrors(
                Object.fromEntries(issues.map((issue) => [issue.path?.[0], issue.message])),
            );
            return;
        }
        setFormErrors({});

        try {
            await onSubmit(formValues);
            notifications.show('Song edited successfully.', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            navigate(`/songs/${songId}`);
        } catch (editError) {
            notifications.show(
                `Failed to edit song. Reason: ${(editError as Error).message}`,
                {
                    severity: 'error',
                    autoHideDuration: 3000,
                },
            );
            throw editError;
        }
    }, [formValues, navigate, notifications, onSubmit, setFormErrors, songId]);

    return (
        <SongForm
            formState={formState}
            onFieldChange={handleFormFieldChange}
            onSubmit={handleFormSubmit}
            onReset={handleFormReset}
            submitButtonLabel="Save"
            backButtonPath={`/songs/${songId}`}
        />
    );
}

export default function EditSong() {
    const { songId } = useParams();

    const [song, setSong] = React.useState<Song | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const songData = await getSong(songId);
            setSong(songData);
        } catch (error) {
            setError(error as Error);
        }
        setIsLoading(false);
    }, [songId, setError, setIsLoading, setSong]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = React.useCallback(
        async (formValues: Partial<SongFormState['values']>) => {
            // WIP: formValues is not guaranteed to have everything. need to refetch???
            const updatedData = await updateSong({ ...formValues, id: songId });
            setSong(updatedData);
        },
        [songId]
    );

    const renderEdit = React.useMemo(() => {
        if (isLoading) {
            return (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        m: 1,
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }
        if (error) {
            return (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>
            );
        }

        return song ? (
            <SongEditForm initialValues={song} onSubmit={handleSubmit} />
        ) : null;
    }, [isLoading, error, song, handleSubmit]);

    return (
        <PageContainer
            title={`Edit Song ${songId}`}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: 'Edit' },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1 }}>{renderEdit}</Box>
        </PageContainer>
    );
}