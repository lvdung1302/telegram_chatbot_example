import pdfParser from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import xlsx from 'xlsx';

export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (!extension) throw new Error("❌ Cannot determine file extension");

  switch (extension) {
    case 'pdf':
      return await extractFromPDF(buffer);

    case 'docx':
      return await extractFromDocx(buffer);

    case 'xlsx':
      return extractFromXlsx(buffer);

    case 'txt':
      return buffer.toString('utf-8');

    default:
      throw new Error(`❌ Unsupported file type: ${extension}`);
  }
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParser(buffer);
  return data.text;
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractFromXlsx(buffer: Buffer): string {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  let text = '';

  workbook.SheetNames.forEach(sheet => {
    const worksheet = workbook.Sheets[sheet];
    const sheetText = xlsx.utils.sheet_to_csv(worksheet); // or sheet_to_txt
    text += `Sheet: ${sheet}\n${sheetText}\n`;
  });

  return text;
}
