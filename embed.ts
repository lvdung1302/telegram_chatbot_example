import fetch from 'node-fetch';

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'bge-m3:567m', // tên model của bạn trong Ollama
      prompt: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`❌ Failed to get embedding: ${res.statusText}`);
  }

  const json = await res.json();
  return json.embedding;
}