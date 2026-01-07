import { Clerk } from '@clerk/clerk-js'
import axios from 'axios';

const serverUrl = import.meta.env.VITE_BACKEND_URL
// const clerk = getClerkInstance()
export function getClient() {
    const client = axios.create({ baseURL: serverUrl })
/*
    client.interceptors.request.use(async (config) => {
        const token = await Clerk.session.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    })*/
    return client
}
