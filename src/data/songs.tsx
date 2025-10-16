import axios from 'axios';
import { Song } from '../types';

const client = axios.create({ baseURL: 'http://localhost:8080/songs' })

export async function getAllSongs() : Promise<Song[]> {
    const response = await client.get('');
    return response.data;
}

export async function getSong(songId: string) : Promise<Song> {
    const response = await client.get('/' + songId);
    return response.data;
}

export async function createSong(song: Song) : Promise<Song> {
    const response = await client.post('', song);
    return response.data;
}

export async function updateSong(song: Partial<Song>) : Promise<Song> {
    if (!verifyIsSong(song)) {
        throw new Error("Missing data in song object: " + JSON.stringify(song));
    }
    const response = await client.put(song.id, song);
    return response.data
}

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