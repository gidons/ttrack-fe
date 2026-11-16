import { ArrowBack, Bookmark, Check, ChevronLeft, ChevronRight, Clear, Delete, Edit, PlayArrow, Save, VerticalSplit } from "@mui/icons-material";
import { Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import React, { ChangeEvent } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { millisToMST, TIMED_TEXT_SHARED_PART, TimedTextEntry } from "../../types";
import AudioPlayer, { AudioPlayerHandle } from "../common/AudioPlayer";
import LoadingComponent from "../common/LoadingComponent";
import SheetMusicViewer from "../sheet/SheetMusicViewer";
import { SheetMusicViewerContext } from "../sheet/SheetMusicViewerContext";
import { SongPageContext } from "../song/SongPage";
import { scrollIntoContainerView } from "../utils";
import { allNamed, canShift, deleteMeasure, markMeasure, MEASURE_SHIFT_MS, renameMeasure, shiftMeasure, splitMeasure } from "./measureTimes";

/** An icon button that can carry a tooltip even when it is disabled. */
function RowButton({ label, tooltip = label, disabled = false, onClick, children }: {
    label: string
    tooltip?: string
    disabled?: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <Tooltip title={tooltip} enterDelay={600}>
            <span>
                <IconButton size="small" aria-label={label} disabled={disabled} onClick={onClick}>
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    )
}

export default function EditMeasures() {
    const { songState: [song, setSong], asyncData, reloadAsyncData, setChildProps } = useOutletContext<SongPageContext>()

    const backend = useBackend()
    const notifications = useNotifications()
    const dialogs = useDialogs()
    const navigate = useNavigate()
    const playerRef = React.useRef<AudioPlayerHandle>(null)
    const [isLoading, setIsLoading] = React.useState(true);
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [measureTimes, setMeasureTimes] = React.useState<TimedTextEntry[]>([])
    const [playPositionMs, setPlayPositionMs] = React.useState(0)
    const [durationMs, setDurationMs] = React.useState<number | undefined>(undefined)
    const [nextMeasureNum, setNextMeasureNum] = React.useState(1)
    // The measure whose name is being edited, and the text typed so far.
    const [renamingIndex, setRenamingIndex] = React.useState<number | null>(null)
    const [renameText, setRenameText] = React.useState('')
    // The scrolling list panel, and its row for the current measure (if it has one).
    const listRef = React.useRef<HTMLDivElement>(null)
    const currentRowRef = React.useRef<HTMLTableRowElement>(null)

    // Keep the current measure's row in view, scrolling only the list: the score scrolls
    // independently to show the same measure, so both can be seen at once.
    React.useEffect(() => {
        if (listRef.current && currentRowRef.current) {
            scrollIntoContainerView(listRef.current, currentRowRef.current)
        }
    }, [nextMeasureNum, measureTimes.length])

    // The name of the measure the audio position was last found in. The current measure follows
    // the position only when the position enters a different measure, so the user's own choices
    // (clicking in the score, stamping a measure, typing a number) stand until playback or a
    // seek reaches another measure. The reverse direction is explicit: acting on a measure
    // seeks the audio, and never happens from this effect, so the two cannot feed each other.
    const positionMeasureRef = React.useRef<string | undefined>(undefined)
    React.useEffect(() => {
        let atPosition: TimedTextEntry | undefined
        for (const m of measureTimes) {
            if (m.t <= playPositionMs) { atPosition = m } else { break }
        }
        if (!atPosition || atPosition.v === positionMeasureRef.current) { return }
        positionMeasureRef.current = atPosition.v
        if (/^\d+$/.test(atPosition.v) && parseInt(atPosition.v, 10) >= 1) {
            setNextMeasureNum(parseInt(atPosition.v, 10))
        }
    }, [playPositionMs])  // deliberately not measureTimes: editing the list must not move the current measure

    const sheetZoom = 0.7
    const songClient = backend.song(song.id)
    const hasNotation = !!song?.notationUrl

    React.useEffect(() => {
        setChildProps({
            subTitle: ": Measure Timing",
            breadcrumbs: [{ title: "Measures" }]
        })
    }, [])

    const loadData = React.useCallback(async () => {
        setIsSaving(false)
        const fetchedData = (await asyncData.text)?.getPart(TIMED_TEXT_SHARED_PART)['MEASURES'] ?? []
        setMeasureTimes(fetchedData)
    }, [setIsSaving, setSong, asyncData.text])

    const handleSave = React.useCallback(async () => {
        if (!allNamed(measureTimes)) {
            notifications.show('Every measure needs a name before saving.', { severity: 'error' })
            return
        }
        setIsSaving(true)
        try {
            await songClient.part(TIMED_TEXT_SHARED_PART).putText("MEASURES", measureTimes)
            notifications.show('Measure timing saved', { severity: 'success', autoHideDuration: 2000 })
            setIsEditing(false)
            setRenamingIndex(null)
            reloadAsyncData('text')
        } catch (saveError) {
            notifications.show(`Failed to save measure timing: ${(saveError as Error).message}`, { severity: 'error' })
        } finally {
            setIsSaving(false)
        }
    }, [measureTimes, songClient, notifications, setIsSaving, setIsEditing, reloadAsyncData])

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
            setRenamingIndex(null)
        }
    }, [setMeasureTimes, dialogs]);

    const handleMark = React.useCallback(() => {
        // The keyboard shortcut can trigger this even when the mark button is disabled.
        if (!isEditing) { return }
        // Use the player's exact position: the reported one only updates a few times a second.
        const positionMs = playerRef.current?.getPositionMs() ?? playPositionMs
        setMeasureTimes(prev => markMeasure(prev, positionMs, `${nextMeasureNum}`))
        // The position is now inside the measure just stamped; the box moves on to the next one.
        positionMeasureRef.current = `${nextMeasureNum}`
        setNextMeasureNum(nextMeasureNum + 1)
        setRenamingIndex(null)
    }, [isEditing, playPositionMs, nextMeasureNum, setMeasureTimes, setNextMeasureNum])

    const handleNextMeasureChange = (e: ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(e.target.value, 10)
        if (Number.isFinite(n) && n >= 1) { setNextMeasureNum(n) }
    }

    const handleDelete = (index: number) => {
        setMeasureTimes(prev => deleteMeasure(prev, index))
        setRenamingIndex(null)
    }

    /**
     * Jump to a measure: highlight it in the score (when its name is a number, which is
     * how the score's measures are identified) and, unless told otherwise, move the
     * audio to its start. Every action on a measure's row does this first.
     */
    const jumpToMeasure = (index: number, { seek = true } = {}) => {
        const measure = measureTimes[index]
        if (!measure) { return }
        const number = /^\d+$/.test(measure.v) ? parseInt(measure.v, 10) : 0
        if (number >= 1) { setNextMeasureNum(number) }
        if (seek) { playerRef.current?.seekToMs(measure.t) }
    }

    const handleShift = (index: number, deltaMs: number) => {
        if (!canShift(measureTimes, index, deltaMs, durationMs)) { return }
        setMeasureTimes(prev => shiftMeasure(prev, index, deltaMs, durationMs))
        setRenamingIndex(null)
        // Move to the new time, so the change can be heard straight away.
        jumpToMeasure(index, { seek: false })
        playerRef.current?.seekToMs(measureTimes[index].t + deltaMs)
    }

    const handleSplit = (index: number) => {
        jumpToMeasure(index)
        const result = splitMeasure(measureTimes, index)
        if (!result) { return }
        setMeasureTimes(result.entries)
        if (result.needsName) {
            startRename(result.newIndex, '')
        } else {
            setRenamingIndex(null)
        }
    }

    const startRename = (index: number, text: string) => {
        setRenamingIndex(index)
        setRenameText(text)
    }

    const commitRename = () => {
        if (renamingIndex == null || renameText.trim() === '') { return }
        setMeasureTimes(prev => renameMeasure(prev, renamingIndex, renameText))
        setRenamingIndex(null)
    }

    /** Play from the start of the previous measure (or of the audio) to the start of this one. */
    const handlePlay = (index: number) => {
        jumpToMeasure(index, { seek: false })  // playing the interval moves the audio itself
        playerRef.current?.playInterval(index > 0 ? measureTimes[index - 1].t : 0, measureTimes[index].t)
    }

    return (
            <LoadingComponent isLoading={isLoading} setIsLoading={setIsLoading} loadData={loadData}>
                <Stack spacing={2}>
                    <Stack direction='row' justifyContent={'space-between'}>
                        <Button
                          variant="contained"
                          startIcon={<ArrowBack/>}
                          onClick={() => navigate(`/songs/${song.id}`)}
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
                        ref={playerRef}
                        marks={measureTimes} 
                        mediaUrl={song?.mediaUrl} 
                        positionMs={playPositionMs} 
                        onTime={setPlayPositionMs}
                        onDuration={setDurationMs}
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
                                    htmlInput: { style: { textAlign: 'center' }, 'aria-label': 'next measure' } 
                                }}
                                onChange={handleNextMeasureChange}
                                />
                            </>
                        }
                        />
                    {/* The list and the score each scroll on their own inside this fixed-height row, sized
                        to fit the window (430px approximates the page chrome above it), so a selected
                        measure can be seen in both without scrolling the page. */}
                    <Stack direction='row' sx={{ height: 'calc(100vh - 430px)', minHeight: 320, display: 'flex', flexDirection: 'row' }}>
                        <Paper ref={listRef} sx={{ p: 2, width: 440, flex: '0 0 auto', overflow: 'auto' }}>
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
                                        <TableCell>Time</TableCell>
                                        <TableCell align="center">Measure#</TableCell>
                                        <TableCell>&nbsp;</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {measureTimes.map((bm, idx) => {
                                        const isRenaming = (renamingIndex === idx)
                                        const previousMs = idx > 0 ? measureTimes[idx - 1].t : 0
                                        return (
                                        <TableRow key={idx}
                                            selected={bm.v === `${nextMeasureNum}`}
                                            ref={bm.v === `${nextMeasureNum}` ? currentRowRef : undefined}>
                                            <TableCell sx={{ whiteSpace: 'nowrap', px: 0.5 }}>
                                                <RowButton
                                                    label="earlier"
                                                    tooltip="Move 0.1 s earlier"
                                                    disabled={!isEditing || !canShift(measureTimes, idx, -MEASURE_SHIFT_MS, durationMs)}
                                                    onClick={() => handleShift(idx, -MEASURE_SHIFT_MS)}>
                                                    <ChevronLeft fontSize="small" />
                                                </RowButton>
                                                <Box component="span" sx={{ cursor: 'pointer', display: 'inline-block', minWidth: 52, textAlign: 'center' }}
                                                    onClick={() => jumpToMeasure(idx)}>
                                                    {millisToMST(bm.t)}
                                                </Box>
                                                <RowButton
                                                    label="later"
                                                    tooltip="Move 0.1 s later"
                                                    disabled={!isEditing || !canShift(measureTimes, idx, MEASURE_SHIFT_MS, durationMs)}
                                                    onClick={() => handleShift(idx, MEASURE_SHIFT_MS)}>
                                                    <ChevronRight fontSize="small" />
                                                </RowButton>
                                            </TableCell>
                                            <TableCell align="center">
                                                {isRenaming ? (
                                                    <TextField
                                                        autoFocus
                                                        size="small"
                                                        variant="standard"
                                                        value={renameText}
                                                        sx={{ width: 56 }}
                                                        slotProps={{ htmlInput: { 'aria-label': 'measure name', style: { textAlign: 'center' } } }}
                                                        onChange={e => setRenameText(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                                                            else if (e.key === 'Escape') { e.preventDefault(); setRenamingIndex(null) }
                                                        }}
                                                    />
                                                ) : (bm.v || <Typography component="span" color="error">?</Typography>)}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap', px: 0.5 }}>
                                                {isRenaming ? (
                                                    <RowButton label="confirm name" tooltip="Confirm name" disabled={renameText.trim() === ''} onClick={commitRename}>
                                                        <Check fontSize="small" />
                                                    </RowButton>
                                                ) : (
                                                    <RowButton label="edit name" tooltip="Edit name" disabled={!isEditing} onClick={() => { jumpToMeasure(idx); startRename(idx, bm.v) }}>
                                                        <Edit fontSize="small" />
                                                    </RowButton>
                                                )}
                                                <RowButton
                                                    label="play to here"
                                                    tooltip="Play the previous measure, stopping at this one"
                                                    disabled={bm.t <= previousMs}
                                                    onClick={() => handlePlay(idx)}>
                                                    <PlayArrow fontSize="small" />
                                                </RowButton>
                                                <RowButton
                                                    label="split"
                                                    tooltip={idx === measureTimes.length - 1 ? "The last measure can't be split" : "Split in two"}
                                                    disabled={!isEditing || splitMeasure(measureTimes, idx) == null}
                                                    onClick={() => handleSplit(idx)}>
                                                    <VerticalSplit fontSize="small" />
                                                </RowButton>
                                                <RowButton label="delete" disabled={!isEditing} onClick={() => handleDelete(idx)}>
                                                    <Delete fontSize="small" />
                                                </RowButton>
                                            </TableCell>
                                        </TableRow>
                                    )})}
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
    )
}
