import { JoySearchResult, JoyVideoResult } from "@/types/joy";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function searchWeb(query: string, maxResults = 5): Promise<JoySearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`);
    const html = await res.text();
    const results: JoySearchResult[] = [];
    const resultBlocks = html.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];
    for (const block of resultBlocks.slice(0, maxResults)) {
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/);
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch && urlMatch) {
        const title = stripHtml(titleMatch[1]).trim();
        const resultUrl = decodeURIComponent(urlMatch[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, ""));
        const snippet = snippetMatch ? stripHtml(snippetMatch[1]).trim() : "";
        results.push({ title: title || "Untitled", url: resultUrl, snippet, source: "DuckDuckGo" });
      }
    }
    return results;
  } catch (err) {
    console.error("[searchWeb] error:", err);
    return [];
  }
}

export async function searchYouTube(_query: string, _apiKey?: string, maxResults = 5): Promise<JoyVideoResult[]> {
  // No API key needed — search the web for YouTube results
  const query = _query;
  try {
    // Try DuckDuckGo first
    const encodedQuery = encodeURIComponent(query + " site:youtube.com/watch");
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn("[searchYouTube] DuckDuckGo returned", res.status);
      return fallbackYouTubeSearch(query, maxResults);
    }

    const html = await res.text();
    const results: JoyVideoResult[] = [];

    // Parse DuckDuckGo results
    const blocks = html.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];
    for (const block of blocks.slice(0, maxResults * 2)) {
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/);
      if (titleMatch && urlMatch) {
        const rawUrl = decodeURIComponent(urlMatch[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, ""));
        const videoIdMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          const title = stripHtml(titleMatch[1]).trim();
          // Skip ads and unrelated results
          if (title && title.length > 3 && !title.toLowerCase().includes("ad ")) {
            results.push({
              title,
              videoId,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              channel: "YouTube",
            });
          }
        }
      }
    }

    if (results.length > 0) return results.slice(0, maxResults);
    return fallbackYouTubeSearch(query, maxResults);
  } catch (err) {
    console.error("[searchYouTube] error:", err);
    return fallbackYouTubeSearch(query, maxResults);
  }
}

async function fallbackYouTubeSearch(query: string, maxResults: number): Promise<JoyVideoResult[]> {
  // Fallback: try Bing web search for YouTube videos
  try {
    const encodedQuery = encodeURIComponent(query + " youtube");
    const url = `https://www.bing.com/search?q=${encodedQuery}&count=${maxResults * 2}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results: JoyVideoResult[] = [];

    // Extract YouTube video links from Bing results
    const ytLinks = html.matchAll(/href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11})"/g);
    const seen = new Set<string>();
    for (const match of ytLinks) {
      const rawUrl = match[1];
      const videoIdMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch && !seen.has(videoIdMatch[1])) {
        seen.add(videoIdMatch[1]);
        results.push({
          title: `YouTube Video`,
          videoId: videoIdMatch[1],
          thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`,
          channel: "YouTube",
        });
        if (results.length >= maxResults) break;
      }
    }
    return results;
  } catch (err) {
    console.error("[fallbackYouTubeSearch] error:", err);
    return [];
  }
}

export async function summarizePage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3000);
  } catch (err) {
    console.error("[summarizePage] error:", err);
    return `Could not fetch content from ${url}.`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "\'")
    .replace(/&nbsp;/g, " ");
}
