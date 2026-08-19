import { JoySearchResult, JoyVideoResult } from "@/types/joy";

export async function searchWeb(query: string, maxResults = 5): Promise<JoySearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

export async function searchYouTube(query: string, apiKey?: string, maxResults = 5): Promise<JoyVideoResult[]> {
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query + " education")}&type=video&key=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const items = (data.items || []) as Array<{
          id: { videoId: string };
          snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
        }>;
        return items.map((item) => ({
          title: item.snippet.title,
          videoId: item.id.videoId,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
          channel: item.snippet.channelTitle,
        }));
      }
    } catch { /* fall through */ }
  }
  try {
    const encodedQuery = encodeURIComponent(query + " site:youtube.com");
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: JoyVideoResult[] = [];
    const blocks = html.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];
    for (const block of blocks.slice(0, maxResults)) {
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/);
      if (titleMatch && urlMatch) {
        const rawUrl = decodeURIComponent(urlMatch[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, ""));
        const videoIdMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          results.push({
            title: stripHtml(titleMatch[1]).trim(),
            videoId: videoIdMatch[1],
            thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`,
            channel: "YouTube",
          });
        }
      }
    }
    return results;
  } catch (err) {
    console.error("[searchYouTube] error:", err);
    return [];
  }
}

export async function summarizePage(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
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
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
