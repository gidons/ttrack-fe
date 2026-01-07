import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { Download as DownloadIcon, FolderZip as FolderZipIcon } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { submitZipMixesRequest } from '../data/songs';
import { download } from './utils';
import { waitForTask } from '../data/tasks';

export interface DownloadZipButtonProps {
    songId: string,
    hoverTitle: string
}

export default function DownloadZipButton({songId, hoverTitle}: DownloadZipButtonProps) {

    const [taskId, setTaskId] = React.useState<string>(null)
    const [downloadUrl, setDownloadUrl] = React.useState<string>(null)

    const handleClick = React.useCallback(async () => {
        if (taskId == null) {
            const newTaskId = await submitZipMixesRequest(songId)
            setTaskId(newTaskId);
            waitForTask(newTaskId).then(task => {
                console.log(`Task ${taskId} ended: ${task}`)
                if (task.status == "SUCCEEDED") {
                    const downloadUrl = task.output["downloadUrl"];
                    console.log(`Setting downloadUrl to ${downloadUrl}`)
                    setDownloadUrl(downloadUrl)
                }
            })
            return;
        }
        if (downloadUrl != null) {
            download(downloadUrl)
            setTaskId(null)
        }
    }, [songId, taskId, downloadUrl, setTaskId])
    const icon = React.useMemo(() => (taskId == null) ? <FolderZipIcon/> : (
            (downloadUrl == null) ? <CircularProgress size={20}/> 
                                  : <DownloadIcon/>
    ), [taskId, downloadUrl])
    return (
        <Tooltip title={hoverTitle}>
            <IconButton size="small" onClick={handleClick}>
                {icon}
            </IconButton>
        </Tooltip>
    )
}