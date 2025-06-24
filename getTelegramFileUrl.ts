import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();

  if (!data.ok) throw new Error("❌ Failed to get file info from Telegram");
  const filePath = data.result.file_path;

  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`;
}
