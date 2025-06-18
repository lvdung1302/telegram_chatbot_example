import { tool } from '@langchain/core/tools';
import axios from 'axios';

async function getJoke(): Promise<string> {
    try {
        const res = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
        return JSON.stringify({ joke: res.data.joke });
    } catch (error: any) {
        return JSON.stringify({ error: 'Failed to fetch joke', details: error.message });
    }
}

export const GetJokeTool = tool(
    () => getJoke(),
    {
        name: 'get_joke',
        description: 'Get a random joke',
        schema: {},
    }
);
