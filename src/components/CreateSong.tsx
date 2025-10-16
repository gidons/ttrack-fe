import * as React from 'react';

import SongForm from './SongForm';
import PageContainer from './PageContainer';
import { Box } from '@mui/material';

export default function CreateSong() {
    return(
        <PageContainer
            title="New Song"
            breadcrumbs={ [{ title: "Songs", path: "/songs"}, { title: "New Song" }] }
        >
            <Box sx={{ flex: 1, width: '100%' }}>
                TESTING 123
            </Box>
        </PageContainer>
    )
}