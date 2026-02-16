import axios from 'axios';
import { useContext } from 'react';
import { omit, pick, sleep } from '../components/utils';
import { MixTrack, PartTrack, Song, StereoMix, StereoMixSpec, TimedTextData, TimedTextEntry, TrackInfo } from '../types';
import { AuthContext } from './AuthContext';

export interface MixPackageProps {
    parts: string[], 
    mixDescriptions: string[],
    packageDescription: string | null,
    speedFactor: number,
    pitchShift: number
}

export interface PartClient {
    get: () => Promise<PartTrack>
    getAllText: () => Promise<TimedTextData> // Will contain only data for the target part.
    getText: (type: string) => Promise<TimedTextEntry[]>
    putText: (type: string, entries: TimedTextEntry[]) => Promise<void>
    uploadMedia: (audioFile: File) => Promise<PartTrack>
}

export interface SongClient {
    get: () => Promise<Song>
    update: (song: Song) => Promise<Song>
    delete: () => Promise<void>
    deleteTrack: (trackId: string) => Promise<void>
    listParts: () => Promise<PartTrack[]>
    listMixes: () => Promise<MixTrack[]>
    listDefaultMixes: () => Promise<StereoMix[]>
    getText: () => Promise<TimedTextData>
    putText: (data: TimedTextData) => Promise<void>
    uploadPart: (name: string, audioFile: File) => Promise<PartTrack>
    uploadParts: (parts: string[], files: File[]) => Promise<PartTrack[]>
    createMix: (mix: StereoMix, isCustom: boolean, overwrite: boolean) => Promise<MixTrack>
    createMixPackage: (props: MixPackageProps) => Promise<MixTrack[]>
    submitZipMixesRequest: (trackIds: string[]) => Promise<string>
    // TODO have the service return a URL to the just-uploaded file; alternatively, can we show from local storage?
    uploadNotation: (file: File) => Promise<void>
    deleteNotation: () => Promise<void>
    part: (part: string) => PartClient
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
    download: (url: string) => Promise<string>
    waitForTask: (taskId: string) => Promise<Task>
}

/** The following fields of Song require more expensive queries, so we don't always have them. */
const SONG_EXTENDED_FIELDS: (keyof Song)[] = ['parts', 'mediaUrl', 'notationUrl']

type StereoMixDTO = Omit<StereoMix, 'spec'> & { mix: StereoMixSpec };
type MixTrackDTO = Omit<TrackDTO, 'mix'> & { mixInfo: StereoMixDTO };
type TrackDTO = Omit<Omit<TrackInfo, 'updated'>, 'created'> & { updated: string; created: string; }
type PartTrackDTO = TrackDTO;

export function useBackend() : Backend {
    const serverUrl = import.meta.env.VITE_BACKEND_URL

    const authContext = useContext(AuthContext)
    const client = axios.create({ baseURL: serverUrl })
    if (authContext.getToken) {
        client.interceptors.request.use(async (config) => {
            config.headers.Authorization = `Bearer ${await authContext.getToken()}`
            return config
        })
    }

    function getDownloadUrl(path: string) { return path.startsWith('http') ? path : serverUrl + path; }
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

    class PartClientImpl implements PartClient {
        readonly part: string
        readonly songId: string
        readonly basePath: string
        constructor(songId: string, part: string) {
            this.songId = songId
            this.part = part
            this.basePath = `/songs/${this.songId}/parts/${this.part}`
        }
        async get() {
            const response = await client.get(this.basePath)
            return partTrackDtoToPartTrack(response.data)
        }
        async getAllText() {
            const response = await client.get(`${this.basePath}/text`)
            return new TimedTextData(response.data)
        }
        async getText(type: string) {
            const response = await client.get(`${this.basePath}/text/${type}`)
            return response.data
        }
        async putText(type: string, entries: TimedTextEntry[]) {
            await client.put(`${this.basePath}/text/${type}`, entries)
        }
        async uploadMedia(audioFile: File) {
            const formData = new FormData();
            formData.append('audioFile', audioFile);
            const response = await client.put(this.basePath, formData);
            return response.data;
        }
    }

    class SongClientImpl implements SongClient {
        readonly songId: string
        readonly basePath: string
        constructor(songId: string) { 
            this.songId = songId 
            this.basePath = `/songs/${this.songId}`
        }
        async get() { 
            const response = await client.get(`${this.basePath}?extended=true`);
            return response.data
        }
        async update(song: Song) { 
            console.log(`Updating song: ${JSON.stringify(song)}`)
            const response = await client.put(this.basePath, song)
            // Remove the extended fields, which might be there but null
            const updatedInfo = omit(response.data, SONG_EXTENDED_FIELDS)
            return { ...song, ...updatedInfo }
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
        async listDefaultMixes() {
            const response = await client.get(`${this.basePath}/defaultMixes`);
            return response.data.map(mixDtoToMix);
        }
        async getText() {
            const response = await client.get(`${this.basePath}/text`);
            return new TimedTextData(response.data)
        }
        async putText(data: TimedTextData) {
            await client.put(`${this.basePath}/text`, data.entriesByPartAndType);
        }
        part(part: string) {
            return new PartClientImpl(this.songId, part)
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
        async createMix(mix: StereoMix, isCustom: boolean, overwrite: boolean) {
            const response = await client.post(`${this.basePath}/mixes?overwrite=${overwrite}`, {
                name: mix.name,
                parts: mix.parts,
                pitchShift: mix.pitchShift,
                speedFactor: mix.speedFactor,
                description: isCustom ? JSON.stringify(mix.spec) : null
            });
            return mixTrackDtoToMixTrack(response.data[0]);
        }
        async createMixPackage(props: MixPackageProps) {
            const response = await client.post(`${this.basePath}/mixes`, props)
            return (response.data as MixTrackDTO[]).map(mixTrackDtoToMixTrack)            
        }
        async submitZipMixesRequest(trackIds: string[]) {
            console.log(`Submitting zip request for tracks: ${trackIds}`)
            const response = await client.post(`${this.basePath}/zip`, trackIds)
            return response.data as string // task ID
        }
        async uploadNotation(file: File) {
            const formData = new FormData();
            formData.append('file', file);
            await client.put(`${this.basePath}/notation`, formData);
        }
        async deleteNotation() {
            await client.delete(`${this.basePath}/notation`)
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
        async download(url: string) { return (await client.get(url)).data; },
        url: getDownloadUrl,
        waitForTask: waitForTask
    }
}