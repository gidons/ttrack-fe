import { Edit, Refresh } from "@mui/icons-material";
import { CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef, GridRowParams } from "@mui/x-data-grid";
import React from "react";
import { useNavigate } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { Song, TIMED_TEXT_DATA_TYPES, TimedTextData } from "../../types";
import LoadingComponent from "../common/LoadingComponent";
import { TableHeader, TableToolbar } from "../common/TableHeader";
import { isEmpty } from "../utils";

export interface SongDataListProps {
    song: Song
    dataPromise: Promise<TimedTextData>
    reloadData: () => void
}
export default function SongDataList({song, dataPromise, reloadData}: SongDataListProps) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [timedData, setTimedData] = React.useState<TimedTextData>(null)

    const navigate = useNavigate();

    const loadData = React.useCallback(async () => {
        setTimedData((await dataPromise))
        console.log(`Data: ${JSON.stringify((await dataPromise))}`)
    }, [setTimedData, dataPromise])

    function editUrl(type: string) { return `/songs/${song.id}/data/${type.toLowerCase()}` }

    const TIMED_DATA_TYPE_DISPLAY_NAMES = {
        'LYRICS': 'Lyrics',
        'BOOKMARKS': 'Bookmarks',
        'MEASURES': 'Measure Times',
    }

    interface TableItem {
        id: string,
        name: string,
        availability: string,
        editUrl: string
    }
    const tableItems = React.useMemo(() => {
        if (timedData == null) { return [] }
        return [{
            id: 'NOTATION',
            name: 'MusicXML',
            availability: song.notationUrl ? "Yes" : "No",
            editUrl: editUrl('NOTATION')
        }].concat(TIMED_TEXT_DATA_TYPES.map(name => {
            const partsWithData = Object.entries(timedData.getType(name)).filter(e => !isEmpty(e[1])).map(e => e[0])
            const availParts = partsWithData.length
            const hasShared = partsWithData.includes('ALL')
            const numParts = song.parts.length
            const avail = (availParts == 0) ? "No" 
                        : (availParts == numParts || hasShared) ? "Yes" 
                        : `${availParts}/${numParts} parts`
            return ({
                id: name,
                name: TIMED_DATA_TYPE_DISPLAY_NAMES[name],
                availability: avail,
                editUrl: editUrl(name)
            })
        }))
    }, [song, timedData])

    const columns = React.useMemo<GridColDef[]>(() => {
        return [
            { field: 'name', headerName: 'Data', width: 120, sortable: false, disableColumnMenu: true },
            { field: 'availability', headerName: 'Available?', flex: 1, sortable: false, disableColumnMenu: true },
            { field: 'actions', type: 'actions', width: 60, aligh: 'right', disableColumnMenu: true, 
                getActions: ({row}: GridRowParams<TableItem>) => {
                    return [<GridActionsCellItem
                        key="edit-item"
                        icon={<Edit />}
                        label="Edit"
                        onClick={() => navigate(row.editUrl)}
                        />]                  
                }
            }
        ]
    }, [navigate])

    return (
        <Stack width='100%' paddingTop={1}>
            <TableHeader>
                <Typography variant="h6">Non-Audio Data</Typography>
                <TableToolbar>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        {isLoading ? <CircularProgress size={20}/> :
                        <IconButton size="small" aria-label="refresh" onClick={reloadData}>
                            <Refresh/>
                        </IconButton>}
                    </Tooltip>
                </TableToolbar>
            </TableHeader>
            <LoadingComponent
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                loadData={loadData}
            >
                <DataGrid
                    rows={tableItems}
                    columns={columns}
                    getRowId={(row) => row.id}
                    hideFooter={true}
                />
            </LoadingComponent>
        </Stack>
    )
}