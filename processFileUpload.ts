import { extractTextFromFile } from './extractTextFromFile';
import { splitText } from './splitText';
import { generateEmbedding } from './embed';
import { createUserCollectionIfNotExists, addToUserCollection } from './chromadb';

/**
 * Xử lý file upload: extract ➜ split ➜ embed ➜ lưu vào ChromaDB
 */
export async function processFileUpload(
  chatId: number,
  fileId: string,
  fileName: string,
  buffer: Buffer,
  sendMessage: (chatId: number, msg: string) => Promise<void>
): Promise<string> {
  try {
    // ✂️ Extract text và split
    const text = await extractTextFromFile(buffer, fileName);
    const chunks = splitText(text);

    // 🆕 Tạo collection cho user nếu chưa có
    await createUserCollectionIfNotExists(chatId);

    // 🧠 Embed và insert từng chunk vào collection của user
    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk);
      await addToUserCollection(chatId, chunk, vector);
    }

    await sendMessage(
      chatId,
      `✅ File "${fileName}" đã được xử lý và lưu vào knowledge base của bạn.`
    );

    return fileName;
  } catch (err) {
    console.error('❌ Error processing file:', err);
    await sendMessage(chatId, `❌ Không thể xử lý file "${fileName}".`);
    return '';
  }
}
