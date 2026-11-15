import React from 'react'
import { Box, IconButton, Stack, Typography, Tooltip } from '@mui/material'
import { FastForward, FastRewind, PlayArrow, Pause, ChevronLeft, ChevronRight } from '@mui/icons-material'
import { ValueSpinner } from './ValueSpinner'
import { TimedTextEntry, millisToMST } from '../../types'

export interface AudioPlayerProps {
    mediaUrl: string
    marks: TimedTextEntry[]
    actions?: JSX.Element
    positionMs: number
    onMark?: () => void
    onTime: (posMs: number) => void
    /** Called with the length of the audio, in ms, once it is known. */
    onDuration?: (durationMs: number) => void
}

/** What a host can ask the player to do, through a ref. */
export interface AudioPlayerHandle {
    /** Move to the given position, in ms. */
    seekToMs: (ms: number) => void
    /** Play from startMs and pause exactly at endMs. */
    playInterval: (startMs: number, endMs: number) => void
    /** The exact current position, in ms (more precise than the position reported through onTime). */
    getPositionMs: () => number
}

/** When this close to the end of an interval, stop using animation frames and set a timer for the exact end. */
const FINAL_STRETCH_MS = 60

const AudioPlayer = React.forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer(
        { mediaUrl, positionMs: currentMs, marks, actions, onMark, onTime, onDuration }, ref) {
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const trackRef = React.useRef<HTMLDivElement | null>(null)
    const [playing, setPlaying] = React.useState(false)
    const [durationMs, setDurationMs] = React.useState(0)
    const [spinnerValue, setSpinnerValue] = React.useState('100%')
    // Cancels the pending stop of playInterval(), if there is one.
    const cancelStopRef = React.useRef<(() => void) | null>(null)
    // The listener effect below runs once, so it reads the latest callback through a ref.
    const onDurationRef = React.useRef(onDuration)
    onDurationRef.current = onDuration

    // console.log(`Marks: ${JSON.stringify(marks)}`)

    const setMs = React.useCallback((ms: number) => {
        onTime(ms)
    }, [onTime])

    const cancelStop = React.useCallback(() => {
        cancelStopRef.current?.()
        cancelStopRef.current = null
    }, [])

    // Don't leave a pending stop behind when the player goes away.
    React.useEffect(() => cancelStop, [cancelStop])

    // Attach audio event listeners
    React.useEffect(() => {
        const a = audioRef.current
        if (!a) return
        const onLoaded = () => {
            const ms = Math.floor((isNaN(a.duration) ? 0 : a.duration) * 1000)
            setDurationMs(ms)
            if (ms > 0) { onDurationRef.current?.(ms) }
        }
        const onTime = () => {
            setMs(Math.round(a.currentTime * 1000))
        }
        const onPlay = () => setPlaying(true)
        const onPause = () => setPlaying(false)
        a.addEventListener('loadedmetadata', onLoaded)
        a.addEventListener('timeupdate', onTime)
        a.addEventListener('play', onPlay)
        a.addEventListener('pause', onPause)
        if (a.readyState >= 1) { onLoaded() }
        return () => {
            a.removeEventListener('loadedmetadata', onLoaded)
            a.removeEventListener('timeupdate', onTime)
            a.removeEventListener('play', onPlay)
            a.removeEventListener('pause', onPause)
        }
    }, [])

    // Reset when media changes
    React.useEffect(() => {
        const a = audioRef.current
        cancelStop()
        setMs(0)
        setDurationMs(0)
        setSpinnerValue('100%')
        if (a) {
            a.pause()
            try { a.currentTime = 0 } catch (err) { console.warn('failed to reset currentTime', err) }
            a.playbackRate = 1
        }
    }, [mediaUrl])

    const togglePlay = async () => {
        const a = audioRef.current
        if (!a) return
        cancelStop()
        if (playing) {
            a.pause()
        } else {
            try {
                await a.play()
            } catch (err) {
                // ignore play errors
                console.warn('play failed', err)
            }
        }
    }

    const seekToMs = (ms: number) => {
        const a = audioRef.current
        if (!a || !isFinite(ms)) return
        cancelStop()
        const secs = Math.max(0, Math.min(ms / 1000, isNaN(a.duration) ? Infinity : a.duration))
        try { a.currentTime = secs } catch (err) { console.warn('seek failed', err) }
        setMs(Math.round(secs * 1000))
    }

    /**
     * Play from startMs and pause exactly at endMs. The audio element's 'timeupdate' event only
     * fires a few times a second, which is far too coarse, so the end is watched on animation
     * frames and, for the final stretch, with a timer set for the remaining time.
     */
    const playInterval = (startMs: number, endMs: number) => {
        const a = audioRef.current
        if (!a || !isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) return
        seekToMs(startMs)  // also cancels any earlier interval
        const endSec = endMs / 1000
        let frame = 0
        let timer = 0
        let cancelled = false
        const finish = () => {
            if (cancelled) return
            cancelStopRef.current = null
            cancelled = true
            a.pause()
            try { a.currentTime = endSec } catch (err) { console.warn('seek failed', err) }
            setMs(endMs)
        }
        const watch = () => {
            if (cancelled) return
            const remainingMs = ((endSec - a.currentTime) * 1000) / (a.playbackRate || 1)
            if (remainingMs <= 0) {
                finish()
            } else if (remainingMs <= FINAL_STRETCH_MS) {
                timer = window.setTimeout(finish, remainingMs)
            } else {
                frame = window.requestAnimationFrame(watch)
            }
        }
        cancelStopRef.current = () => {
            cancelled = true
            window.cancelAnimationFrame(frame)
            window.clearTimeout(timer)
        }
        a.play()
            .then(() => { if (!cancelled) { frame = window.requestAnimationFrame(watch) } })
            .catch(err => { console.warn('play failed', err); cancelStop() })
    }

    React.useImperativeHandle(ref, () => ({
        seekToMs,
        playInterval,
        getPositionMs: () => Math.round((audioRef.current?.currentTime ?? 0) * 1000),
    }))

    const step = (deltaSec: number) => {
        const a = audioRef.current
        if (!a) return
        seekToMs(1000*(a.currentTime + deltaSec))
    }

    const currentMarkIndex = React.useMemo(() => {
        const i = marks.findLastIndex(m => m.t <= currentMs)
        // console.log(`currentMs: ${currentMs}; marks=${JSON.stringify(marks)}; markIndex = ${i}`)
        return i
    }, [currentMs, marks])

    const goToPrevMark = React.useCallback(() => {
        if (currentMarkIndex < 0) { return }
        const currentMark = marks[currentMarkIndex]
        if (currentMs - currentMark.t > 1000) {
            seekToMs(currentMark.t)
        } else {
            if (currentMarkIndex >= 1) {
                seekToMs(marks[currentMarkIndex - 1].t)
            }
        }
    }, [currentMarkIndex, currentMs, marks, seekToMs])

    const goToNextMark = React.useCallback(() => {
        if (currentMarkIndex >= marks.length - 1) { return }
        const nextMark = marks[currentMarkIndex + 1]
        seekToMs(nextMark.t)
    }, [currentMarkIndex, marks, seekToMs])

    // Pointer interactions for seeking (click/drag)
    React.useEffect(() => {
        const el = trackRef.current
        if (!el) return

        let dragging = false

        const updateFromEvent = (clientX: number) => {
            const rect = el.getBoundingClientRect()
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
            const pct = rect.width > 0 ? x / rect.width : 0
            const targetMs = Math.round(pct * durationMs)
            seekToMs(targetMs)
        }

        const onPointerDown = (ev: PointerEvent) => {
            dragging = true
            const tgt = ev.currentTarget as HTMLElement | null
            if (tgt && 'setPointerCapture' in tgt && typeof (tgt as Element).setPointerCapture === 'function') {
                try { (tgt as Element).setPointerCapture(ev.pointerId) } catch (err) { console.warn('setPointerCapture failed', err) }
            }
            updateFromEvent(ev.clientX)
        }

        const onPointerMove = (ev: PointerEvent) => {
            if (!dragging) return
            updateFromEvent(ev.clientX)
        }

        const onPointerUp = (ev: PointerEvent) => {
            if (dragging) {
                dragging = false
                const tgt = ev.currentTarget as HTMLElement | null
                if (tgt && 'releasePointerCapture' in tgt && typeof (tgt as Element).releasePointerCapture === 'function') {
                    try { (tgt as Element).releasePointerCapture(ev.pointerId) } catch (err) { console.warn('releasePointerCapture failed', err) }
                }
            }
        }

        el.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            el.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [durationMs])

    // Keyboard shortcuts: space=play/pause, M=add mark, ArrowRight/Left = step
    React.useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            // don't intercept typing in inputs or contenteditable
            const active = document.activeElement as HTMLElement | null
            const tag = active?.tagName
            if (active && (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable)) {
                return
            }

            if (ev.code === 'Space' || ev.key === ' ') {
                ev.preventDefault()
                togglePlay()
            } else if (ev.key === 'm' || ev.key === 'M') {
                ev.preventDefault()
                onMark?.()
            } else if (ev.key === 'ArrowRight') {
                ev.preventDefault()
                step(1)
            } else if (ev.key === 'ArrowLeft') {
                ev.preventDefault()
                step(-1)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [currentMs, playing, onMark])

    const handleSpinnerChange = (v: string) => {
        const pct = v.replace('%', '')
        const rate = Math.round(parseInt(pct)) / 100
        setSpinnerValue(v)
        const a = audioRef.current
        if (a) a.playbackRate = rate
    }

    const formatTime = (ms: number) => millisToMST(ms)

    const progressPct = durationMs > 0 ? Math.max(0, Math.min(100, (currentMs / durationMs) * 100)) : 0

    return (
        <Stack spacing={1} sx={{ width: '100%' }}>
            <audio ref={audioRef} src={mediaUrl} style={{ display: 'none' }} preload="metadata" />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ width: 60, textAlign: 'left' }}>{formatTime(currentMs)}</Typography>

                <Box
                    ref={trackRef}
                    sx={{
                        position: 'relative',
                        flex: 1,
                        height: 28,
                        background: (theme) => theme.palette.action.disabledBackground,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.5,
                        userSelect: 'none',
                        cursor: 'pointer'
                    }}
                >
                    {/* background center "location bar" */}
                    <Box sx={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 8, background: (theme) => theme.palette.background.paper, borderRadius: 2 }} />

                    {/* progress fill */}
                    <Box sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: 8, width: `${progressPct}%`, background: (theme) => theme.palette.primary.main, borderRadius: 2 }} />

                    {/* ticks */}
                    {durationMs > 0 && marks && marks.map((m, idx) => {
                        const pct = Math.max(0, Math.min(100, (m.t / durationMs) * 100))
                        const tip = `${formatTime(m.t)}${m.v ? ` — ${m.v}` : ''}`
                        return (
                            <Tooltip key={`${m.t}-${idx}`} title={tip} arrow>
                                <Box sx={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', height: 24, width: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
                                    <Box sx={{ height: 20, width: 2, background: (theme) => theme.palette.error.main, borderRadius: 1 }} />
                                </Box>
                            </Tooltip>
                        )
                    })}

                    {/* playhead indicator */}
                    <Box sx={{ position: 'absolute', left: `${progressPct}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: (theme) => theme.palette.common.white, border: '2px solid', borderColor: (theme) => theme.palette.primary.main }} />
                </Box>

                <Typography variant="body2" sx={{ width: 60, textAlign: 'right' }}>{durationMs > 0 ? formatTime(durationMs) : '--'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignSelf: 'center', alignItems: 'center', gap: 1 }}>
                <IconButton aria-label="rewind 1s" onClick={() => step(-1)}>
                    <FastRewind />
                </IconButton>

                <IconButton aria-label='prev-mark' onClick={goToPrevMark}>
                    <ChevronLeft />
                </IconButton>

                <IconButton aria-label={playing ? 'pause' : 'play'} onClick={togglePlay}>
                    {playing ? <Pause /> : <PlayArrow />}
                </IconButton>

                {actions}

                <IconButton aria-label='next-mark' onClick={goToNextMark}>
                    <ChevronRight />
                </IconButton>

                <IconButton aria-label="forward 1s" onClick={() => step(1)}>
                    <FastForward />
                </IconButton>

                <Box sx={{ ml: 'auto', width: 140 }}>
                    <ValueSpinner
                        values={["50%", "66%", "75%", "90%", "100%", "110%", "125%", "133%", "150%"]}
                        value={spinnerValue}
                        onChange={handleSpinnerChange}
                    />
                </Box>
            </Box>
        </Stack>
    )
})

export default AudioPlayer
