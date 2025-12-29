import axios from 'axios';
import { MixTrack, PartTrack, Song, StereoMix, StereoMixSpec, TrackInfo } from '../types';

// const serverUrl = 'https://shavit-ttrack.azurewebsites.net';
const serverUrl = 'http://localhost:8080';
const client = axios.create({ baseURL: serverUrl })

type StereoMixDTO = Omit<StereoMix, 'spec'> & { mix: StereoMixSpec };
type MixTrackDTO = Omit<TrackDTO, 'mix'> & { mixInfo: StereoMixDTO };
type TrackDTO = Omit<Omit<TrackInfo, 'updated'>, 'created'> & { updated: string; created: string; }
type PartTrackDTO = TrackDTO;

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
    return response.data.map(partTrackDtoToPartTrack);
}


export async function uploadPartTrack(songId: string, partName: string, audioFile: File) : Promise<PartTrack> {
    const formData = new FormData();
    formData.append('audioFile', audioFile);
    const response = await client.put(`/songs/${songId}/parts/${partName}`, formData);
    return response.data;
}

/**
 * Upload multiple part tracks for a song.
 * @param songId Song ID
 * @param parts Array of part names
 * @param files Array of File objects (must match parts order)
 * @returns Array of PartTrack objects
 */
export async function uploadPartTracks(songId: string, parts: string[], files: File[]): Promise<PartTrack[]> {
    if (parts.length !== files.length) {
        throw new Error("Parts and files arrays must be the same length");
    }
    const formData = new FormData();
    for (let i = 0; i < parts.length; i++) {
        formData.append(`file${i+1}`, files[i]);
        formData.append(`part${i+1}`, parts[i]);
    }
    const response = await client.put(`/songs/${songId}/parts?overwrite=true`, formData);
    // Expecting an array of PartTrackDTOs
    return response.data.map(partTrackDtoToPartTrack);
}

export async function getMixesForSong(songId: string) : Promise<MixTrack[]> {
    const response = await client.get(`/songs/${songId}/mixes`);
    const dtos: MixTrackDTO[] = response.data as MixTrackDTO[];
    return dtos.map(mixTrackDtoToMixTrack);
}

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
    return { ...others, spec: dto.mix };
}

function mixTrackDtoToMixTrack(dto: MixTrackDTO): MixTrack {
    const { mixInfo, ...others } = dto;
    return { ...trackDtoToTrack(others), mix: mixDtoToMix(dto.mixInfo) };
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
    return mixTrackDtoToMixTrack(response.data[0]);
}

export async function createMixPackage(
        songId: string, 
        parts: string[], 
        mixDescriptions: string[],
        packageDescription: string,
        speedFactor: number,
        pitchShift: number) : Promise<MixTrack[]> {
    const response = await client.post(`/songs/${songId}/mixes`,{
        parts: parts,
        mixDescriptions: mixDescriptions,
        packageDescription: packageDescription.trim() || null,
        pitchShift: pitchShift,
        speedFactor: speedFactor
    })
    return (response.data as MixTrackDTO[]).map(mixTrackDtoToMixTrack)
}

export async function deleteTrack(trackUrl: string) {
    console.log(`Deleting track with URL: ${trackUrl}`)
    client.delete(trackUrl)
}

export function getDownloadUrl(path: string) { return serverUrl + path; }

// VALIDATION

type ValidationResult = { issues: { path: keyof(Song), message: string }[] }

export function validateSong(song: Partial<Song>) : ValidationResult {
    const issues: ValidationResult['issues'] = [];
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