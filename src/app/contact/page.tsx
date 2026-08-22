import { Metadata } from "next";
import CmsPageContent from "@/components/CmsPageContent";

export const metadata: Metadata = {
  title: "Contact Us - Bishop Davis Joy Academy",
  description: "Get in touch with Bishop Davis Joy Academy. Find our location, phone numbers, email, and social media links.",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    return "[Configure in .env]";
  }
  return value;
}

const schoolEmail = requireEnv("NEXT_PUBLIC_SCHOOL_EMAIL");
const schoolPhone = requireEnv("NEXT_PUBLIC_SCHOOL_PHONE");
const schoolAddress = requireEnv("NEXT_PUBLIC_SCHOOL_ADDRESS");

const fallback = (
  <div className="space-y-8">
    <h1 className="text-3xl font-bold text-white">Contact Us</h1>
    <div className="prose prose-invert max-w-none">
      <p className="text-gray-300">
        We would love to hear from you. Reach out to Bishop Davis Joy Academy using the information below.
      </p>
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-2">📍 Location</h3>
          <p className="text-gray-400">{schoolAddress}</p>
        </div>
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-2">📞 Phone</h3>
          <p className="text-gray-400">{schoolPhone}</p>
        </div>
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-2">✉️ Email</h3>
          <p className="text-gray-400">{schoolEmail}</p>
        </div>
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-2">🌐 Social Media</h3>
          <p className="text-gray-400">Follow us on Facebook, Instagram, and Twitter</p>
        </div>
      </div>
    </div>
  </div>
);

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <CmsPageContent slug="contact" fallback={fallback} publicMode />
    </div>
  );
}
