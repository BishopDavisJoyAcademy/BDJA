import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date / Time Helpers ──

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-KE", options || { year: "numeric", month: "short", day: "numeric" });
}

export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid time";
  return d.toLocaleTimeString("en-KE", options || { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function getDayName(dayIndex: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] ?? "Unknown";
}

// ── Grade Helpers ──

export function getGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    playgroup: "Playgroup",
    pp1: "Pre-Primary 1",
    pp2: "Pre-Primary 2",
    grade1: "Grade 1",
    grade2: "Grade 2",
    grade3: "Grade 3",
    grade4: "Grade 4",
    grade5: "Grade 5",
    grade6: "Grade 6",
  };
  return labels[grade] || grade;
}

// ── Performance / Color Helpers ──

export function getPerformanceColor(level: string): string {
  const colors: Record<string, string> = {
    beginning: "text-red-600 bg-red-50",
    developing: "text-yellow-600 bg-yellow-50",
    competent: "text-green-600 bg-green-50",
    exceeds: "text-blue-600 bg-blue-50",
    present: "text-green-600 bg-green-50",
    absent: "text-red-600 bg-red-50",
    late: "text-yellow-600 bg-yellow-50",
    excused: "text-gray-600 bg-gray-50",
  };
  return colors[level] || "text-gray-600 bg-gray-50";
}

// ── Credential Sharing Helpers ──

export function generateWhatsAppShareText(data: {
  name: string;
  admission_number?: string;
  email: string;
  temp_password: string;
  login_url: string;
  role: string;
}): string {
  const lines = [
    `*BDJA Platform Account Details*`,
    ``,
    `Hello ${data.name},`,
    `Your ${data.role} account has been created on the BDJA Platform.`,
    ``,
    `*Login Details:*`,
    `Email: ${data.email}`,
  ];
  if (data.admission_number) {
    lines.push(`Admission Number: ${data.admission_number}`);
  }
  lines.push(
    `Temporary Password: ${data.temp_password}`,
    ``,
    `*Login URL:* ${data.login_url}`,
    ``,
    `Please change your password after first login.`,
    ``,
    `_Bishop Davis Joy Academy_`,
    `"Prayer, Commitment and Hard Work for Success"`
  );
  return encodeURIComponent(lines.join("\n"));
}

export function generatePrintableHTML(data: {
  name: string;
  admission_number?: string;
  email: string;
  temp_password: string;
  login_url: string;
  role: string;
  schoolName?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>BDJA Account Details - ${data.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 2px solid #1e3a5f; border-radius: 8px; }
    h1 { color: #1e3a5f; text-align: center; }
    .logo { text-align: center; margin-bottom: 20px; }
    .detail { margin: 12px 0; font-size: 16px; }
    .label { font-weight: bold; color: #1e3a5f; }
    .password { background: #c9a227; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
    @media print { body { border: none; } }
  </style>
</head>
<body>
  <div class="logo"><h1>BDJA Platform</h1><p>Bishop Davis Joy Academy</p></div>
  <h2>Account Details</h2>
  <div class="detail"><span class="label">Name:</span> ${data.name}</div>
  <div class="detail"><span class="label">Role:</span> ${data.role}</div>
  ${data.admission_number ? `<div class="detail"><span class="label">Admission:</span> ${data.admission_number}</div>` : ""}
  <div class="detail"><span class="label">Email:</span> ${data.email}</div>
  <div class="detail"><span class="label">Temp Password:</span> <span class="password">${data.temp_password}</span></div>
  <div class="detail"><span class="label">Login URL:</span> <a href="${data.login_url}">${data.login_url}</a></div>
  <div class="footer">
    <p>Please change your password after first login.</p>
    <p><em>"Prayer, Commitment and Hard Work for Success"</em></p>
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
</body>
</html>`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
