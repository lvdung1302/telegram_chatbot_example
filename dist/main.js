"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ollama_1 = require("@langchain/ollama");
const messages_1 = require("@langchain/core/messages");
const jokeTool_1 = require("./tools/jokeTool");
const weatherTool_1 = require("./tools/weatherTool");
const newsTool_1 = require("./tools/newsTool");
async function run(model) {
    const messages = [
        new messages_1.HumanMessage({ content: 'Tell me a joke, give me the current weather in Hanoi, and summarize the latest top news headlines.' }),
    ];
    const llm = new ollama_1.ChatOllama({
        baseUrl: 'http://localhost:11434',
        model,
        temperature: 0,
        verbose: true,
    });
    const llmWithTools = llm.bindTools([weatherTool_1.GetWeatherTool, jokeTool_1.GetJokeTool, newsTool_1.GetNewsTool]);
    const response = await llmWithTools.invoke(messages);
    console.log("🛠️ Tool calls received:", response.tool_calls?.map(call => call.name) || 'None');
    if (response.tool_calls) {
        const availableFunctions = {
            get_weather: weatherTool_1.GetWeatherTool,
            get_joke: jokeTool_1.GetJokeTool,
            get_news: newsTool_1.GetNewsTool,
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
run('mistral-nemo');
