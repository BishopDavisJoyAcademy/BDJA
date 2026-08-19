declare module "pdf-parse";

import { JoyExtractedContent } from "@/types/joy";

export async function extractContent(file: File | Buffer, fileName: string): Promise<JoyExtractedContent> {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return extractPdf(file);
  if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) return extractDocx(file);
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv")) return extractText(file);
  if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return extractImage(file);
  return { text: `Unsupported file type: ${fileName}. Joy can read PDFs, Word documents, text files, and images.`, type: "unknown" };
}

async function extractPdf(file: File | Buffer): Promise<JoyExtractedContent> {
  try {
    if (typeof window === "undefined") {
      const pdfParse = await import("pdf-parse").then((m) => m.default || m);
      const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
      const data = await pdfParse(buffer);
      return { text: data.text || "", type: "pdf", pages: data.numpages, wordCount: data.text?.split(/\s+/).length };
    }
  } catch { /* fall through */ }
  try {
    const text = await readFileAsText(file);
    return { text: `PDF content (raw extraction):

${text.slice(0, 5000)}`, type: "pdf", wordCount: text.split(/\s+/).length };
  } catch {
    return { text: "Could not extract PDF content. Please upload a text file or image instead.", type: "pdf" };
  }
}

async function extractDocx(file: File | Buffer): Promise<JoyExtractedContent> {
  try {
    if (typeof window === "undefined") {
      const mammoth = await import("mammoth");
      const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || "", type: "docx", wordCount: result.value?.split(/\s+/).length };
    }
  } catch { /* fall through */ }
  return { text: "Could not extract Word document content on client side. The server will process it.", type: "docx" };
}

async function extractText(file: File | Buffer): Promise<JoyExtractedContent> {
  const text = await readFileAsText(file);
  return { text, type: "text", wordCount: text.split(/\s+/).length };
}

async function extractImage(file: File | Buffer): Promise<JoyExtractedContent> {
  try {
    const base64 = await fileToBase64(file);
    return { text: `[Image uploaded]

Base64: ${base64.slice(0, 100)}...`, type: "image" };
  } catch {
    return { text: "Could not process image.", type: "image" };
  }
}

function readFileAsText(file: File | Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsText(file);
    } else {
      resolve(file.toString("utf-8"));
    }
  });
}

function fileToBase64(file: File | Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      resolve(`data:application/octet-stream;base64,${file.toString("base64")}`);
    }
  });
}
