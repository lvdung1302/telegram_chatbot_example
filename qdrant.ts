// qdrant.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

export const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

const COLLECTION_NAME = 'telegram_knowledge';

export async function initQdrant() {
  const collections = await client.getCollections();
  const exists = collections.collections.find(c => c.name === COLLECTION_NAME);
  if (!exists) {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1024, // bge-m3 có output là 1024 dimensions
        distance: 'Cosine',
      },
    });
    console.log(`✅ Created collection: ${COLLECTION_NAME}`);
  }
}

// Lưu knowledge vector theo chatId
export async function addKnowledgeVector(chatId: number, text: string, vector: number[]) {
  await client.upsert(COLLECTION_NAME, {
    points: [{
      id: uuidv4(), // ✅ Dùng UUID hợp lệ thay vì chuỗi tự tạo
      vector,
      payload: {
        chatId,
        text,
      },
    }],
  });
}

// Truy vấn top k knowledge giống nhất theo vector
export async function searchRelevantKnowledge(chatId: number, queryVector: number[], topK = 3) {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    filter: {
      must: [
        {
          key: 'chatId',
          match: { value: chatId },
        },
      ],
    },
  });

  return results.map(r => r.payload?.text as string);
}

export async function upsertToCollection(collectionName: string, text: string, vector: number[]) {
  // tạo collection nếu chưa tồn tại
  try {
    await client.getCollection(collectionName);
  } catch {
    await client.createCollection(collectionName, {
      vectors: {
        size: 1024,
        distance: 'Cosine',
      },
    });
    console.log(`✅ Created collection: ${collectionName}`);
  }

  await client.upsert(collectionName, {
    points: [
      {
        id: uuidv4(),
        vector,
        payload: { text },
      },
    ],
  });
}

export async function searchRelevantKnowledgeFromCollection(
  collectionName: string,
  queryVector: number[],
  topK = 3
) {
  const results = await client.search(collectionName, {
    vector: queryVector,
    limit: topK,
  });

  return results.map(r => r.payload?.text as string);
}
