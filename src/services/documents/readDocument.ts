import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ReadProgress {
  stage: 'pdf' | 'ocr';
  message: string;
  progress?: number;
}

export interface ExtractedDocumentData {
  text: string;
  date?: string;
  merchant?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  source: 'pdf-text' | 'ocr' | 'pdf-text+ocr';
}

const cleanText = (value: string) =>
  value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function parseAmount(value: string): number | undefined {
  let cleaned = value.replace(/[$€£]/g, '').replace(/\s/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    const decimals = cleaned.split(',').at(-1) ?? '';
    cleaned = decimals.length <= 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }
  const amount = Number(cleaned.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function extractFields(text: string, source: ExtractedDocumentData['source']): ExtractedDocumentData {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const dateMatch = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/](?:20)?\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})\b/);
  let date: string | undefined;
  if (dateMatch) {
    const raw = dateMatch[0];
    const iso = raw.match(/^(20\d{2})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) date = `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
    else {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString().slice(0,10);
    }
  }

  const totalLine = lines.find(line => /\b(total|amount due|balance due|grand total|total paid)\b/i.test(line));
  const taxLine = lines.find(line => /\b(GST|HST|PST|QST|VAT|sales tax|tax)\b/i.test(line));
  const subtotalLine = lines.find(line => /\b(subtotal|sub-total)\b/i.test(line));
  const lastAmount = (line?: string) => {
    if (!line) return undefined;
    const matches = line.match(/-?\$?\s*\d[\d\s,]*(?:\.\d{2})?/g);
    return matches?.length ? parseAmount(matches[matches.length - 1]) : undefined;
  };

  const merchant = lines.slice(0, 6).find(line =>
    line.length >= 3 && line.length <= 70 &&
    !/\b(invoice|receipt|date|phone|tel|www\.|http|GST|HST|PST|QST)\b/i.test(line) &&
    !/^\d[\d\s-]+$/.test(line)
  );

  return {
    text,
    date,
    merchant,
    subtotal: lastAmount(subtotalLine),
    tax: lastAmount(taxLine),
    total: lastAmount(totalLine),
    source,
  };
}

async function readPdf(file: Blob, onProgress?: (progress: ReadProgress) => void) {
  onProgress?.({ stage: 'pdf', message: 'Reading PDF text…', progress: 0 });
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts: string[] = [];
  const pageCanvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
    if (pageText.trim().length < 30 && pageNumber <= 5) {
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        pageCanvases.push(canvas);
      }
    }
    onProgress?.({
      stage: 'pdf',
      message: `Reading PDF page ${pageNumber} of ${pdf.numPages}…`,
      progress: pageNumber / pdf.numPages,
    });
  }
  return { text: cleanText(pageTexts.join('\n')), canvases: pageCanvases, pages: pdf.numPages };
}

async function runOcr(images: (Blob | HTMLCanvasElement)[], onProgress?: (progress: ReadProgress) => void) {
  const worker = await createWorker('eng+fra');
  try {
    const pieces: string[] = [];
    for (let i = 0; i < images.length; i++) {
      onProgress?.({ stage: 'ocr', message: `Recognising image ${i + 1} of ${images.length}…`, progress: i / images.length });
      const result = await worker.recognize(images[i]);
      pieces.push(result.data.text);
      onProgress?.({ stage: 'ocr', message: `Recognised image ${i + 1} of ${images.length}`, progress: (i + 1) / images.length });
    }
    return cleanText(pieces.join('\n'));
  } finally {
    await worker.terminate();
  }
}

export async function readDocument(
  file: Blob,
  mimeType: string,
  onProgress?: (progress: ReadProgress) => void,
): Promise<ExtractedDocumentData> {
  if (mimeType === 'application/pdf') {
    const pdf = await readPdf(file, onProgress);
    if (!pdf.canvases.length && pdf.text.length > 0) return extractFields(pdf.text, 'pdf-text');
    if (!pdf.canvases.length) {
      throw new Error('No selectable text was found in this PDF. It may be encrypted or contain unsupported pages.');
    }
    const ocrText = await runOcr(pdf.canvases, onProgress);
    const combined = cleanText([pdf.text, ocrText].filter(Boolean).join('\n'));
    return extractFields(combined, pdf.text ? 'pdf-text+ocr' : 'ocr');
  }
  if (mimeType.startsWith('image/')) {
    const text = await runOcr([file], onProgress);
    return extractFields(text, 'ocr');
  }
  throw new Error('This file type is not supported for text extraction.');
}
