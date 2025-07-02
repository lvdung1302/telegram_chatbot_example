// ✅ chromadb.ts - kết nối đến ChromaDB REST API (chạy qua Docker)
import fetch from 'node-fetch';

const CHROMA_API = 'http://localhost:8000/api/v2';
const tenant = 'default';
const database = 'default';

// chromadb.ts
export async function createDatabase(tenant: string, database: string) {
  const res = await fetch(`${CHROMA_API}/tenants/${tenant}/databases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: database }),
  });

  if (res.status === 409) {
    console.log(`ℹ️ Database "${database}" already exists.`);
    return;
  }
  
  if (!res.ok) {
    const msg = await res.text();
    console.error(`❌ Create database failed: ${res.status} - ${msg}`);
  } else {
    console.log(`✅ Created database: ${database}`);
  }
}

// collectionName = userId
export async function createCollection(tenant: string, database: string, collectionName: string) {
  const res = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: collectionName, 
      get_or_create: true 
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    console.error(`❌ Create collection failed: ${res.status} - ${msg}`);
  } else {
    console.log(`✅ Created collection: ${collectionName}`);
  }
}

export async function ensureDatabaseAndCollection(collectionName: string) {
  await createDatabase(tenant, database);
  await createCollection(tenant, database, collectionName);
}

export async function addKnowledgeToChroma(collectionName: string, text: string, embedding: number[]) {
  // Step 1: Lấy collection ID
  const getRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionName}`);
  if (!getRes.ok) {
    const errorText = await getRes.text();
    console.error(`❌ Failed to get collection: ${getRes.status} - ${errorText}`);
    return;
  }

  const { id: collectionId } = await getRes.json();

  // Step 2: Gửi embeddings đến collection ID
  const addRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionId}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids: [Date.now().toString()],
      documents: [text],
      embeddings: [embedding],
      metadatas: [{ source: 'telegram_bot' }]
    })
  });

  if (!addRes.ok) {
    const errorText = await addRes.text();
    console.error(`❌ Error from Chroma /add: ${addRes.status} - ${errorText}`);
  } else {
    console.log(`✅ Added knowledge to collection "${collectionName}"`);
  }
}

export async function searchKnowledgeFromChroma(collectionName: string, queryEmbedding: number[]) {
  // Step 1: Lấy collection ID
  const getRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionName}`);
  if (!getRes.ok) {
    const errorText = await getRes.text();
    console.error(`❌ Failed to get collection: ${getRes.status} - ${errorText}`);
    return [];
  }

  const { id: collectionId } = await getRes.json();

  // Step 2: Truy vấn embedding
  const queryRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embeddings: [queryEmbedding],
      n_results: 3,
      include: ['documents', 'distances'] // nên có 'distances' để lọc nếu cần
    })
  });

  if (!queryRes.ok) {
    const errorText = await queryRes.text();
    console.error(`❌ Error from Chroma /query: ${queryRes.status} - ${errorText}`);
    return [];
  }

  const json = await queryRes.json();
  return json.documents?.[0] || [];
}

export async function listKnowledgeFromChroma(collectionName: string): Promise<string[]> {
  const tenant = 'default';
  const database = 'default';

  // Lấy collection ID
  const getRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionName}`);
  if (!getRes.ok) {
    const errorText = await getRes.text();
    console.error(`❌ Failed to get collection: ${getRes.status} - ${errorText}`);
    return [];
  }

  const { id: collectionId } = await getRes.json();

  // Gọi endpoint GET dữ liệu (peek)
  const peekRes = await fetch(`${CHROMA_API}/tenants/${tenant}/databases/${database}/collections/${collectionId}/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: 50, // lấy tối đa 50 documents
      include: ['documents']
    })
  });

  if (!peekRes.ok) {
    const errorText = await peekRes.text();
    console.error(`❌ Error from Chroma /get: ${peekRes.status} - ${errorText}`);
    return [];
  }

  const json = await peekRes.json();
  return json.documents || [];
}
