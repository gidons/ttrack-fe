import { ArrowBack, Delete, Upload } from "@mui/icons-material";
import { Box, Button, FormControl, Grid, Input, Stack } from "@mui/material";
import React, { ChangeEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import SheetMusicViewer from "../sheet/SheetMusicViewer";
import { SheetMusicViewerContext } from "../sheet/SheetMusicViewerContext";
import { SongPageContext } from "./SongPage";

export default function ViewSongSheet() {
    const { songState: [song, setSong], reload, setChildProps } = useOutletContext<SongPageContext>()

    const backend = useBackend()
    const notifications = useNotifications()
    const dialogs = useDialogs()
    const navigate = useNavigate()
    const [isUploading, setIsUploading] = React.useState(false)
    const [uploadFile, setUploadFile] = React.useState<File>(null)
    const [showUpload, setShowUpload] = React.useState(false)

    const sheetZoom = 0.7
    const songClient = backend.song(song.id)
    const hasFile = !!song?.notationUrl

    React.useEffect(() => {
        setUploadFile(null)
        setIsUploading(false)
        setShowUpload((!(song.notationUrl)))
        setChildProps({
            subTitle: ": MusicXML File",
            breadcrumbs: [{ title: "MusicXML", path: null }]
        })
    }, [song, setUploadFile, setIsUploading, setShowUpload])

    function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
        setUploadFile(event.target.files.item(0))
    }

    const handleUpload = React.useCallback(async () => {
        setIsUploading(true)
        try {
            await songClient.uploadNotation(uploadFile)
            reload()
            notifications.show('Notation file uploaded', { severity: 'success', autoHideDuration: 2000 })
        } catch(saveError) {
            notifications.show(`Failed to upload notation file: ${(saveError as Error).message}`, { severity: 'error' })
        } finally {
            setIsUploading(false)
            setShowUpload(false)
        }
    }, [songClient, uploadFile, reload])    

    const handleDelete = React.useCallback(async() => {
        const confirmed = await dialogs.confirm(
            `Are you sure you want to delete the notation file for this song?`,
            {
                title: `Delete notation file?`,
                severity: 'error',
                okText: 'Delete',
                cancelText: 'Cancel',
            },
        );
        if (confirmed) {
            await songClient.deleteNotation()
            reload()
        }
    }, [songClient, reload, dialogs]);

    function UploadComponent({ isOpen }: { isOpen: boolean }) {
        if (isOpen) { 
            return (
                <Grid container spacing={2}>
                    <Grid size={6}>
                        <FormControl fullWidth>
                            <Input
                                type='file'
                                aria-label='Notation file'
                                onChange={handleFileChange}
                            />
                        </FormControl>
                    </Grid>
                    <Grid size={3}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Upload/>}
                            loading={isUploading}
                            disabled={false}
                            onClick={handleUpload}
                            type="submit">
                            Upload
                        </Button> 
                    </Grid>
                    <Grid size={3}>
                        <Button
                            color="primary"
                            disabled={!hasFile}
                            onClick={() => setShowUpload(false)}
                            type="submit">
                            Cancel
                        </Button> 
                    </Grid>
                </Grid>
            )
        } else {
             return (
                <Button
                    variant="contained"
                    startIcon={<Upload/>}
                    color="primary"
                    onClick={() => setShowUpload(true)}
                >
                    { hasFile ? "Update" : "Upload" }
                </Button>
             )
        }        
    }

    return (
        <Stack spacing={2}>
            <Stack direction='row' justifyContent={'space-between'}>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack/>}
                    onClick={() => navigate(`/songs/${song.id}`)}
                >
                    Back
                </Button>
                <Stack direction='row' spacing={2}>
                    <UploadComponent isOpen={showUpload}/>
                    <Button
                        color="primary"
                        disabled={!hasFile}
                        startIcon={<Delete/>}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button> 
                </Stack>
            </Stack>
            
            {hasFile &&
                <Box alignSelf={"center"} width='100%'>
                    <SheetMusicViewerContext.Provider value={{zoom: sheetZoom, background: '#cccccc'}}>
                        <SheetMusicViewer sheetUrl={song.notationUrl}/>
                    </SheetMusicViewerContext.Provider>
                </Box>
            }
        </Stack>
    )
}