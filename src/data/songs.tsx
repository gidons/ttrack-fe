import axios from 'axios';
import { Song } from '../types';

const client = axios.create({ baseURL: 'http://localhost:8080/songs' })

export async function getAllSongs() : Promise<Song[]> {
    const response = await client.get('');
    return response.data;
}

export async function createSong(song: Song) : Promise<string> {
    const response = await client.post('', song);
    return response.data;
}