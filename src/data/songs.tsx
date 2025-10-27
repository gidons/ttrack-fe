import axios from 'axios';
import { MixTrack, PartTrack, Song } from '../types';

const serverUrl = 'http://localhost:8080';
const client = axios.create({ baseURL: serverUrl })

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
    return response.data;    
}

type ValidationResult = { issues: { path: keyof(Song), message: string }[] }

export function validateSong(song: Partial<Song>) : ValidationResult {
    let issues: ValidationResult['issues'] = [];
    if (song.title.trim() == "") {
        issues.push({ path: "title", message: "Title cannot be empty" })
    }
    return { issues: issues }
}

export function getDownloadUrl(path: string) { return serverUrl + path; }

export function verifyIsSongExceptId(song: Partial<Song>) : song is Omit<Song, 'id'> {
    return !(validateSong(song).issues);
}

export function verifyIsSong(song: Partial<Song>) : song is Song {
    return verifyIsSongExceptId && 'id' in song;
}