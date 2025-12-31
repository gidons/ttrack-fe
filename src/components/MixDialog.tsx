import React from "react";
import { Song } from "../types";
import { BulkMixDialog } from "./BulkMixDialog";
import { SingleMixDialog } from "./SingleMixDialog";

export interface MixDialogProps {
    song: Song,
    onClose: (success: boolean) => void
}

export function MixDialog({song, onClose}: MixDialogProps) {
    const [bulkMode, setBulkMode] = React.useState(false)

    return bulkMode ? <BulkMixDialog song={song} onClose={onClose} onSwitchToSingle={() => setBulkMode(false)}/>
                    : <SingleMixDialog song={song} onClose={onClose} onSwitchToBulk={() => setBulkMode(true)}/>
}