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
  searchRelevantKnowledgeFromCollection,
} from './qdrant';
import { getTelegramFileUrl } from './getTelegramFileUrl';
import { extractTextFromFile } from './extractTextFromFile';
import { processFileUpload } from './processFileUpload';


const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const userMemory = new Map<number, BaseMessage[]>(); // memory theo chatId
const userFileMap = new Map<number, string>(); // <chatId, fileId>
const userLastFileMap = new Map<number, string>(); // <chatId, lastUsedFileId>
const fileCollectionMap = new Map<string, string>();

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
  // 1. /add-knowledge
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

  // 2. /use-file <fileId>
  if (text.startsWith('/use-file')) {
    const fileId = text.replace('/use-file', '').trim();
    if (!fileId) {
      await sendMessage(chatId, '❗ Please provide a fileId. Usage: /use-file <fileId>');
      return;
    }

    userFileMap.set(chatId, fileId);
    await sendMessage(chatId, `📎 Using file with ID: ${fileId} for future questions.`);
    return;
  }

  // 3. Load memory và embedding
  const history = userMemory.get(chatId) || [];
  const queryVector = await generateEmbedding(text);

  // 3.1. Tìm knowledge của user (từ /add-knowledge)
  const memories = await searchRelevantKnowledge(chatId, queryVector);
  if (memories.length > 0) {
    const memoryText = memories
      .map((m, i) => `Relevant info [user-${i + 1}]: ${m}`)
      .join('\n');
    history.push(new SystemMessage(memoryText));
  }

  // ✅ 3.2. Tìm knowledge từ file Qdrant nếu có collectionName
  const collectionName = userFileMap.get(chatId) || userLastFileMap.get(chatId);
  if (collectionName) {
    const memories = await searchRelevantKnowledgeFromCollection(collectionName, queryVector);

    if (memories.length > 0) {
      const memoryText = memories
        .map((m, i) => `Relevant info [file-${i + 1}]: ${m}`)
        .join('\n');
      history.push(new SystemMessage(memoryText));
    }
  }

  // 4. Thêm message người dùng
  history.push(new HumanMessage({ content: text }));

  // 5. Gọi LLM với tool
  const response = await llmWithTools.invoke(history);

  // 6. Nếu có gọi tool, xử lý tool call và lưu vào Qdrant
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

  // 7. Trả lời người dùng
  const finalResponse = await llmWithTools.invoke(history);
  await sendMessage(chatId, String(finalResponse.content));

  // 8. Cập nhật memory
  userMemory.set(chatId, history);
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
      const chatId = message?.chat?.id;

      // 📦 1. Nếu là file gửi lên Telegram
      if (message?.document) {
        const fileId = message.document.file_id;
        const fileName = message.document.file_name;
        const fileUrl = await getTelegramFileUrl(fileId);

        console.log(`📥 Downloading ${fileName} from: ${fileUrl}`);

        const fileBuffer = await fetch(fileUrl).then(res => res.buffer());

        await sendMessage(chatId, `✅ File "${fileName}" received. Processing...`);

        const collectionName = await processFileUpload(chatId, fileId, fileName, fileBuffer, sendMessage);

        if (collectionName) {
          userLastFileMap.set(chatId, collectionName); // ✅ Ghi nhớ collection để truy vấn sau
        }

        continue; 
      }
      
      // 💬 2. Nếu là tin nhắn văn bản thì xử lý như cũ
      if (message?.text) {
        await processMessage(chatId, message.text);
      }
    }
  }
}

startPolling();
