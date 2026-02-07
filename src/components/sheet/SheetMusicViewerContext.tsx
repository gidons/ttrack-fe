import React from "react";

export interface SheetMusicViewerSettings {
    zoom?: number
    autoResize?: boolean
    background?: string
}

export const SheetMusicViewerContext = React.createContext<SheetMusicViewerSettings>({ zoom: 1.0, autoResize: true })