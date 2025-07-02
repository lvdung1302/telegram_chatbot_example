import { generateEmbedding } from './embed';

async function test() {
  const sampleText = 'The quick brown fox jumps over the lazy dog.';
  const embedding = await generateEmbedding(sampleText);

  console.log('🧪 Embedding preview:', embedding.slice(0, 5));
  console.log('✅ Length:', embedding.length);
  console.log('✅ Type check: ', embedding.every(v => typeof v === 'number'));

  if (embedding.length !== 1024) {
    console.error('❌ Length mismatch! Expected 1024');
  } else {
    console.log('🎉 Embedding is valid and ready!');
  }
}

test();
