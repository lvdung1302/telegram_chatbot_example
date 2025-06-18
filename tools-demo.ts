import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';

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

async function run(model: string) {
    try {
        const messages: BaseMessage[] = [
            new HumanMessage({ content: 'What is the flight time from New York (NYC) to Los Angeles (LAX)?' }),
        ];

        const llm = new ChatOllama({
            baseUrl: 'http://localhost:11434',
            model,
            temperature: 0,
            verbose: true,
        });

        const flightSchema = z.object({
            departure: z.string().describe('The departure city (airport code)'),
            arrival: z.string().describe('The arrival city (airport code)'),
        });

        const GetFlightTimesTool: DynamicStructuredTool = tool(
            ({ departure, arrival }) => getFlightTimes(departure, arrival),
            {
                name: 'get_flight_times',
                description: 'Get the flight times between two cities',
                schema: flightSchema,
            }
        );

        const llmWithTools = llm.bindTools([GetFlightTimesTool]);

        const response = await llmWithTools.invoke(messages);

        if (response.tool_calls) {
            const availableFunctions: { [key: string]: DynamicStructuredTool } = {
                get_flight_times: GetFlightTimesTool,
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