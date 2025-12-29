import * as React from "react";
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate, useParams } from 'react-router';

import SongForm, { type SongFormState } from "./SongForm";
import { getSong, updateSong } from "../data/songs"
import PageContainer from "./PageContainer";
import { Song } from "../types";
import { useSongFormManager } from '../hooks/useSongFormManager';

export default function EditSong() {
    const { songId } = useParams();
    const navigate = useNavigate();

    const [song, setSong] = React.useState<Song | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const songData = await getSong(songId);
            setSong(songData);
        } catch (err) {
            setError(err as Error);
        }
        setIsLoading(false);
    }, [songId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmitSuccess = React.useCallback(() => {
        navigate(`/songs/${songId}`);
    }, [songId, navigate]);

    const { formState, handleFormFieldChange, handleFormReset, handleFormSubmit } = 
        useSongFormManager({
            initialValues: song || {},
            onSubmit: async (formValues) => {
                const updatedData = await updateSong({ ...formValues, id: songId });
                setSong(updatedData);
            },
            onSubmitSuccess: handleSubmitSuccess,
            successMessage: 'Song edited successfully.',
            errorMessagePrefix: 'Failed to edit song',
        });

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
            <SongForm
                formState={formState}
                onFieldChange={handleFormFieldChange}
                onSubmit={handleFormSubmit}
                onReset={handleFormReset}
                submitButtonLabel="Save"
                backButtonPath={`/songs/${songId}`}
            />
        ) : null;
    }, [isLoading, error, song, formState, handleFormFieldChange, handleFormSubmit, handleFormReset, songId]);

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