import axios, { Axios, AxiosInstance } from 'axios';
import { isPartTrack, MixTrack, PartTrack, Song, StereoMix, StereoMixSpec, Track, TrackInfo } from '../types';
import { useAuth } from '@clerk/clerk-react';
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { sleep } from '../components/utils';

export interface SongClient {
    get: () => Promise<Song>
    update: (song: Song) => Promise<Song>
    delete: () => Promise<void>
    deleteTrack: (trackId: string) => Promise<void>
    listParts: () => Promise<PartTrack[]>
    listMixes: () => Promise<MixTrack[]>
    uploadPart: (name: string, audioFile: File) => Promise<PartTrack>
    uploadParts: (parts: string[], files: File[]) => Promise<PartTrack[]>
    createMix: (mix: StereoMix, isCustom: boolean) => Promise<MixTrack>
    submitZipMixesRequest: () => Promise<string>
}

export interface Task {
    id: string;
    status: string;
    scheduled: Date;
    ended: Date;
    input: object;
    output: object;
}

export interface Backend {
    listSongs: () => Promise<Song[]>
    createSong: (song: Partial<Song>) => Promise<Song>
    song: (songId: string) => SongClient
    url: (path: string) => string
    waitForTask: (taskId: string) => Promise<Task>
}

type StereoMixDTO = Omit<StereoMix, 'spec'> & { mix: StereoMixSpec };
type MixTrackDTO = Omit<TrackDTO, 'mix'> & { mixInfo: StereoMixDTO };
type TrackDTO = Omit<Omit<TrackInfo, 'updated'>, 'created'> & { updated: string; created: string; }
type PartTrackDTO = TrackDTO;

export function useBackend() : Backend {
    const serverUrl = import.meta.env.VITE_BACKEND_URL

    const authContext = useContext(AuthContext)
    // console.log(`AuthContext: ${JSON.stringify(authContext)}`)

    const client = axios.create({ baseURL: serverUrl })
    if (authContext.getToken) {
        client.interceptors.request.use(async (config) => {
            config.headers.Authorization = `Bearer ${await authContext.getToken()}`
            return config
        })
    }

    function getDownloadUrl(path: string) { return serverUrl + path; }
    function trackDtoToTrack(dto: TrackDTO) : TrackInfo {
        const { created, updated, ...others } = dto;
        const createdDate = (created ? new Date(created) : null)
        const updatedDate = (updated ? new Date(updated) : null)
        return { ...others, created: createdDate, updated: updatedDate }
    }
    function partTrackDtoToPartTrack(dto: PartTrackDTO): PartTrack {
        return { ...trackDtoToTrack(dto), part: dto.trackId };
    }
    function mixDtoToMix(dto: StereoMixDTO): StereoMix {
        const { mix, ...others } = dto;
        return { ...others, spec: mix };
    }
    function mixTrackDtoToMixTrack(dto: MixTrackDTO): MixTrack {
        const { mixInfo, ...others } = dto;
        return { ...trackDtoToTrack(others), mix: mixDtoToMix(mixInfo) };
    }

    class SongClientImpl implements SongClient {
        readonly songId: string
        readonly basePath: string
        constructor(songId: string) { 
            this.songId = songId 
            this.basePath = `/songs/${this.songId}`
        }
        async get() { 
            const response = await client.get(this.basePath);
            return { ...response.data, allPartsMediaUrl: getDownloadUrl(`${this.basePath}/mixes/All/media`) };
        }
        async update(song: Song) { 
            console.log(`Updating song: ${JSON.stringify(song)}`)
            const response = await client.put(this.basePath, song);
            return response.data
        }
        async delete() {
            console.log(`Deleting song: ${this.songId}`)
            await client.delete(this.basePath)
        }
        async deleteTrack(trackUrl: string) {
            console.log(`Deleting track ${trackUrl}`)
            await client.delete(trackUrl)
        }
        async listParts() {
            const response = await client.get(`${this.basePath}/parts`);
            return response.data.map(partTrackDtoToPartTrack);
        }
        async listMixes() {
            const response = await client.get(`${this.basePath}/mixes`);
            return response.data.map(mixTrackDtoToMixTrack);
        }
        async uploadPart(partName: string, audioFile: File) {
            const formData = new FormData();
            formData.append('audioFile', audioFile);
            const response = await client.put(`${this.basePath}/parts/${partName}`, formData);
            return response.data;
        }
        async uploadParts(parts: string[], files: File[]) {
            if (parts.length !== files.length) {
                throw new Error("Parts and files arrays must be the same length");
            }
            const formData = new FormData();
            for (let i = 0, p = 0; i < parts.length; i++) {
                if (files[i] != null && parts[i] != null) {
                    ++p;
                    formData.append(`file${p}`, files[i]);
                    formData.append(`part${p}`, parts[i]);
                }
            }
            const response = await client.put(`${this.basePath}/parts?overwrite=true`, formData);
            return response.data.map(partTrackDtoToPartTrack);
        }
        async createMix(mix: StereoMix, isCustom: boolean) {
            const response = await client.post(`${this.basePath}/mixes`, {
                name: mix.name,
                parts: mix.parts,
                description: isCustom ? JSON.stringify(mix.spec) : null
            });
            return mixTrackDtoToMixTrack(response.data[0]);
        }
        async submitZipMixesRequest() {
            const response = await client.post(`${this.basePath}/zip`)
            return response.data as string // task ID
        }
        
    }

    async function getTask(taskId: string): Promise<Task | null> {
        const url = serverUrl + `/tasks/${taskId}`;
        const response = await client.get(url);
        if (response.status == 404) {
            return null;
        }
        if (response.status == 200) {
            return response.data;
        }
        throw new Error(`Unexpected return code from ${url}: ${response.status}`)
    }

    async function waitForTask(taskId: string): Promise<Task | null> {
        for (;;) {
            const task = await getTask(taskId)
            console.debug(`Task: ${JSON.stringify(task)}`)
            if (task.ended) {
                return task;
            }
            await sleep(3000)
        }
    }    

    return { 
        listSongs: async () => {
            const response = await client.get('/songs');
            return response.data;
        },
        createSong: async(song: Partial<Song>) => {
            const response = await client.post('/songs', song);
            return response.data;
        },
        song(songId: string) { return new SongClientImpl(songId) },
        url: getDownloadUrl,
        waitForTask: waitForTask
    }
}