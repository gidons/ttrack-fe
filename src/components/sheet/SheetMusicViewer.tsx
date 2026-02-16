/**************
 * 
 * COPIED FROM https://github.com/opensheetmusicdisplay/react-opensheetmusicdisplay/blob/master/src/lib/OpenSheetMusicDisplay.jsx
 * 
 **************/

import { Box, SxProps, Typography } from '@mui/material';
import { GraphicalMeasure, OpenSheetMusicDisplay as OSMD, RectangleF2D } from 'opensheetmusicdisplay';
import React, { MouseEvent, useContext, useRef, useEffect } from 'react';
import OSMDComponent from './OpenSheetMusicDisplay';
import { SheetMusicViewerContext } from './SheetMusicViewerContext';

/**
 * The GraphicalMeasure and the rectangle we want to use for highlighting and/or
 * selecting it. Note that this is a little different from what OSMD uses as the
 * bounding box for the measure (GraphicalMeasure.PositionAndShape): we use the
 * horizontal location from the measure, but we take the vertical location from
 * the MusicSystem it's in, and specifically from its GroupBracket, so we get a
 * consistent vertical across all measures in the same system.
 */
class MeasureBox {
    readonly measure: GraphicalMeasure
    readonly box: RectangleF2D
    constructor(measure: GraphicalMeasure) {
        this.measure = measure
        const bbox = measure.ParentMusicSystem.GroupBrackets[0].PositionAndShape
        const mbox = measure.PositionAndShape
        this.box = new RectangleF2D(mbox.AbsolutePosition.x, bbox.AbsolutePosition.y, mbox.Size.width, bbox.Size.height)
    }
}

/**
 * Scale the given rectangle from OSMD coordinates to pixel coordinates within the display area.
 * Note: for some reason, OSMD coordinates at 100% zoom seem to be exactly 1/10 of pixel coordinates.
 */
function scale(rect: RectangleF2D, zoom: number) {
    const sf = 10 * zoom
    return new RectangleF2D(sf * rect.x, sf * rect.y, sf * rect.width, sf * rect.height)
}

interface MeasureHighlightProps {
    measureBox: MeasureBox
    sx?: SxProps
    showNumber?: boolean
    innerRef?: React.Ref<HTMLDivElement>
}

function MeasureHighlight({
    measureBox: mb, sx = {}, showNumber = false, innerRef } : MeasureHighlightProps) {
    const { zoom } = useContext(SheetMusicViewerContext)
    const r = scale(mb.box, zoom)
    return (
        <Box zIndex={1}
            ref={innerRef}
            sx={{...sx, position: 'absolute', left: r.x, width: r.width, top: r.y, height: r.height }}
        >
            { showNumber && 
            <Typography color='black' variant='h4'>{mb.measure.MeasureNumber}</Typography>
            }
        </Box>
    )
}

export interface SheetMusicViewerProps {
    sheetUrl: string
    highlightedMeasureNum?: number
    onClickMeasure?: (measureNum: number) => void
    sx?: SxProps
    highlightSx?: SxProps
}

export default function SheetMusicViewer({ 
        sheetUrl, 
        highlightedMeasureNum = 0, 
        onClickMeasure = () => {},
        sx = {},
        highlightSx = {},
    }: SheetMusicViewerProps) {

    const [measureBoxes, setMeasureBoxes] = React.useState<Array<MeasureBox>>([])
    const context = useContext(SheetMusicViewerContext)
    const { zoom } = context
    const highlightedMeasure = highlightedMeasureNum > 0 ? measureBoxes?.at(highlightedMeasureNum - 1) : null
    const containerRef = useRef<HTMLDivElement | null>(null)
    const highlightRef = useRef<HTMLDivElement | null>(null)


    // When highlightedMeasure or measureBoxes change, scroll the highlighted element into view
    useEffect(() => {
        if (!highlightedMeasure) { return }
        const el = highlightRef.current
        if (el) {
            // scrollIntoView will scroll the nearest scrollable ancestor (the container)
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } catch {
                // fallback: adjust container scrollTop manually
                if (containerRef.current) {
                    const container = containerRef.current
                    const rect = el.getBoundingClientRect()
                    const crect = container.getBoundingClientRect()
                    const offset = rect.top - crect.top
                    container.scrollTop += offset - (crect.height / 2) + (rect.height / 2)
                }
            }
        }
    }, [highlightedMeasure, measureBoxes])

    const updateMeasures = React.useCallback((osmd: OSMD) => {
        if (osmd == null) { return [] }
        const boxes = []

        for (const sys of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const m of sys.GraphicalMeasures) {
                const measureBox = new MeasureBox(m[0])
                boxes.push(measureBox)
            }
        }
        setMeasureBoxes(boxes)
    }, [setMeasureBoxes])

    const handleClick = React.useCallback((event: MouseEvent<HTMLDivElement>) => {
        // Use the container ref if available so we can account for scroll offsets
        const containerEl = (containerRef.current ?? event.currentTarget) as HTMLDivElement
        const cr = containerEl.getBoundingClientRect()
        const scrollLeft = containerEl.scrollLeft ?? 0
        const scrollTop = containerEl.scrollTop ?? 0
        // account for scroll position so clicks map to the full rendered content, not just the viewport portion
        const [x, y] = [ (event.clientX - cr.left + scrollLeft) / (10 * zoom), (event.clientY - cr.top + scrollTop) / (10 * zoom) ]
        console.debug(`handle click at: ${x},${y}`)
        const target = measureBoxes.find(mb => {
            return (mb.box.x <= x) && (mb.box.x + mb.box.width >= x)
            && (mb.box.y <= y) && (mb.box.y + mb.box.height >= y)
        })
        if (target) {
            console.debug(`target: ${JSON.stringify(target.box)}`)
            onClickMeasure(target.measure.MeasureNumber)
        }
    },[measureBoxes, onClickMeasure, zoom])

    return (
        <Box 
            ref={containerRef}
            sx={{...sx, position: 'relative', overflowY: 'auto'}}
            onClick={handleClick}>
            {measureBoxes.map(mb => (
                <MeasureHighlight 
                    measureBox={mb}
                    // sx={{border: '2px solid red', background: 'lightyellow', opacity: '30%'}}
                    key={`measure-${mb.measure.MeasureNumber}`}/>))}
            {highlightedMeasure && (
                <MeasureHighlight 
                    sx={{ border: '2px dashed black', background: 'lightyellow', opacity: '30%', ...highlightSx }}
                    measureBox={highlightedMeasure}
                    innerRef={highlightRef}/>
            )}
            <OSMDComponent 
                sheetUrl={sheetUrl} 
                {...context}
                onRender={updateMeasures}/>
        </Box>
    );
}
