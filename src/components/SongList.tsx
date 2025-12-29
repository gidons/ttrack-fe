import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router';
import { Song } from '../types';
import PageContainer from './PageContainer';
import { getAllSongs } from '../data/songs';


const pageTitle = 'Songs';

export function SongList() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [songs, setSongs] = React.useState<Array<Song>>([])
    
    const navigate = useNavigate();

    const handleRowClick = React.useCallback(
        ({row}) => { navigate(`/songs/${row.id}`)
    }, [navigate]);

    const handleRowEdit = React.useCallback((row) => () => {
        navigate(`/songs/${row.id}/edit`);
    }, [navigate]);

    const handleRowDelete = React.useCallback((row) => () => {
        alert(`Deleting song ID ${row.id}`);
    }, []);
    
    const columns = React.useMemo<GridColDef[]>(() => [
        { field: 'title', headerName: 'Title', width: 300 },
        { field: 'shortTitle', headerName: 'Short Title', width: 150 },
        { field: 'arranger', headerName: 'Arranger', width: 150 },
        { field: 'key', headerName: 'Key', width: 80 },
        // { field: 'durationSec', headerName: 'Duration', type: 'number', width: 80, valueFormatter: secondsToHMS },
        {
            field: 'actions',
            type: 'actions',
            flex: 1,
            align: 'right',
            getActions: ({row}: GridRowParams) => {
                console.log(`getActions param: ${row.title}`)
                return [
                <GridActionsCellItem
                    key="edit-item"
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={handleRowEdit(row)}
                />,
                <GridActionsCellItem
                    key="delete-item"
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={handleRowDelete(row)}
                />,
            ]},
        },

    ], [handleRowClick, handleRowEdit, handleRowDelete]);

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

    const handleCreateClick = React.useCallback(() => {
        navigate('/songs/new');
    }, [navigate]);

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
                        onRowClick={handleRowClick}
                        loading={isLoading}
                    />
                )}
            </Box>
        </PageContainer>
    );
}