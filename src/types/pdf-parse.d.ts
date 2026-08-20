declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
