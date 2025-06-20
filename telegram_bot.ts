import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';

import { GetJokeTool } from './tools/jokeTool';
import { GetWeatherTool } from './tools/weatherTool';
import { GetNewsTool } from './tools/newsTool';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

const llm = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral-nemo',
  temperature: 0,
  verbose: true,
});
const llmWithTools = llm.bindTools([GetWeatherTool, GetJokeTool, GetNewsTool]);

const userMemory = new Map<number, BaseMessage[]>();

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function processMessage(chatId: number, text: string) {
  const history = userMemory.get(chatId) || [];
  history.push(new HumanMessage({ content: text }));

  const response = await llmWithTools.invoke(history);

  if (response.tool_calls) {
    const tools = {
      get_weather: GetWeatherTool,
      get_joke: GetJokeTool,
      get_news: GetNewsTool,
    };

    for (const toolCall of response.tool_calls) {
      const tool = tools[toolCall.name];
      if (!tool) continue;
      const result = await tool.invoke(toolCall.args);
      history.push(
        new ToolMessage({
          content: result,
          name: toolCall.name,
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  const finalResponse = await llmWithTools.invoke(history);
  userMemory.set(chatId, history); // 🔁 lưu lại toàn bộ history cho lần sau
  await sendMessage(chatId, String(finalResponse.content));
}

async function startPolling() {
  let offset = 0;
  while (true) {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset + 1}&timeout=30`);
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
