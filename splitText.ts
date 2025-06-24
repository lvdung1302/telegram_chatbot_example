export function splitText(text: string, maxLength = 500): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + line).length > maxLength) {
      chunks.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
