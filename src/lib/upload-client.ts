"use client";

export interface SignedUploadUrl {
  signedUrl: string;
  publicUrl: string;
  path: string;
  token: string;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Request a signed upload URL from the server.
 * Auth is handled via cookies automatically.
 */
export async function requestSignedUploadUrl(
  filename: string,
  contentType: string
): Promise<SignedUploadUrl> {
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to get upload URL (${res.status})`);
  }

  return res.json();
}

/**
 * Upload a file directly to Supabase Storage using a signed URL.
 * Uses XMLHttpRequest for REAL upload progress tracking.
 * This is how WhatsApp, Instagram, and every major app does it.
 */
export function uploadFileToSignedUrl(
  signedUrl: string,
  file: Blob,
  fileType: string,
  callbacks: {
    onProgress?: (event: UploadProgressEvent) => void;
    onError?: (error: Error) => void;
    onAbort?: () => void;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        callbacks.onProgress?.({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const err = new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
        callbacks.onError?.(err);
        reject(err);
      }
    };

    xhr.onerror = () => {
      const err = new Error("Network error during upload");
      callbacks.onError?.(err);
      reject(err);
    };

    xhr.onabort = () => {
      callbacks.onAbort?.();
      reject(new Error("Upload aborted"));
    };

    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", fileType);
    xhr.send(file);
  });
}
