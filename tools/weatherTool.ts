import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

async function getWeather(city: string): Promise<string> {
    const apiKey = process.env.WEATHER_API_KEY || 'default_key';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    try {
        const response = await axios.get(url);
        const { main, weather } = response.data;
        return JSON.stringify({
            temperature: main.temp,
            description: weather[0].description,
            city: response.data.name,
        });
    } catch (error: any) {
        return JSON.stringify({ error: 'Failed to fetch weather data', details: error.response?.data?.message || error.message });
    }
}

export const GetWeatherTool = tool(
    ({ city }) => getWeather(city),
    {
        name: 'get_weather',
        description: 'Get the current weather for a specified city',
        schema: z.object({ city: z.string().describe('The city name to get weather for') }),
    }
);
