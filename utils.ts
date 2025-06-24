import crypto from 'crypto';

export function getCollectionNameFromFile(chatId: number, fileBuffer: Buffer): string {
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 16);
  return `telegram_file_${chatId}_${fileHash}`;
}