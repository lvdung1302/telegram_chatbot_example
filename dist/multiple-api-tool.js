"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ollama_1 = require("@langchain/ollama");
const messages_1 = require("@langchain/core/messages");
const tools_1 = require("@langchain/core/tools");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// === Tool 1: Weather ===
async function getWeather(city) {
    console.log(`🌤️ Fetching weather for ${city}`);
    const apiKey = process.env.WEATHER_API_KEY || 'default_key';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    try {
        const response = await axios_1.default.get(url);
        const { main, weather } = response.data;
        return JSON.stringify({
            temperature: main.temp,
            description: weather[0].description,
            city: response.data.name,
        });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch weather data', details: error.response?.data?.message || error.message });
    }
}
// === Tool 2: Joke ===
async function getJoke() {
    console.log(`😂 Fetching a random joke`);
    try {
        const res = await axios_1.default.get('https://v2.jokeapi.dev/joke/Any?type=single');
        return JSON.stringify({ joke: res.data.joke });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch joke', details: error.message });
    }
}
// === Tool 3: News ===
async function getNews() {
    console.log(`📰 Fetching top news headlines`);
    const apiKey = process.env.NEWS_API_KEY || 'default_key';
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    try {
        const res = await axios_1.default.get(url);
        const top = res.data.articles.slice(0, 3).map((a) => ({ title: a.title, source: a.source.name }));
        return JSON.stringify({ headlines: top });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch news', details: error.message });
    }
}
async function run(model) {
    try {
        const messages = [
            new messages_1.HumanMessage({ content: 'Tell me a joke and the weather in Hanoi. Also, any breaking news?' }),
        ];
        const llm = new ollama_1.ChatOllama({
            baseUrl: 'http://localhost:11434',
            model,
            temperature: 0,
            verbose: true,
        });
        const GetWeatherTool = (0, tools_1.tool)(({ city }) => getWeather(city), {
            name: 'get_weather',
            description: 'Get the current weather for a specified city',
            schema: zod_1.z.object({ city: zod_1.z.string().describe('The city name to get weather for') }),
        });
        const GetJokeTool = (0, tools_1.tool)(() => getJoke(), {
            name: 'get_joke',
            description: 'Get a random joke',
            schema: zod_1.z.object({}),
        });
        const GetNewsTool = (0, tools_1.tool)(() => getNews(), {
            name: 'get_news',
            description: 'Get top news headlines',
            schema: zod_1.z.object({}),
        });
        const llmWithTools = llm.bindTools([GetWeatherTool, GetJokeTool, GetNewsTool]);
        const response = await llmWithTools.invoke(messages);
        if (response.tool_calls) {
            const availableFunctions = {
                get_weather: GetWeatherTool,
                get_joke: GetJokeTool,
                get_news: GetNewsTool,
            };
            for (const toolCall of response.tool_calls) {
                const functionToCall = availableFunctions[toolCall.name];
                if (!functionToCall)
                    continue;
                const functionResponse = await functionToCall.invoke(toolCall.args);
                messages.push(new messages_1.ToolMessage({
                    content: functionResponse,
                    name: toolCall.name,
                    additional_kwargs: {
                        function_call: {
                            arguments: JSON.stringify(toolCall.args),
                            name: toolCall.name,
                        },
                    },
                }, toolCall.id || `${Date.now()}`, toolCall.name));
            }
        }
        const finalResponse = await llmWithTools.invoke(messages);
        console.log('\n✅ Final response:\n', finalResponse.content);
    }
    catch (error) {
        console.error('An error occurred:', error);
    }
}
run('mistral-nemo');
