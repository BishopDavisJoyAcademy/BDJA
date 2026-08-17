import { VoraContent } from "@/types";
import { extractYouTubeId, getYouTubeThumbnail } from "./vora";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export async function searchYouTube(query: string, maxResults = 5): Promise<YouTubeSearchResult[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY not set. Returning empty results.");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${query} educational`);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", YOUTUBE_API_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = await res.json();
    return (data.items || []).map((item: unknown) => {
      const it = item as Record<string, unknown>;
      const snippet = it.snippet as Record<string, unknown>;
      const id = it.id as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, unknown>;
      const medium = thumbnails?.medium as Record<string, unknown>;
      return {
        id: id?.videoId as string,
        title: (snippet?.title as string) || "Untitled",
        description: (snippet?.description as string) || "",
        thumbnail: (medium?.url as string) || "",
        channelTitle: (snippet?.channelTitle as string) || "Unknown",
        publishedAt: (snippet?.publishedAt as string) || "",
      };
    }).filter((r: YouTubeSearchResult) => r.id);
  } catch (err) {
    console.error("YouTube search failed:", err);
    return [];
  }
}

export async function getYouTubeVideoDetails(videoIds: string[]): Promise<Record<string, { duration?: string; viewCount?: string }>> {
  if (!YOUTUBE_API_KEY || videoIds.length === 0) return {};

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails,statistics");
    url.searchParams.set("id", videoIds.join(","));
    url.searchParams.set("key", YOUTUBE_API_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = await res.json();
    const result: Record<string, { duration?: string; viewCount?: string }> = {};
    (data.items || []).forEach((item: unknown) => {
      const it = item as Record<string, unknown>;
      const contentDetails = it.contentDetails as Record<string, unknown>;
      const statistics = it.statistics as Record<string, unknown>;
      result[it.id as string] = {
        duration: contentDetails?.duration as string,
        viewCount: statistics?.viewCount as string,
      };
    });
    return result;
  } catch (err) {
    console.error("YouTube details failed:", err);
    return {};
  }
}

export function parseISODuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
}

export async function searchYouTubeAsVora(query: string, grade_level?: string, limit = 5): Promise<VoraContent[]> {
  const results = await searchYouTube(query, limit);
  const details = await getYouTubeVideoDetails(results.map((r) => r.id));

  return results.map((r) => {
    const duration = details[r.id]?.duration;
    return {
      id: `yt-${r.id}`,
      title: r.title,
      subject: "General",
      grade_level: grade_level || "all",
      video_url: `https://youtube.com/watch?v=${r.id}`,
      thumbnail_url: r.thumbnail || getYouTubeThumbnail(r.id),
      description: r.description?.substring(0, 200) || "No summary available.",
      campus_id: "",
      uploaded_by: "",
    } as VoraContent;
  });
}
