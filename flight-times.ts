// Example of using tools with Ollama and Langchain,
// rewrite the original example of https://github.com/ollama/ollama-js/blob/main/examples/tools/tools.ts
//


/**
 * Ollama now supports tool calling with popular models such as Llama 3.1, Mistral-Nemo, etc.(https://ollama.com/search?c=tools)
 * This enables a model to answer a given prompt using tool(s) it knows about, 
 * making it possible for models to perform more complex tasks or interact with the outside world.
 *
 * Example tools include:
 * - Functions and APIs
 * - Web browsing
 * - Code interpreter
 * - much more!
 */

import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
// Simulates an API call to get flight times
function getFlightTimes(departure: string, arrival: string): string {
    console.log(`Fetching flight times from ${departure} to ${arrival}`);
    const flights: { [key: string]: { departure: string; arrival: string; duration: string } } = {
        'NYC-LAX': { departure: '08:00 AM', arrival: '11:30 AM', duration: '5h 30m' },
        'LAX-NYC': { departure: '02:00 PM', arrival: '10:30 PM', duration: '5h 30m' },
        'LHR-JFK': { departure: '10:00 AM', arrival: '01:00 PM', duration: '8h 00m' },
        'JFK-LHR': { departure: '09:00 PM', arrival: '09:00 AM', duration: '7h 00m' },
        'CDG-DXB': { departure: '11:00 AM', arrival: '08:00 PM', duration: '6h 00m' },
        'DXB-CDG': { departure: '03:00 AM', arrival: '07:30 AM', duration: '7h 30m' },
    };

    const key = `${departure}-${arrival}`.toUpperCase();
    return JSON.stringify(flights[key] || { error: 'Flight not found' });
}

// Fetches weather data from OpenWeatherMap API
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

// Main function to run the query
async function run(model: string) {
    try {
        // Initialize conversation with a user query
        const messages: BaseMessage[] = [
            new HumanMessage({ content: 'Flight times NYC-LAX' }),
        ];

        // Initialize ChatOllama with the specified model
        const llm = new ChatOllama({
            baseUrl: 'http://localhost:11434',
            model,
            temperature: 0,
            verbose: true,
        });

        // Define the flight times tool
        const flightSchema = z.object({
            departure: z.string().describe('The departure city (airport code)'),
            arrival: z.string().describe('The arrival city (airport code)'),
        });

        const GetFlightTimesTool: DynamicStructuredTool = tool(
            ({ departure, arrival }) => getFlightTimes(departure, arrival),
            {
                name: 'get_flight_times',
                description: 'Get the flight times between two cities using airport codes',
                schema: flightSchema,
            }
        );

        // Define the weather tool
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

        // Bind both tools to the LLM
        const llmWithTools = llm.bindTools([GetFlightTimesTool, GetWeatherTool]);

        // First API call: Send query and tool descriptions to the model
        const response = await llmWithTools.invoke(messages);

        // Process tool calls if present
        if (response.tool_calls) {
            const availableFunctions: { [key: string]: DynamicStructuredTool } = {
                get_flight_times: GetFlightTimesTool,
                get_weather: GetWeatherTool,
            };
            for (const toolCall of response.tool_calls) {
                const functionToCall = availableFunctions[toolCall.name];
                if (!functionToCall) {
                    console.error(`Function ${toolCall.name} not found`);
                    continue;
                }
                const functionResponse = await functionToCall.invoke(toolCall.args);
                // Add tool response to the conversation
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

        // Second API call: Get final response from the model
        const finalResponse = await llmWithTools.invoke(messages);
        console.log('Final response:', finalResponse.content);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the script with the specified model
run('mistral-nemo');

// Answer: "The flight departs at 08:00 AM and arrives at 11:30 AM, with a duration of 5 hours and 30 minutes. (Duration is local time)"
