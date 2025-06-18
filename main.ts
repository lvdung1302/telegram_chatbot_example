import dotenv from 'dotenv';
dotenv.config();

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { GetJokeTool } from './tools/jokeTool';
import { GetWeatherTool } from './tools/weatherTool';
import { GetNewsTool } from './tools/newsTool';

async function run(model: string) {
    const messages: BaseMessage[] = [
        new HumanMessage({ content: 'Tell me a joke, give me the current weather in Hanoi, and summarize the latest top news headlines.' }),
    ];

    const llm = new ChatOllama({
        baseUrl: 'http://localhost:11434',
        model,
        temperature: 0,
        verbose: true,
    });

    const llmWithTools = llm.bindTools([GetWeatherTool, GetJokeTool, GetNewsTool]);

    const response = await llmWithTools.invoke(messages);
    console.log("🛠️ Tool calls received:", response.tool_calls?.map(call => call.name) || 'None');

    if (response.tool_calls) {
        const availableFunctions = {
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
}

run('mistral-nemo');
