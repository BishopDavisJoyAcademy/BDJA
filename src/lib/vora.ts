import fs from "fs";
import path from "path";
import { VoraContent } from "@/types";

const CONTENT_DIR = path.join(process.cwd(), "content", "youtube");

const GRADE_FILES: Record<string, string> = {
  playgroup: "playgroup.json",
  pp1: "pp1.json",
  pp2: "pp2.json",
  grade1: "grade1.json",
  grade2: "grade2.json",
  grade3: "grade3.json",
  grade4: "grade4.json",
  grade5: "grade5.json",
  grade6: "grade6.json",
};

function loadGradeFile(grade: string): VoraContent[] {
  const filePath = path.join(CONTENT_DIR, GRADE_FILES[grade] || `${grade}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item: any) => ({ ...item, grade_level: grade })) : [];
  } catch {
    return [];
  }
}

export function loadAllVoraContent(): VoraContent[] {
  const all: VoraContent[] = [];
  for (const grade of Object.keys(GRADE_FILES)) {
    all.push(...loadGradeFile(grade));
  }
  return all;
}

export function searchVoraContent(query: string, options?: {
  grade_level?: string;
  subject?: string;
  category?: string;
  limit?: number;
}): VoraContent[] {
  const all = loadAllVoraContent();
  const q = query.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(w => w.length > 2);

  const scored = all.map(item => {
    let score = 0;
    const title = item.title.toLowerCase();
    const summary = (item.summary || "").toLowerCase();
    const subject = (item.subject || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    const topic = (item.topic || "").toLowerCase();
    const tags = (item.tags || []).map((t: string) => t.toLowerCase());

    // Exact title match
    if (title.includes(q)) score += 20;
    // Word matches in title
    qWords.forEach(w => { if (title.includes(w)) score += 5; });
    // Subject match
    if (subject.includes(q)) score += 15;
    qWords.forEach(w => { if (subject.includes(w)) score += 4; });
    // Category/topic match
    if (category.includes(q) || topic.includes(q)) score += 12;
    qWords.forEach(w => { if (category.includes(w) || topic.includes(w)) score += 3; });
    // Tag match
    tags.forEach(t => {
      if (t.includes(q)) score += 10;
      qWords.forEach(w => { if (t.includes(w)) score += 2; });
    });
    // Summary match
    if (summary.includes(q)) score += 8;
    qWords.forEach(w => { if (summary.includes(w)) score += 2; });

    // Grade boost
    if (options?.grade_level && item.grade_level === options.grade_level) score += 10;

    // Exact filters
    if (options?.subject && item.subject?.toLowerCase() === options.subject.toLowerCase()) score += 8;
    if (options?.category && item.category?.toLowerCase() === options.category.toLowerCase()) score += 6;

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options?.limit || 10)
    .map(s => s.item);
}

export function getVoraByGrade(grade: string): VoraContent[] {
  return loadGradeFile(grade);
}

export function getVoraSubjects(): string[] {
  const all = loadAllVoraContent();
  const subjects = new Set<string>();
  all.forEach(item => { if (item.subject) subjects.add(item.subject); });
  return Array.from(subjects).sort();
}

export function getVoraCategories(): string[] {
  const all = loadAllVoraContent();
  const categories = new Set<string>();
  all.forEach(item => { if (item.category) categories.add(item.category); });
  return Array.from(categories).sort();
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "Unknown";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
