"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ollama_1 = require("@langchain/ollama");
const messages_1 = require("@langchain/core/messages");
const jokeTool_1 = require("./tools/jokeTool");
const weatherTool_1 = require("./tools/weatherTool");
const newsTool_1 = require("./tools/newsTool");
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const llm = new ollama_1.ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'mistral-nemo',
    temperature: 0,
    verbose: true,
});
const llmWithTools = llm.bindTools([weatherTool_1.GetWeatherTool, jokeTool_1.GetJokeTool, newsTool_1.GetNewsTool]);
async function sendMessage(chatId, text) {
    await (0, node_fetch_1.default)(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}
async function processMessage(chatId, text) {
    const messages = [new messages_1.HumanMessage({ content: text })];
    const response = await llmWithTools.invoke(messages);
    if (response.tool_calls) {
        const toolMap = {
            get_joke: jokeTool_1.GetJokeTool,
            get_weather: weatherTool_1.GetWeatherTool,
            get_news: newsTool_1.GetNewsTool,
        };
        for (const toolCall of response.tool_calls) {
            const tool = toolMap[toolCall.name];
            if (!tool)
                continue;
            const result = await tool.invoke(toolCall.args);
            messages.push(new messages_1.ToolMessage({
                content: result,
                name: toolCall.name,
                tool_call_id: toolCall.id, // ← Quan trọng!
            }));
        }
    }
    const finalResponse = await llmWithTools.invoke(messages);
    await sendMessage(chatId, String(finalResponse.content));
}
async function startPolling() {
    let offset = 0;
    while (true) {
        const res = await (0, node_fetch_1.default)(`${TELEGRAM_API}/getUpdates?offset=${offset + 1}&timeout=30`);
        const data = await res.json();
        for (const update of data.result || []) {
            offset = update.update_id;
            const message = update.message;
            if (message?.text) {
                await processMessage(message.chat.id, message.text);
            }
        }
    }
}
startPolling();
