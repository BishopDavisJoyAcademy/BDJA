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
    return (data.items || []).map((item: any) => ({
      id: item.id?.videoId,
      title: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.medium?.url || "",
      channelTitle: item.snippet?.channelTitle || "Unknown",
      publishedAt: item.snippet?.publishedAt || "",
    })).filter((r: YouTubeSearchResult) => r.id);
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
    const result: Record<string, any> = {};
    (data.items || []).forEach((item: any) => {
      result[item.id] = {
        duration: item.contentDetails?.duration,
        viewCount: item.statistics?.viewCount,
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
  const details = await getYouTubeVideoDetails(results.map(r => r.id));

  return results.map(r => {
    const duration = details[r.id]?.duration;
    return {
      id: `yt-${r.id}`,
      title: r.title,
      subject: "General",
      category: "YouTube",
      topic: query,
      youtube_url: `https://youtube.com/watch?v=${r.id}`,
      summary: r.description?.substring(0, 200) || "No summary available.",
      tags: [query.toLowerCase(), "youtube", "recommended"],
      grade_level: grade_level || "all",
      duration_seconds: duration ? parseISODuration(duration) : undefined,
      difficulty: "beginner",
      thumbnail_url: r.thumbnail || getYouTubeThumbnail(r.id),
      channel: r.channelTitle,
      source: "youtube",
    } as VoraContent;
  });
}
