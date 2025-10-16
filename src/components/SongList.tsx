import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
// import AddIcon from '@mui/icons-material/Add';
// import RefreshIcon from '@mui/icons-material/Refresh';
// import EditIcon from '@mui/icons-material/Edit';
import { Add as AddIcon, Edit as EditIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Song } from '../types';
import PageContainer from './PageContainer';
import { getAllSongs } from '../data/songs'


interface SongListProps {
}

const pageTitle = 'Songs';

export function SongList({ }: SongListProps) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [songs, setSongs] = React.useState<Array<Song>>([])

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Title', width: 300 },
        { field: 'arranger', headerName: 'Arranger', width: 150 },
        { field: 'key', headerName: 'Key', width: 80 },
        { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80,
            valueFormatter: secondsToHMS
         },   
    ];     

    function secondsToHMS(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const hDisplay = h > 0 ? h + ":" : "";
        const mDisplay = m > 0 ? m + ":" : "";
        const sDisplay = s.toString().padStart(2, '0');
        return (hDisplay + mDisplay + sDisplay).trim();
    }
    
    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const fetchedSongs = await getAllSongs();
            setSongs(fetchedSongs)
        } catch (listDataError) {
            setError(listDataError as Error);
        }

        setIsLoading(false);
    }, []);

    const handleRefresh = React.useCallback(() => { 
        if (!isLoading) { loadData() } 
    }, [isLoading, loadData])
    function handleCreateClick() { return <Alert severity="info">Creating</Alert> }

    React.useEffect(() => { loadData() }, [loadData])

    return (
        <PageContainer
            title={pageTitle}
            breadcrumbs={[{ title: pageTitle }]}
            actions={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        <div>
                            <IconButton size="small" aria-label="refresh" onClick={handleRefresh}>
                                <RefreshIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                    <Button
                        variant="contained"
                        onClick={handleCreateClick}
                        startIcon={<AddIcon />}
                    >
                        Create
                    </Button>
                </Stack>
            }
        >
            <Box sx={{ flex: 1, width: '100%' }}>
                {error ? (
                    <Box sx={{ flexGrow: 1 }}>
                        <Alert severity="error">{error.message}</Alert>
                    </Box>
                ) : (
                    <DataGrid
                        rows={songs}
                        columns={columns}
                        getRowId={(row) => row.id}
                    />
                )}
            </Box>
        </PageContainer>
    );
}