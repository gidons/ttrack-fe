import React from "react";
import { Song } from "../types";
import { BulkMixDialog } from "./BulkMixDialog";
import { SingleMixDialog } from "./SingleMixDialog";

export interface MixDialogProps {
    open: boolean,
    song: Song,
    onClose: (success: boolean) => void
}

export function MixDialog({open, song, onClose}: MixDialogProps) {
    console.log("MixDialog: start render");

    const [bulkMode, setBulkMode] = React.useState(false)

    return bulkMode ? <BulkMixDialog open={open} song={song} onClose={onClose} onSwitchToSingle={() => setBulkMode(false)}/>
                    : <SingleMixDialog open={open} song={song} onClose={onClose} onSwitchToBulk={() => setBulkMode(true)}/>
}