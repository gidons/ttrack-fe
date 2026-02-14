import { ArrowBack, Bookmark, Clear, Delete, Edit, Save } from "@mui/icons-material";
import { Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import React, { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { millisToMST, Song, TimedTextEntry } from "../../types";
import AudioPlayer from "../common/AudioPlayer";
import LoadingComponent from "../common/LoadingComponent";
import PageContainer from "../common/PageContainer";
import SheetMusicViewer from "../sheet/SheetMusicViewer";
import { SheetMusicViewerContext } from "../sheet/SheetMusicViewerContext";

export default function EditMeasures() {
    const { songId } = useParams()

    const backend = useBackend()
    const notifications = useNotifications()
    const dialogs = useDialogs()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = React.useState(true);
    const [song, setSong] = React.useState<Song>(null)
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [measureTimes, setMeasureTimes] = React.useState<TimedTextEntry[]>([])
    const [playPositionMs, setPlayPositionMs] = React.useState(0)
    const [nextMeasureNum, setNextMeasureNum] = React.useState(1)
    const [currEntryIndex, setCurrEntryIndex] = React.useState(0)

    const sheetZoom = 0.7
    const songClient = backend.song(songId)
    const hasNotation = !!song?.notationUrl

    const loadData = React.useCallback(async () => {
        setIsSaving(false)
        const fetchedSong = await songClient.get();
        if (!fetchedSong.mediaUrl) {
            throw new Error("This page requires that the song have media in order to set measure times, but this song doesn't.")
        }
        const fetchedData = (await songClient.getText())?.getPart('ALL')['MEASURES'] ?? []
        setSong(fetchedSong)
        setMeasureTimes(fetchedData)
    }, [setIsSaving, setSong])

    const reload = React.useCallback(() => { setIsLoading(true) }, [setIsLoading])

    const handleSave = React.useCallback(async () => {
        setIsSaving(true)
        try {
            await songClient.part("ALL").putText("MEASURES", measureTimes)
            notifications.show('Measure timing saved', { severity: 'success', autoHideDuration: 2000 })
            setIsEditing(false)
        } catch (saveError) {
            notifications.show(`Failed to save measure timing: ${(saveError as Error).message}`, { severity: 'error' })
        } finally {
            setIsSaving(false)
        }
    }, [measureTimes, songClient, notifications, setIsSaving, setIsEditing, reload])

    const handleClear = React.useCallback(async() => {
        const confirmed = await dialogs.confirm(
            `Are you sure you want to clear all the measure times?`,
            {
                title: `Clear measure times?`,
                severity: 'error',
                okText: 'Clear',
                cancelText: 'Cancel',
            },
        );
        if (confirmed) {
            setMeasureTimes([])
        }
    }, [setMeasureTimes, dialogs]);

    const handleMark = React.useCallback(() => {
        const newIndex = Math.min(currEntryIndex, measureTimes.length)
        measureTimes[newIndex] = { t: playPositionMs, v: `${nextMeasureNum}`}
        setCurrEntryIndex(newIndex + 1)
        setMeasureTimes(measureTimes)
        setNextMeasureNum(nextMeasureNum + 1)
    }, [playPositionMs, nextMeasureNum, currEntryIndex, measureTimes,
        setNextMeasureNum, setMeasureTimes, setCurrEntryIndex,
    ])

    const handleDelete = (index: number) => {
        setMeasureTimes(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <PageContainer
            title={song ? `${song.title} Notation File (MusicXML)` : "Loading..."}
            breadcrumbs={[
                { title: 'Songs', path: '/songs' },
                { title: song ? `${song.title}` : "...", path: `/songs/${songId}` },
                { title: 'Notation' }
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
                                disabled={!hasNotation}
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
                                disabled={!hasNotation}
                                startIcon={<Edit/>}
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>} 
                            <Button
                                color="primary"
                                disabled={!hasNotation || isSaving}
                                startIcon={<Clear/>}
                                onClick={handleClear}
                            >
                                Clear All
                            </Button> 
                        </Stack>
                    </Stack>
                    <AudioPlayer 
                        marks={measureTimes} 
                        mediaUrl={song?.mediaUrl} 
                        positionMs={playPositionMs} 
                        onTime={setPlayPositionMs}
                        onMark={handleMark}
                        actions={
                            <>
                            <IconButton aria-label='set-mark' onClick={() => handleMark()} disabled={!isEditing}>
                                <Bookmark/>
                            </IconButton>
                            <TextField
                                sx={{ width: '60px' }}
                                value={nextMeasureNum}
                                contentEditable={false}
                                slotProps={{
                                    htmlInput: { style: { textAlign: 'center' } } 
                                }}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNextMeasureNum(parseInt(e.target.value))}
                                />
                            </>
                        }
                        />
                    <Stack direction='row' sx={{ maxHeight: '70vh', display: 'flex', flexDirection: 'row' }}>
                        <Paper sx={{ p: 2, width: '20%', flex: '0 0 auto', overflow: 'auto' }}>
                            <Typography variant="subtitle1" gutterBottom>Measure Times</Typography>
                            {measureTimes.length === 0 ? (<Typography color="text.secondary">
                                No times yet. {
                                isEditing ? "Use the bookmark icon to insert one at the current play time."
                                          : "Click Edit to start adding some."}
                            </Typography>
                            ) : (
                            <Table size="small" sx={{overflowY: 'auto'}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '120px' }}>Time</TableCell>
                                        <TableCell>Measure#</TableCell>
                                        <TableCell sx={{ width: '80px' }} align="center">&nbsp;</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {measureTimes.map((bm, idx) => (
                                        <TableRow key={`${bm.t}-${idx}`}>
                                            <TableCell sx={{ cursor: 'pointer' }}
                                                onClick={() => { setPlayPositionMs(bm.t) }}>{millisToMST(bm.t)}
                                            </TableCell>
                                            <TableCell align="center">
                                                {bm.v}
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" onClick={() => handleDelete(idx)} aria-label="delete">
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>)}
                        </Paper>
                        {hasNotation && <Box sx={{ flex: 1, minHeight: 0, alignSelf: 'stretch' }}>
                            <SheetMusicViewerContext.Provider value={{zoom: sheetZoom, background: '#cccccc'}}>
                                <SheetMusicViewer 
                                    sheetUrl={song.notationUrl} 
                                    highlightedMeasureNum={nextMeasureNum}
                                    onClickMeasure={setNextMeasureNum}
                                    sx={{ height: '100%', overflowY: 'auto' }}
                                    highlightSx={{ background: 'orange', border: 0 }}
                                />
                            </SheetMusicViewerContext.Provider>
                        </Box>}
                    </Stack>
                </Stack>
            </LoadingComponent>
        </PageContainer>
    )
}