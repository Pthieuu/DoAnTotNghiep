declare module "pdf-parse" {
  export class PDFParse {
    constructor(options: { data: Uint8Array });
    static setWorker(workerSrc?: string): string;
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  }
}

declare module "pdf-parse/worker" {
  export function getPath(): string;
  export function getData(): string;
}

declare module "mammoth" {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
}
