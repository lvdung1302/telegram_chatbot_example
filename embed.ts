import fetch from 'node-fetch';

/**
 * Gọi API của Ollama để sinh embedding từ đoạn văn bản.
 * @param text Chuỗi văn bản cần nhúng.
 * @returns Embedding vector dưới dạng mảng số.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'bge-m3:567m', // hoặc 'bge-m3:567m' nếu bạn dùng tag đầy đủ
        prompt: text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`❌ Failed to get embedding: ${res.status} - ${errorText}`);
    }

    const json = await res.json();

    if (!json.embedding || !Array.isArray(json.embedding)) {
      throw new Error('❌ Embedding response is invalid or missing.');
    }

    return json.embedding;
  } catch (err) {
    console.error('❌ Error in generateEmbedding:', err);
    return [];
  }
}
