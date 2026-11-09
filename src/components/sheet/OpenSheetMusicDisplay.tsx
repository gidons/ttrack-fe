/**************
 * 
 * COPIED FROM https://github.com/opensheetmusicdisplay/react-opensheetmusicdisplay/blob/master/src/lib/OpenSheetMusicDisplay.jsx
 * 
 **************/

import { Alert } from '@mui/material';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import React, { Component } from 'react';
import { sleep } from '../utils';

export interface OSMDProps {
    sheetUrl: string
    autoResize?: boolean
    background?: string
    zoom?: number
    onRender?: (osmd: OSMD) => void
}

interface OSMDState {
    error: string | null
}

/** True if the bytes start with the ZIP signature, i.e. a compressed MusicXML (.mxl) file. */
function isZip(bytes: Uint8Array): boolean {
    return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

function toBinaryString(bytes: Uint8Array): string {
    const chunkSize = 0x8000
    let result = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
        result += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return result
}

/**
 * Download a MusicXML file and return it in the form OSMD.load() accepts: a binary
 * string for compressed files (.mxl), or decoded text for plain XML.
 *
 * The file is fetched here, and its format is detected from its content, because
 * OSMD can only load a compressed file from a URL if the URL itself contains
 * ".mxl". Notation URLs are signed storage URLs with no file extension, so
 * handing OSMD the URL makes it read a compressed file as text and reject it.
 */
export async function fetchNotationContent(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Could not retrieve the notation file (HTTP ${response.status})`)
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    return isZip(bytes) ? toBinaryString(bytes) : new TextDecoder('utf-8').decode(bytes)
}

class OSMDComponent extends Component<OSMDProps, OSMDState> {
    osmd: OSMD | null;
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: OSMDProps) {
        super(props);
        this.state = { error: null };
        this.osmd = undefined;
        this.divRef = React.createRef();
    }

    getOsmd() { return this.osmd; }

    async setupOsmd() {
        const { autoResize = true, background = '#cccccc' } = this.props
        // console.log(`Creating OSMD with bg: ${background}`)
        this.osmd = new OSMD(this.divRef.current, { autoResize, pageBackgroundColor: background, drawingParameters: 'default' });
        await this.reload();
    }

    /**
     * Incremented whenever a load starts and when the component unmounts. A load
     * that finds its number is out of date has been superseded and drops its result.
     *
     * This is needed because loading is asynchronous and can overlap: React
     * StrictMode mounts the component twice in development (creating a second OSMD
     * instance while the first is still downloading), and a zoom or URL change can
     * start a load while another is in flight. Each load therefore works only on the
     * OSMD instance it started with. Rendering whichever instance `this.osmd` points
     * to when the download finishes can render one that has not been loaded yet.
     */
    private loadCount = 0

    private async reload() {
        // console.log(`Reloading OSMD`)
        const osmd = this.osmd
        const loadId = ++this.loadCount
        const isStale = () => loadId !== this.loadCount || osmd !== this.osmd
        try {
            this.setState({ error: null })
            const content = await fetchNotationContent(this.props.sheetUrl)
            if (isStale()) { return }
            await osmd.load(content);
            if (isStale()) { return }
            sleep(1000);
            osmd.zoom = this.props.zoom || 1.0
            osmd.render();
            this.props.onRender(osmd);
        } catch (loadError) {
            if (isStale()) { return }
            console.error('Failed to load notation', loadError)
            this.setState({ error: (loadError as Error).message ?? String(loadError) })
        }
    }

    componentWillUnmount() {
        // Abandon any load in progress and release the instance, so a remount
        // (e.g. StrictMode) starts from a clean instance and container.
        this.loadCount++
        this.osmd?.clear()
        this.osmd = undefined
        this.divRef.current?.replaceChildren()
    }

    componentDidUpdate(prevProps: OSMDProps) {
        // console.log(`componentDidUpdate: prevProps=${JSON.stringify(prevProps)}; props=${JSON.stringify(this.props)}`)
        if (this.props.zoom !== prevProps.zoom || this.props.sheetUrl !== prevProps.sheetUrl) {
            this.reload()
        } else if (this.props.background != prevProps.background) {
            this.osmd.setOptions({ pageBackgroundColor: this.props.background })
            this.osmd.render()
        }
    }

    // Called after render
    componentDidMount() {
        // console.log("componentDidMount")
        this.setupOsmd();
    }

    render() {
        return (
            <>
                {this.state.error && <Alert severity="error">Could not display the notation: {this.state.error}</Alert>}
                <div ref={this.divRef} />
            </>
        );
    }
}

export default OSMDComponent;