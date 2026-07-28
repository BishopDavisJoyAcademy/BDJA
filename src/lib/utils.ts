import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getGradeLabel(level: string): string {
  const map: Record<string, string> = {
    playgroup: "Playgroup",
    pp1: "PP1",
    pp2: "PP2",
    grade1: "Grade 1",
    grade2: "Grade 2",
    grade3: "Grade 3",
    grade4: "Grade 4",
    grade5: "Grade 5",
    grade6: "Grade 6",
  };
  return map[level] || level;
}

export function getPerformanceColor(level: string): string {
  const map: Record<string, string> = {
    beginning: "text-red-500 bg-red-50",
    developing: "text-yellow-600 bg-yellow-50",
    competent: "text-green-600 bg-green-50",
    exceeds: "text-bdja-secondary bg-yellow-50",
  };
  return map[level] || "text-gray-500 bg-gray-50";
}

export function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "";
}

export function generateReceiptNumber(): string {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
