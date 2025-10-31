import axios from 'axios';
import { MixTrack, PartTrack, Song, StereoMix, StereoMixSpec, TrackInfo } from '../types';
import { M } from 'react-router/dist/development/routeModules-D5iJ6JYT';

const serverUrl = 'http://localhost:8080';
const client = axios.create({ baseURL: serverUrl })

type StereoMixDTO = Omit<StereoMix, 'spec'> & { mix: StereoMixSpec };
type MixTrackDTO = Omit<MixTrack, 'mix'> & { mixInfo: StereoMixDTO };

export async function getAllSongs() : Promise<Song[]> {
    const response = await client.get('/songs');
    return response.data;
}

export async function getSong(songId: string) : Promise<Song> {
    const response = await client.get(`/songs/${songId}`);
    return response.data;
}

export async function createSong(song: Song) : Promise<Song> {
    const response = await client.post('/songs', song);
    return response.data;
}

export async function updateSong(song: Partial<Song>) : Promise<Song> {
    if (!verifyIsSong(song)) {
        throw new Error("Missing data in song object: " + JSON.stringify(song));
    }
    const response = await client.put(`/songs/${song.id}`, song);
    return response.data
}

export async function getPartsForSong(songId: string) : Promise<PartTrack[]> {
    const response = await client.get(`/songs/${songId}/parts`);
    return response.data;
}

export async function getMixesForSong(songId: string) : Promise<MixTrack[]> {
    const response = await client.get(`/songs/${songId}/mixes`);
    const dtos: MixTrackDTO[] = response.data as MixTrackDTO[];
    return dtos.map(mixTrackDtoToMixTrack);
}

function mixDtoToMix(dto: StereoMixDTO): StereoMix {
    const { mix, ...others } = dto;
    return { ...others, spec: dto.mix }
}

function mixTrackDtoToMixTrack(dto: MixTrackDTO): MixTrack {
    const { mixInfo, ...others } = dto;
    return { ...others, mix: mixDtoToMix(dto.mixInfo) };
}

export async function getDefaultMixesForSong(songId: string) : Promise<StereoMix[]> {
    const response = await client.get(`/songs/${songId}/defaultMixes`);
    return response.data.map(mixDtoToMix);    
}

export async function createMixTrack(songId: string, mix: StereoMix, isCustom: boolean): Promise<MixTrack> {
    const response = await client.post(`/songs/${songId}/mixes`, {
        name: mix.name,
        parts: mix.parts,
        description: isCustom ? JSON.stringify(mix.spec) : null
    });
    return mixTrackDtoToMixTrack(response.data);
}

export function getDownloadUrl(path: string) { return serverUrl + path; }

// VALIDATION

type ValidationResult = { issues: { path: keyof(Song), message: string }[] }

export function validateSong(song: Partial<Song>) : ValidationResult {
    let issues: ValidationResult['issues'] = [];
    if (song.title.trim() == "") {
        issues.push({ path: "title", message: "Title cannot be empty" })
    }
    return { issues: issues }
}

export function verifyIsSongExceptId(song: Partial<Song>) : song is Omit<Song, 'id'> {
    return !(validateSong(song).issues);
}

export function verifyIsSong(song: Partial<Song>) : song is Song {
    return verifyIsSongExceptId && 'id' in song;
}