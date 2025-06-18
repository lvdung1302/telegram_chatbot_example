import { tool } from '@langchain/core/tools';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function getNews(): Promise<string> {
    const apiKey = process.env.NEWS_API_KEY || 'default_key';
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    try {
        const res = await axios.get(url);
        const top = res.data.articles.slice(0, 3).map((a: any) => ({ title: a.title, source: a.source.name }));
        return JSON.stringify({ headlines: top });
    } catch (error: any) {
        return JSON.stringify({ error: 'Failed to fetch news', details: error.message });
    }
}

export const GetNewsTool = tool(
    () => getNews(),
    {
        name: 'get_news',
        description: 'Get top news headlines',
        schema: {},
    }
);
