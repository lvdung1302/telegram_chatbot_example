import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';

// === Tool 1: Giả lập API lấy giờ bay ===
function getFlightTimes(departure: string, arrival: string): string {
  console.log(`✈️ Fetching flight times from ${departure} to ${arrival}`);
  const flights = {
    'HAN-TYO': { departure: '09:00 AM', arrival: '03:00 PM', duration: '5h 00m' },
    'NYC-LAX': { departure: '08:00 AM', arrival: '11:30 AM', duration: '5h 30m' },
  };
  const key = `${departure}-${arrival}`.toUpperCase();
  return JSON.stringify(flights[key] || { error: 'Flight not found' });
}

// === Tool 2: Giả lập API thời tiết ===
function getWeather(city: string): string {
  console.log(`🌤️ Fetching weather for ${city}`);
  const weather = {
    'HANOI': { temperature: '34°C', condition: 'Sunny' },
    'TOKYO': { temperature: '27°C', condition: 'Clear' },
  };
  const key = city.toUpperCase();
  return JSON.stringify(weather[key] || { error: 'City not found' });
}

async function run(model: string) {
  const messages: BaseMessage[] = [
    new HumanMessage({
      content: 'What is the flight time from Hanoi to Tokyo and what is the weather like in Tokyo?',
    }),
  ];

  const llm = new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model,
    temperature: 0,
    verbose: true,
  });

  // === Define Tools ===
  const GetFlightTimesTool: DynamicStructuredTool = tool(
    ({ departure, arrival }) => getFlightTimes(departure, arrival),
    {
      name: 'get_flight_times',
      description: 'Get the flight times between two cities',
      schema: z.object({
        departure: z.string().describe('Departure airport code'),
        arrival: z.string().describe('Arrival airport code'),
      }),
    }
  );

  const GetWeatherTool: DynamicStructuredTool = tool(
    ({ city }) => getWeather(city),
    {
      name: 'get_weather',
      description: 'Get the current weather for a city',
      schema: z.object({
        city: z.string().describe('Name of the city'),
      }),
    }
  );

  // === Bind all tools to LLM ===
  const llmWithTools = llm.bindTools([GetFlightTimesTool, GetWeatherTool]);

  // === First model call ===
  const response = await llmWithTools.invoke(messages);

  // === Handle tool calls ===
  if (response.tool_calls) {
    const availableFunctions = {
      get_flight_times: GetFlightTimesTool,
      get_weather: GetWeatherTool,
    };

    for (const toolCall of response.tool_calls) {
      const functionToCall = availableFunctions[toolCall.name];
      if (!functionToCall) continue;

      const functionResponse = await functionToCall.invoke(toolCall.args);

      messages.push(new ToolMessage({
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

  // === Final model call with tool results ===
  const finalResponse = await llmWithTools.invoke(messages);
  console.log('\n✅ Final response:\n', finalResponse.content);
}

run('mistral-nemo');
