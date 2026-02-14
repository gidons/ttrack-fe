import { ArrowBack, Bookmark, Clear, Delete, Edit, Save } from "@mui/icons-material";
import { Button, IconButton, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import React from "react";
import { useNavigate, useParams } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { millisToMST, Song, TIMED_TEXT_SHARED_PART, TimedTextByPart, TimedTextData, TimedTextEntry } from "../../types";
import AudioPlayer from "../common/AudioPlayer";
import LoadingComponent from "../common/LoadingComponent";
import PageContainer from "../common/PageContainer";

export default function EditBookmarks() {
    const { songId } = useParams()

    const backend = useBackend()
    const notifications = useNotifications()
    const dialogs = useDialogs()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = React.useState(true);
    const [song, setSong] = React.useState<Song>(null)
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [bookmarks, setBookmarks] = React.useState<TimedTextByPart>({})
    const [selectedPart, setSelectedPart] = React.useState(TIMED_TEXT_SHARED_PART)
    const [playPositionMs, setPlayPositionMs] = React.useState(0)

    const songClient = backend.song(songId)
    const isSharedSelected = (selectedPart == TIMED_TEXT_SHARED_PART)
    const selectedBookmarks = bookmarks[selectedPart] ?? []
    const sharedBookmarks = isSharedSelected ? [] : (bookmarks[TIMED_TEXT_SHARED_PART] ?? [])
    
    /**
     * An entry in the combined list of bookmarks, consisting of the bookmark and
     * its index in selectedBookmarks, which is -1 if it's not there (i.e. it's shared).
     */
    type BookmarkHolder = [TimedTextEntry, number]
    const combinedBookmarks = React.useMemo(() => 
        selectedBookmarks.map((e, i) => [e, i] as BookmarkHolder)
            .concat(sharedBookmarks.map(e => [e, -1] as BookmarkHolder))
            .sort((a, b) => a[0].t - b[0].t), [bookmarks, selectedPart])

    const loadData = React.useCallback(async () => {
        setIsSaving(false)
        const fetchedSong = await songClient.get();
        if (!fetchedSong.mediaUrl) {
            throw new Error("This page requires that the song have media in order to set bookmarks, but this song doesn't.")
        }
        const fetchedData = (await songClient.getText())?.getType('BOOKMARKS')
        setSong(fetchedSong)
        setBookmarks(fetchedData)
    }, [setIsSaving, setSong, setBookmarks])

    const reload = React.useCallback(() => { setIsLoading(true) }, [setIsLoading])

    const handleSave = React.useCallback(async () => {
        setIsSaving(true)
        try {
            await songClient.putText(TimedTextData.forType('BOOKMARKS', bookmarks))
            notifications.show('Measure timing saved', { severity: 'success', autoHideDuration: 2000 })
            setIsEditing(false)
        } catch (saveError) {
            notifications.show(`Failed to save measure timing: ${(saveError as Error).message}`, { severity: 'error' })
        } finally {
            setIsSaving(false)
        }
    }, [bookmarks, songClient, notifications, setIsSaving, setIsEditing, reload])

    /**
     * Apply the given function to the list of bookmarks for the selected part
     * TODO: Consider tracking the selected bookmarks as separate state, and only copying
     * them back to the overall map on-demand, i.e. when saving or when switching parts.
     */
    const setSelectedBookmarks = React.useCallback((func: (prev: TimedTextEntry[]) => TimedTextEntry[]) => {
        setBookmarks(prev => Object.fromEntries(
            Object.entries(prev).map(e => [e[0], e[0] == selectedPart ? func(e[1]) : e[1]])
        ))
    }, [setBookmarks, selectedPart])

    const handleClear = React.useCallback(async() => {
        const confirmed = await dialogs.confirm(
            `Are you sure you want to clear all the bookmarks for ${selectedPart}?`,
            {
                title: `Clear measure times for ${selectedPart}?`,
                severity: 'error',
                okText: 'Clear',
                cancelText: 'Cancel',
            },
        );
        if (confirmed) {
            setSelectedBookmarks(() => [])
        }
    }, [setBookmarks, dialogs]);

    const handleMark = React.useCallback(() => {
        setSelectedBookmarks(prev => prev.concat({ t: playPositionMs, v: "" }).sort((a,b) => a.t - b.t))
    }, [playPositionMs, setSelectedBookmarks])

    const handleDescriptionChange = React.useCallback((index: number, value: string) => {
        setSelectedBookmarks(prev => prev.map((e, i) => i === index ? { ...e, v: value } : e))        
    }, [setSelectedBookmarks])

    const handleDelete = (index: number) => {
        setSelectedBookmarks(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <PageContainer
            title={song ? `${song.title} Bookmarks` : "Loading..."}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: song ? `${song.title}` : "...", path: `/songs/${songId}` },
                { title: 'Bookmarks' }
            ]}
        >
            <LoadingComponent isLoading={isLoading} setIsLoading={setIsLoading} loadData={loadData}>
                <Stack spacing={2}>
                    <Stack direction='row' justifyContent={'space-between'}>
                        <Button
                          variant="contained"
                          startIcon={<ArrowBack/>}
                          onClick={() => navigate(`/songs/${songId}`)}
                        >
                            Back
                        </Button>
                        <Stack direction="row" spacing={2}>
                            {isEditing ?
                            <Button
                                color="primary"
                                variant="contained"
                                loading={isSaving}
                                startIcon={<Save/>}
                                onClick={handleSave}
                            >
                                Save
                            </Button> 
                            :
                            <Button
                                color="primary"
                                variant="contained"
                                startIcon={<Edit/>}
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>} 
                            <Button
                                color="primary"
                                disabled={isSaving}
                                startIcon={<Clear/>}
                                onClick={handleClear}
                            >
                                Clear All
                            </Button> 
                        </Stack>
                    </Stack>
                    <AudioPlayer 
                        marks={selectedBookmarks} 
                        mediaUrl={song?.mediaUrl} 
                        positionMs={playPositionMs} 
                        onTime={setPlayPositionMs}
                        onMark={handleMark}
                        actions={
                            <IconButton aria-label='set-mark' onClick={() => handleMark()} disabled={!isEditing}>
                                <Bookmark/>
                            </IconButton>
                        }
                        />
                        <Paper sx={{ p: 2, flex: '0 0 auto', overflow: 'auto' }}>
                            <Stack direction="row" spacing={2} alignItems={"center"}>
                                <Typography variant="subtitle1" gutterBottom>Bookmarks for </Typography>
                                <Select
                                    value={selectedPart}
                                    onChange={e => setSelectedPart(e.target.value)}
                                >
                                    <MenuItem value={TIMED_TEXT_SHARED_PART}>All Parts</MenuItem>
                                    {song?.parts?.map((part) => 
                                        <MenuItem key={part} value={part}>{part}</MenuItem>
                                    )}
                                </Select>
                            </Stack>
                            {combinedBookmarks.length === 0 ? (<Typography color="text.secondary">
                                No bookmarks yet. {
                                isEditing ? "Use the bookmark icon to insert one at the current play time."
                                          : "Click Edit to start adding some."}
                            </Typography>

                            ) : (
                            <Table size="small" sx={{overflowY: 'auto'}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: 80 }}>Time</TableCell>
                                        <TableCell sx={{ flex: 1 }}>Description</TableCell>
                                        <TableCell sx={{ width: '80px' }} align="center">&nbsp;</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {combinedBookmarks.map((bmh, idx) => {
                                        const [bm, selectedIndex] = bmh
                                        const isShared = (selectedIndex < 0)
                                        return <TableRow key={`bm-${idx}`}>
                                            <TableCell sx={{ cursor: 'pointer' }}
                                                onClick={() => { setPlayPositionMs(bm.t) }}>{millisToMST(bm.t)}
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    fullWidth
                                                    variant="standard"
                                                    value={bm.v}
                                                    disabled={isShared}
                                                    onChange={(e) => handleDescriptionChange(selectedIndex, e.target.value)}
                                                    placeholder="Enter description"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleDelete(selectedIndex)}
                                                    disabled={isShared}
                                                    aria-label="delete">
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    })}
                                </TableBody>
                            </Table>)}
                        </Paper>
                </Stack>
            </LoadingComponent>
        </PageContainer>
    )
}