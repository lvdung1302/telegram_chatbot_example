// ✅ telegram_bot.ts - Telegram Bot sử dụng Ollama + ChromaDB (API v2)
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
import { getTelegramFileUrl } from './getTelegramFileUrl';
import { extractTextFromFile } from './extractTextFromFile';
import {
  addKnowledgeToChroma,
  searchKnowledgeFromChroma,
  listKnowledgeFromChroma,
  ensureDatabaseAndCollection,
} from './chromadb';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const userMemory = new Map<number, BaseMessage[]>();
const userLastFileMap = new Map<number, string>();

const llm = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral-nemo',
  temperature: 0,
  verbose: true,
});
const llmWithTools = llm.bindTools([GetWeatherTool, GetJokeTool, GetNewsTool]);

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function processMessage(chatId: number, text: string) {
  const collection = String(chatId);
  await ensureDatabaseAndCollection(collection);

  if (text.startsWith('/add-knowledge')) {
    const content = text.replace('/add-knowledge', '').trim();
    if (!content) {
      await sendMessage(chatId, '❗ Please provide content to add.');
      return;
    }
    const embedding = await generateEmbedding(content);
    await addKnowledgeToChroma(collection, content, embedding);
    await sendMessage(chatId, '✅ Knowledge added successfully!');
    return;
  }

  if (text === '/list-knowledge') {
    const docs = await listKnowledgeFromChroma(collection);
    if (docs.length === 0) {
      await sendMessage(chatId, 'ℹ️ No knowledge found in memory.');
    } else {
      const result = docs.map((d, i) => `#${i + 1}: ${d}`).join('\n');
      await sendMessage(chatId, `🧠 Knowledge in memory:\n\n${result}`);
    }
    return;
  }

  const history = userMemory.get(chatId) || [];
  const queryEmbedding = await generateEmbedding(text);
  const related = await searchKnowledgeFromChroma(collection, queryEmbedding);
  if (related.length > 0) {
    const memoryText = related.map((m, i) => `Relevant: ${m}`).join('\n');
    history.push(new SystemMessage(memoryText));
  }

  history.push(new HumanMessage({ content: text }));
  const response = await llmWithTools.invoke(history);

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
      const resultEmbedding = await generateEmbedding(result);

      history.push(new ToolMessage({
        content: result,
        name: toolCall.name,
        tool_call_id: toolCall.id,
      }));

      await addKnowledgeToChroma(collection, result, resultEmbedding);
    }
  }

  const finalResponse = await llmWithTools.invoke(history);
  await sendMessage(chatId, String(finalResponse.content));
  userMemory.set(chatId, history);
}

async function startPolling() {
  let offset = 0;
  console.log('🚀 Bot started, waiting for messages...');

  while (true) {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset + 1}&timeout=30`);
    const data = await res.json();

    for (const update of data.result || []) {
      offset = update.update_id;
      const message = update.message;
      const chatId = message?.chat?.id;

      if (message?.document) {
        const fileId = message.document.file_id;
        const fileName = message.document.file_name;
        const fileUrl = await getTelegramFileUrl(fileId);

        console.log(`📥 Downloading ${fileName} from: ${fileUrl}`);
        const fileBuffer = await fetch(fileUrl).then(res => res.buffer());
        await sendMessage(chatId, `✅ File "${fileName}" received. Processing...`);

        const textContent = await extractTextFromFile(fileBuffer, fileName);
        
        const embedding = await generateEmbedding(textContent);

        await ensureDatabaseAndCollection(String(chatId));
        await addKnowledgeToChroma(String(chatId), textContent, embedding);

        await sendMessage(chatId, `📄 Text from "${fileName}" added to knowledge base.`);

        userLastFileMap.set(chatId, fileId);
        continue;
      }

      if (message?.text) {
        await processMessage(chatId, message.text);
      }
    }
  }
}

startPolling();
