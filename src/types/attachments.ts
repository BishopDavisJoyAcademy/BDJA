export interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: "image" | "document" | "video" | "audio" | "whiteboard" | "link" | "poll" | "search";
  status: "pending" | "uploading" | "success" | "error" | "extracting";
  progress: number;
  url?: string;
  thumbnail?: string;
  dataUrl?: string;
  errorMessage?: string;
  extractedContent?: string;
  metadata?: PollAttachmentMetadata | SearchAttachmentMetadata | WhiteboardAttachmentMetadata | LinkAttachmentMetadata | Record<string, unknown>;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollAttachmentMetadata {
  pollData: {
    question: string;
    options: PollOption[];
    allowMultiple: boolean;
  };
}

export interface SearchAttachmentMetadata {
  searchData: {
    query: string;
    source: "web" | "youtube" | "vora";
  };
}

export interface WhiteboardAttachmentMetadata {
  whiteboardData: {
    strokes: Array<{
      points: Array<{ x: number; y: number }>;
      color: string;
      width: number;
    }>;
    width: number;
    height: number;
    background: string;
  };
}

export interface LinkAttachmentMetadata {
  linkUrl: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface WhiteboardData {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  width: number;
  height: number;
  background: string;
}

export interface SearchQueryData {
  query: string;
  source: "web" | "youtube" | "vora";
}
