import { getCollectionNameFromFile } from './utils';
import { extractTextFromFile } from './extractTextFromFile';
import { splitText } from './splitText';
import { generateEmbedding } from './embed';
import { client } from './qdrant'; // hoặc export client nếu bạn chưa

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

    const collectionName = getCollectionNameFromFile(chatId, buffer);

    // 🔍 Check nếu collection đã tồn tại
    let exists = false;
    try {
      await client.getCollection(collectionName);
      exists = true;
    } catch {
      await client.createCollection(collectionName, {
        vectors: {
          size: 1024,
          distance: 'Cosine',
        },
      });
      console.log(`✅ Created collection: ${collectionName}`);
    }

    // ❗ Nếu đã tồn tại → bỏ qua insert, báo user
    if (exists) {
      await sendMessage(chatId, `📦 This file "${fileName}" has already been processed.`);
      return collectionName;
    }

    // 🧠 Insert new vectors
    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk);
      await client.upsert(collectionName, {
        points: [
          {
            id: crypto.randomUUID(),
            vector,
            payload: { text: chunk },
          },
        ],
      });
    }

    await sendMessage(chatId, `✅ File "${fileName}" has been indexed and saved to collection: ${collectionName}`);
    return collectionName;
  } catch (err) {
    console.error('❌ Error processing file:', err);
    await sendMessage(chatId, `❌ Failed to process file "${fileName}"`);
    return '';
  }
}
