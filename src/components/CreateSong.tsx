import * as React from 'react';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router';

import SongForm, { type SongFormState } from "./SongForm";
import { createSong } from "../data/songs"
import PageContainer from "./PageContainer";
import { useSongFormManager } from '../hooks/useSongFormManager';

export default function CreateSong() {
    const navigate = useNavigate();
    const [createdSongId, setCreatedSongId] = React.useState<string | null>(null);

    const handleSubmitSuccess = React.useCallback(() => {
        if (createdSongId) {
            navigate(`/songs/${createdSongId}`);
        }
    }, [createdSongId, navigate]);

    const { formState, handleFormFieldChange, handleFormReset, handleFormSubmit } = 
        useSongFormManager({
            initialValues: {},
            onSubmit: async (formValues) => {
                const createdSong = await createSong(formValues as any);
                setCreatedSongId(createdSong.id);
            },
            onSubmitSuccess: handleSubmitSuccess,
            successMessage: 'Song created successfully.',
            errorMessagePrefix: 'Failed to create song',
        });

    return(
        <PageContainer
            title="New Song"
            breadcrumbs={[{ title: "Songs", path: "/songs"}, { title: "New Song" }]}
        >
            <Box sx={{ flex: 1, width: '100%' }}>
                <SongForm
                    formState={formState}
                    onFieldChange={handleFormFieldChange}
                    onSubmit={handleFormSubmit}
                    onReset={handleFormReset}
                    submitButtonLabel="Create"
                    backButtonPath="/songs"
                />
            </Box>
        </PageContainer>
    )
}