import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import React from "react";
import { useBackend } from "../backend/useBackend";
import useNotifications from '../hooks/useNotifications/useNotifications';
import { PartTrack, TimedTextEntry, millisToMST } from "../types";
import AudioPlayer from './common/AudioPlayer'
import { Bookmark } from '@mui/icons-material';

export interface BookmarksEditorProps {
    partTrack: PartTrack,
}

export default function BookmarksEditor({partTrack}: BookmarksEditorProps) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);
    const [bookmarks, setBookmarks] = React.useState<TimedTextEntry[]>([])
    const [playPositionMs, setPlayPositionMs] = React.useState(0)
    const backend = useBackend();
    const songId = partTrack.songId
    const part = partTrack.part
    const songClient = backend.song(songId)
    const partClient = songClient.part(part)
    const mediaUrl = partTrack.mediaUrl
    // audioRef removed; AudioPlayer owns the audio element
    const notifications = useNotifications()
    const [isSaving, setIsSaving] = React.useState(false)

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true)
        try {
            const entries = await partClient.getText("BOOKMARKS")
            // ensure entries are sorted by time
            const sorted = (entries || []).slice().sort((a: TimedTextEntry, b: TimedTextEntry) => a.t - b.t)
            setBookmarks(sorted)
        } catch (fetchError) {
            setError(fetchError as Error)
        }
        setIsLoading(false)
    }, [setIsLoading, setBookmarks, setError, songId, part])

    React.useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAdd = (ms: number) => {
        const newEntry: TimedTextEntry = { t: Math.round(ms), v: "" }
        setBookmarks(prev => {
            const next = [...prev, newEntry].sort((a, b) => a.t - b.t)
            return next
        })
        // focus not required; user can edit the description in the table
    }

    const handleDescriptionChange = (index: number, value: string) => {
        setBookmarks(prev => prev.map((e, i) => i === index ? { ...e, v: value } : e))
    }

    const handleDelete = (index: number) => {
        setBookmarks(prev => prev.filter((_, i) => i !== index))
    }

    const handleSave = React.useCallback(async () => {
        setIsSaving(true)
        try {
            await partClient.putText("BOOKMARKS", bookmarks)
            notifications.show('Bookmarks saved', { severity: 'success', autoHideDuration: 2000 })
        } catch (saveError) {
            notifications.show(`Failed to save bookmarks: ${(saveError as Error).message}`, { severity: 'error' })
        } finally {
            setIsSaving(false)
        }
    }, [bookmarks, partClient, notifications])

    const formatTime = (ms: number) => {
        return millisToMST(ms)
    }

    return (
        <Stack sx={{ display: 'flex', flex: 1, width: '100%', gap: 2 }}>
            {isLoading ? (
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
            ) : error ? (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.name}: {error.message}</Alert>
                </Box>
            ) : (
                <>
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', width: '100%', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 240 }}>
                                <Typography variant="subtitle1" gutterBottom>Audio</Typography>
                                <AudioPlayer 
                                    mediaUrl={mediaUrl}
                                    marks={bookmarks} 
                                    positionMs={playPositionMs}
                                    onTime={setPlayPositionMs} 
                                actions={<>
                                    <IconButton key="bookmark" aria-label='next-mark' onClick={() => handleAdd(playPositionMs)}>
                                        <Bookmark />
                                    </IconButton>
                                </>}/>
                            </Box>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2, overflow: 'auto' }}>
                        <Typography variant="subtitle1" gutterBottom>Bookmarks</Typography>
                        {bookmarks.length === 0 ? (
                            <Typography color="text.secondary">No bookmarks yet. Use Add to insert one at the current play time.</Typography>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '120px' }}>Time</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell sx={{ width: '80px' }} align="center">&nbsp;</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {bookmarks.map((bm, idx) => (
                                        <TableRow key={`${bm.t}-${idx}`}>
                                            <TableCell sx={{ cursor: 'pointer' }}
                                                onClick={() => { setPlayPositionMs(bm.t) }}>{formatTime(bm.t)}
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    fullWidth
                                                    variant="standard"
                                                    value={bm.v}
                                                    onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                                                    placeholder="Enter description"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" onClick={() => handleDelete(idx)} aria-label="delete">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                </>
            )}
        </Stack>
    )
}