import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import * as React from 'react';
import { useNavigate } from 'react-router';
import { useBackend } from '../../backend/useBackend';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import { STD_VOICING_LIST, type Song } from '../../types';
import KeyField from '../common/KeyField';
import PageContainer from '../common/PageContainer';
import StandardForm from '../common/StandardForm';


export default function CreateSong() {

    const backend = useBackend();
    const navigate = useNavigate();
    const notifications = useNotifications()

    const handleBack = React.useCallback(() => {
        navigate('/songs');
    }, [navigate]);

    const handleEditSubmit = React.useCallback(async (formValues) => {
        try {
            const newSong = await backend.createSong(formValues);
            navigate(`/songs/${newSong.id}`)
            notifications.show('Song created successfully.', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch(error) {
            notifications.show(`Failed to save song. Reason: ${(error as Error).message}`, {
                severity: 'error',
                autoHideDuration: 3000
            })
        }
    }, [navigate])
    
    return (
        <PageContainer
            title={"New Song"}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: "New" },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>
                <StandardForm<Song>
                    initialValues={{}}
                    submitButtonLabel='Save'
                    cancelButtonLabel='Cancel'
                    onSubmit={handleEditSubmit}
                    onCancel={() => { navigate(`/songs/`) }}
                    // TODO add validation
                    validate={(song: Partial<Song>) => { return {} }}
                    editable={true}
                    fields={[
                        {name: "title", displayName: "Title", smSize: 6},
                        {name: "shortTitle", displayName: "Short Title", smSize: 6},
                        {name: "arranger", displayName: "Arranger", smSize: 4},
                        {name: "key", displayName: "Key", smSize: 4, type: KeyField},
                        {name: "voicing", displayName: "Voicing", smSize: 4, options: 
                            Object.fromEntries(STD_VOICING_LIST.map(v => ([v.name, v.displayName])))
                        }
                    ]}
                    actionButtons={(
                    <Stack direction="row" spacing={2} justifyContent="space-between">
                        <Button
                            variant="contained"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                    </Stack>)}/>
            </Box>
        </PageContainer>
    );
}
