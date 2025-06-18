import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// === Weather Tool (uses real OpenWeatherMap API) ===
async function getWeather(city: string): Promise<string> {
    console.log(`Fetching weather for ${city}`);
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
        console.error('Weather API error:', error.response?.data || error.message);
        return JSON.stringify({ error: 'Failed to fetch weather data', details: error.response?.data?.message || error.message });
    }
}

async function run(model: string) {
    try {
        const messages: BaseMessage[] = [
            new HumanMessage({ content: 'Ha Noi temperature now !' }),
        ];

        const llm = new ChatOllama({
            baseUrl: 'http://localhost:11434',
            model,
            temperature: 0,
            verbose: true,
        });

        // === Weather Tool Definition ===
        const weatherSchema = z.object({
            city: z.string().describe('The city name to get weather for'),
        });

        const GetWeatherTool: DynamicStructuredTool = tool(
            ({ city }) => getWeather(city),
            {
                name: 'get_weather',
                description: 'Get the current weather for a specified city',
                schema: weatherSchema,
            }
        );

        // === Bind Tool(s) to LLM ===
        const llmWithTools = llm.bindTools([GetWeatherTool]);

        const response = await llmWithTools.invoke(messages);

        if (response.tool_calls) {
            const availableFunctions: { [key: string]: DynamicStructuredTool } = {
                get_weather: GetWeatherTool,
            };

            for (const toolCall of response.tool_calls) {
                const functionToCall = availableFunctions[toolCall.name];
                if (!functionToCall) {
                    console.error(`Function ${toolCall.name} not found`);
                    continue;
                }

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
                    }, toolCall.id || `${new Date().getTime()}`, toolCall.name)
                );
            }
        }

        const finalResponse = await llmWithTools.invoke(messages);
        console.log('Final response:', finalResponse.content);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

run('mistral-nemo');
