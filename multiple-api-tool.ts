import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// === Tool 1: Weather ===
async function getWeather(city: string): Promise<string> {
    console.log(`🌤️ Fetching weather for ${city}`);
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

// === Tool 2: Joke ===
async function getJoke(): Promise<string> {
    console.log(`😂 Fetching a random joke`);
    try {
        const res = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
        return JSON.stringify({ joke: res.data.joke });
    } catch (error: any) {
        return JSON.stringify({ error: 'Failed to fetch joke', details: error.message });
    }
}

// === Tool 3: News ===
async function getNews(): Promise<string> {
    console.log(`📰 Fetching top news headlines`);
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

async function run(model: string) {
    try {
        const messages: BaseMessage[] = [
            new HumanMessage({ content: 'Tell me a joke and the weather in Hanoi. Also, any breaking news?' }),
        ];

        const llm = new ChatOllama({
            baseUrl: 'http://localhost:11434',
            model,
            temperature: 0,
            verbose: true,
        });

        const GetWeatherTool = tool(
            ({ city }) => getWeather(city),
            {
                name: 'get_weather',
                description: 'Get the current weather for a specified city',
                schema: z.object({ city: z.string().describe('The city name to get weather for') }),
            }
        );

        const GetJokeTool = tool(
            () => getJoke(),
            {
                name: 'get_joke',
                description: 'Get a random joke',
                schema: z.object({}),
            }
        );

        const GetNewsTool = tool(
            () => getNews(),
            {
                name: 'get_news',
                description: 'Get top news headlines',
                schema: z.object({}),
            }
        );

        const llmWithTools = llm.bindTools([GetWeatherTool, GetJokeTool, GetNewsTool]);

        const response = await llmWithTools.invoke(messages);

        if (response.tool_calls) {
            const availableFunctions: { [key: string]: DynamicStructuredTool } = {
                get_weather: GetWeatherTool,
                get_joke: GetJokeTool,
                get_news: GetNewsTool,
            };

            for (const toolCall of response.tool_calls) {
                const functionToCall = availableFunctions[toolCall.name];
                if (!functionToCall) continue;
                const functionResponse = await functionToCall.invoke(toolCall.args);
                messages.push(
                    new ToolMessage({
                        content: functionResponse,
                        name: toolCall.name,
                        additional_kwargs: {
                            function_call: {
                                arguments: JSON.stringify(toolCall.args),
                                name: toolCall.name,
                            },
                        },
                    }, toolCall.id || `${Date.now()}`, toolCall.name)
                );
            }
        }

        const finalResponse = await llmWithTools.invoke(messages);
        console.log('\n✅ Final response:\n', finalResponse.content);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

run('mistral-nemo');
