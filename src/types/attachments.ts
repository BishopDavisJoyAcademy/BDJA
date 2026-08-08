export interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: "image" | "document" | "video" | "audio" | "whiteboard" | "link" | "poll";
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  thumbnail?: string;
  dataUrl?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface WhiteboardData {
  strokes: any[];
  width: number;
  height: number;
  background: string;
}
