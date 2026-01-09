import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { Download as DownloadIcon, FileDownload, FileDownloadOff, FolderZip as FolderZipIcon } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { download } from './utils';
import { useBackend } from '../backend/useBackend';
import useNotifications from '../hooks/useNotifications/useNotifications';

export type ZipButtonState = "DISABLED" | "READY" | "INPROGRESS" | "SUCCEEDED" | "FAILED"

export interface DownloadZipButtonProps {
    songId: string,
    hoverTitle?: Record<ZipButtonState, string>
}

const defaultHoverTitle: Record<ZipButtonState, string> = {
    "DISABLED": "Zipping disabled.",
    "READY": "Create a zip file with all tracks.",
    "INPROGRESS": "Zipping in progress.",
    "SUCCEEDED": "Zip file ready. Click to download.",
    "FAILED": "Failed to create zip file. Click to clear."
}

export default function DownloadZipButton({songId, hoverTitle}: DownloadZipButtonProps) {

    const [taskId, setTaskId] = React.useState<string>(null)
    const [downloadUrl, setDownloadUrl] = React.useState<string>(null)
    const [state, setState] = React.useState<ZipButtonState>("READY")

    const { waitForTask, song } = useBackend()
    const notifications = useNotifications()

    const handleClick = React.useCallback(async () => {
        switch(state) {
            case "DISABLED": return;
            case "READY":
                const newTaskId = await song(songId).submitZipMixesRequest()
                setTaskId(newTaskId);
                setState("INPROGRESS")
                waitForTask(newTaskId).then(task => {
                    console.log(`Task ${taskId} ended: ${task}`)
                    if (task.status == "SUCCEEDED") {
                        const downloadUrl = task.output["downloadUrl"];
                        setDownloadUrl(downloadUrl)
                        setState("SUCCEEDED")
                        notifications.show("Zip file is ready to download.", { severity: 'success' })
                    } else {
                        setState("FAILED")
                        notifications.show("Zip task failed.", { severity: 'error' })
                    }
                })
                return
            case "INPROGRESS": return; // shouldn't happen
            case "SUCCEEDED":
                download(downloadUrl)
                setState("READY")
                return
            case "FAILED":
                setState("READY")
                return
        }
    }, [songId, state, taskId, downloadUrl, setTaskId, setState, setDownloadUrl])
    const hover = {...defaultHoverTitle, ...hoverTitle}[state]
    var icon
    switch(state) {
        // case "DISABLED": icon = ???; break;
        case "READY": icon = <FolderZipIcon/>; break
        case "INPROGRESS": icon = <CircularProgress size={20}/>; break
        case "FAILED": icon = <FileDownloadOff/>; break
        case "SUCCEEDED": icon = <FileDownload/>; break
    }
    return (
        // TODO define an explicit State (disabled/available/inprogress/complete/failed), and a hover title for each State. 
        <Tooltip title={hover}>
            <IconButton size="small" onClick={handleClick}>
                {icon}
            </IconButton>
        </Tooltip>
    )
}