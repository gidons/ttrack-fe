import Box from '@mui/material/Box';
import * as React from 'react';
import { useNavigate } from 'react-router';

import { createSong } from "../data/songs";
import { Song } from '../types';
import PageContainer from "./PageContainer";
import SongForm from './SongForm';

export default function CreateSong() {
    const navigate = useNavigate();

    const handleSubmit = React.useCallback(async (formValues: Partial<Song>) => {
        const createdSong = await createSong(formValues as Song);
        if (createdSong.id) {
            navigate(`/songs/${createdSong.id}`);
        }
    }, [navigate]);

    return(
        <PageContainer
            title="New Song"
            breadcrumbs={[{ title: "Songs", path: "/songs"}, { title: "New Song" }]}
        >
            <Box sx={{ flex: 1, width: '100%' }}>
                <SongForm
                    initialValues={{}}
                    onSubmit={handleSubmit}
                    submitButtonLabel="Create"
                    backButtonPath="/songs"
                />
            </Box>
        </PageContainer>
    )
}