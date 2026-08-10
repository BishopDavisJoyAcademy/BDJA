import fs from "fs";
import path from "path";
import { VoraContent } from "@/types";
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail, formatDuration } from "./vora-utils";

export { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail, formatDuration };

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

    if (title.includes(q)) score += 20;
    qWords.forEach(w => { if (title.includes(w)) score += 5; });
    if (subject.includes(q)) score += 15;
    qWords.forEach(w => { if (subject.includes(w)) score += 4; });
    if (category.includes(q) || topic.includes(q)) score += 12;
    qWords.forEach(w => { if (category.includes(w) || topic.includes(w)) score += 3; });
    tags.forEach(t => {
      if (t.includes(q)) score += 10;
      qWords.forEach(w => { if (t.includes(w)) score += 2; });
    });
    if (summary.includes(q)) score += 8;
    qWords.forEach(w => { if (summary.includes(w)) score += 2; });

    if (options?.grade_level && item.grade_level === options.grade_level) score += 10;
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
