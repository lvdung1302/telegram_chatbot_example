import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

import { ChatOllama } from '@langchain/ollama';
import {
  HumanMessage,
  ToolMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/dist/messages/base';

import { GetJokeTool } from './tools/jokeTool';
import { GetWeatherTool } from './tools/weatherTool';
import { GetNewsTool } from './tools/newsTool';

import { generateEmbedding } from './embed';
import {
  addKnowledgeVector,
  searchRelevantKnowledge,
  initQdrant,
} from './qdrant';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const userMemory = new Map<number, BaseMessage[]>(); // memory theo chatId

const llm = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral-nemo', // hoặc llama3.1
  temperature: 0,
  verbose: true,
});
const llmWithTools = llm.bindTools([
  GetWeatherTool,
  GetJokeTool,
  GetNewsTool,
]);

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

async function processMessage(chatId: number, text: string) {
  // Nếu là lệnh thêm kiến thức
  if (text.startsWith('/add-knowledge')) {
    const content = text.replace('/add-knowledge', '').trim();
    if (!content) {
      await sendMessage(chatId, '❗ Please provide content to add.');
      return;
    }

    const vector = await generateEmbedding(content);
    await addKnowledgeVector(chatId, content, vector);
    await sendMessage(chatId, '✅ Knowledge added successfully!');
    return;
  }

  const history = userMemory.get(chatId) || [];

  // 1. Tìm lại kiến thức từ Qdrant theo vector
  const queryVector = await generateEmbedding(text);
  const memories = await searchRelevantKnowledge(chatId, queryVector);

  if (memories.length > 0) {
    const memoryText = memories
      .map((m, i) => `Relevant info [${i + 1}]: ${m}`)
      .join('\n');
    history.push(new SystemMessage(memoryText));
  }

  // 2. Thêm message người dùng
  history.push(new HumanMessage({ content: text }));

  // 3. Gọi LLM với tool
  const response = await llmWithTools.invoke(history);

  // 4. Nếu có gọi tool, xử lý tool call
  if (response.tool_calls) {
    const toolMap = {
      get_weather: GetWeatherTool,
      get_joke: GetJokeTool,
      get_news: GetNewsTool,
    };

    for (const toolCall of response.tool_calls) {
      const tool = toolMap[toolCall.name];
      if (!tool) continue;
      const result = await tool.invoke(toolCall.args);
      history.push(
        new ToolMessage({
          content: result,
          name: toolCall.name,
          tool_call_id: toolCall.id,
        })
      );

      const autoMemoryVector = await generateEmbedding(result);
      await addKnowledgeVector(chatId, result, autoMemoryVector);
    }
  }

  const finalResponse = await llmWithTools.invoke(history);
  await sendMessage(chatId, String(finalResponse.content));

  userMemory.set(chatId, history); // lưu memory
}

async function startPolling() {
  await initQdrant(); // tạo collection nếu chưa có
  let offset = 0;
  console.log('🚀 Bot started, waiting for messages...');

  while (true) {
    const res = await fetch(
      `${TELEGRAM_API}/getUpdates?offset=${offset + 1}&timeout=30`
    );
    const data = await res.json();

    for (const update of data.result || []) {
      offset = update.update_id;
      const message = update.message;
      if (message?.text) {
        console.log('💬 Message received:', message.text);
        await processMessage(message.chat.id, message.text);
      }
    }
  }
}

startPolling();
