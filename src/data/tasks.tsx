import axios from 'axios';
import { sleep } from '../components/utils';
const serverUrl = import.meta.env.VITE_BACKEND_URL
const client = axios.create({ baseURL: serverUrl })

interface Task {
    id: string;
    status: string;
    scheduled: Date;
    ended: Date;
    input: object;
    output: object;
}

export async function getTask(taskId: string): Promise<Task | null> {
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

export async function waitForTask(taskId: string): Promise<Task | null> {
    for (;;) {
        const task = await getTask(taskId)
        console.debug(`Task: ${JSON.stringify(task)}`)
        if (task.ended) {
            return task;
        }
        await sleep(3000)
    }
}