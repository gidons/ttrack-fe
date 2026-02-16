import React from "react";
import { Song, Track } from "../../types";
import { BulkMixDialog } from "./BulkMixDialog";
import { SingleMixDialog } from "./SingleMixDialog";
import { AddTrackDialogProps } from "./TrackList";

export type AddMixDialogProps = AddTrackDialogProps & { onSwitchMode: () => void }

export function MixDialog(props: AddTrackDialogProps) {
    const [bulkMode, setBulkMode] = React.useState(false)

    return props.isOpen && (
        (bulkMode && !props.targetTrackId) 
            ? <BulkMixDialog onSwitchMode={() => setBulkMode(false)} {...props}/>
            : <SingleMixDialog onSwitchMode={() => setBulkMode(true)} {...props}/>)
}