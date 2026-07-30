import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  ${data.admission_number ? `<div class="detail"><span class="label">Admission Number:</span> ${data.admission_number}</div>` : ""}
  <div class="detail"><span class="label">Email:</span> ${data.email}</div>
  <div class="detail"><span class="label">Temporary Password:</span> <span class="password">${data.temp_password}</span></div>
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
