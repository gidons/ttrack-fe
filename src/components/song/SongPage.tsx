import React from "react";
import { Outlet, useParams } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { MixTrack, PartTrack, Song, TimedTextData, Track } from "../../types";
import LoadingComponent from "../common/LoadingComponent";
import PageContainer, { Breadcrumb } from "../common/PageContainer";

export interface SongPageChildProps {
    subTitle?: string
    breadcrumbs?: Breadcrumb[]
}

export interface SongAsyncData {
    parts: Promise<PartTrack[]>
    mixes: Promise<MixTrack[]>
    text: Promise<TimedTextData>
}
export type AsyncDataType = keyof SongAsyncData

export interface SongPageContext {
    songState: [Song, (song: Song) => void]
    asyncData: SongAsyncData
    setChildProps: (props: SongPageChildProps) => void
    reload: () => void
    reloadAsyncData: (requestedTypes: AsyncDataType[] | AsyncDataType | null) => void
}

export default function SongPage() {

    const { songId } = useParams()
    const [song, setSong] = React.useState<Partial<Song>>({});
    const [isLoading, setIsLoading] = React.useState(true)
    const [asyncData, setAsyncData] = React.useState<SongAsyncData>(null)
    const [childProps, setChildProps] = React.useState<SongPageChildProps>({})
    const backend = useBackend()
    const isNewSong = songId == 'new'
    const songClient = backend.song(songId)

    const { subTitle = '', breadcrumbs = [] } = childProps

    /**
     * Generate new promises for the requested data types, e.g. ['parts','mixes']. Defaults to all.
     */
    const loadAsyncData = React.useCallback((requestedTypes: AsyncDataType[] | null = null) => {
        const types = requestedTypes instanceof Array ? requestedTypes : (requestedTypes == null) ? null : [requestedTypes]
        setAsyncData(prev => {
            function newPromiseIfRequested(type: AsyncDataType, factory) {
                return (types?.includes(type)??true) ? factory() : prev[type]
            }
            const newPromises = { 
                parts: newPromiseIfRequested('parts', () => songClient.listParts()),
                mixes: newPromiseIfRequested('mixes', () => songClient.listMixes()),
                text: newPromiseIfRequested('text', () => songClient.getText()),
            }
            return {...prev, ...newPromises}
        })
    }, [songClient, setAsyncData])

    const loadData = React.useCallback(async () => {
        if (isNewSong) { return }
        // Fetch text data in the background
        loadAsyncData()
        setSong(await songClient.get())
    }, [setSong, loadAsyncData])

    return (
        <LoadingComponent loadData={loadData} isLoading={isLoading} setIsLoading={setIsLoading}>
            <PageContainer
                title={isLoading ? "Loading..." : isNewSong ? "New Song" : `${song.title}${subTitle}`}
                breadcrumbs={[
                    { title: 'Songs', path: '/songs' },
                    { title: isLoading ? "Loading..." : isNewSong ? "New" : `${song.title}`, 
                      path: breadcrumbs.length ? `/songs/${songId}` : null },
                    ...breadcrumbs
                ]}
            >
                <Outlet context={{ 
                    songState: [song, setSong], 
                    asyncData: asyncData, 
                    setChildProps: (props: SongPageChildProps) => {
                        console.log(`SongPage.setChildProps(${JSON.stringify(props)}`)
                        setChildProps(props)
                    },
                    reload: () => {
                        console.log(`SongPage.reload()`)
                        setIsLoading(true) 
                    },
                    reloadAsyncData: () => {
                        console.log(`SongPage.reloadData()`)
                        loadAsyncData()
                    }
                } as SongPageContext}/>
            </PageContainer>
        </LoadingComponent>
    )
}