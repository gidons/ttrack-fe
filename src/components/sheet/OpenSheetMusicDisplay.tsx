/**************
 * 
 * COPIED FROM https://github.com/opensheetmusicdisplay/react-opensheetmusicdisplay/blob/master/src/lib/OpenSheetMusicDisplay.jsx
 * 
 **************/

import React, { Component } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import { sleep } from '../utils';

export interface OSMDProps {
    sheetUrl: string
    autoResize?: boolean
    background?: string
    zoom?: number
    onRender?: (osmd: OSMD) => void
}

class OSMDComponent extends Component<OSMDProps> {
    osmd: OSMD | null;
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: OSMDProps) {
        super(props);
        this.state = { dataReady: false };
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

    private async reload() {
        // console.log(`Reloading OSMD`)
        await this.osmd.load(this.props.sheetUrl);
        sleep(1000);
        this.osmd.zoom = this.props.zoom || 1.0
        this.osmd.render();
        this.props.onRender(this.osmd);
    }

    resize() {
        this.forceUpdate();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resize)
    }

    componentDidUpdate(prevProps: OSMDProps) {
        // console.log(`componentDidUpdate: prevProps=${JSON.stringify(prevProps)}; props=${JSON.stringify(this.props)}`)
        if (this.props.zoom !== prevProps.zoom || this.props.sheetUrl !== prevProps.sheetUrl) {
            this.reload()
        } else if (this.props.background != prevProps.background) {
            this.osmd.setOptions({ pageBackgroundColor: this.props.background })
            this.osmd.render()
        }
        window.addEventListener('resize', this.resize)
    }

    // Called after render
    componentDidMount() {
        // console.log("componentDidMount")
        this.setupOsmd();
    }

    render() {
        return (<div ref={this.divRef} />);
    }
}

export default OSMDComponent;