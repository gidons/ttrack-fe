import React from "react";
import { Outlet, useParams } from "react-router";
import { useBackend } from "../../backend/useBackend";
import { Song, TimedTextData } from "../../types";
import LoadingComponent from "../common/LoadingComponent";
import PageContainer, { Breadcrumb } from "../common/PageContainer";

export interface SongPageChildProps {
    subTitle?: string
    breadcrumbs?: Breadcrumb[]
}

export interface SongPageContext {
    songState: [Song, (song: Song) => void]
    dataPromise: Promise<TimedTextData>
    setChildProps: (props: SongPageChildProps) => void
    reload: () => void
    reloadData: () => void
}

export default function SongPage() {

    const { songId } = useParams()
    const [song, setSong] = React.useState<Partial<Song>>({});
    const [isLoading, setIsLoading] = React.useState(true)
    const [dataPromise, setDataPromise] = React.useState<Promise<TimedTextData>>(null)
    const [childProps, setChildProps] = React.useState<SongPageChildProps>({})
    const backend = useBackend()
    const isNewSong = songId == 'new'
    const songClient = backend.song(songId)

    const { subTitle = '', breadcrumbs = [] } = childProps

    const loadData = React.useCallback(async () => {
        if (isNewSong) { return }
        // Fetch text data in the background
        setDataPromise(songClient.getText())
        setSong(await songClient.get())
    }, [setSong, setDataPromise])

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
                    dataPromise, 
                    setChildProps: (props: SongPageChildProps) => {
                        console.log(`SongPage.setChildProps(${JSON.stringify(props)}`)
                        setChildProps(props)
                    },
                    reload: () => {
                        console.log(`SongPage.reload()`)
                        setIsLoading(true) 
                    },
                    reloadData: () => {
                        console.log(`SongPage.reloadData()`)
                        setDataPromise(songClient.getText())
                    }
                }}/>
            </PageContainer>
        </LoadingComponent>
    )
}