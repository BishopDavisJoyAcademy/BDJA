"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface SchoolSettings {
  school_name: string | null;
  school_code: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
}

interface SchoolDocumentHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  className?: string;
}

export function SchoolDocumentHeader({ title, subtitle, showLogo = true, className = "" }: SchoolDocumentHeaderProps) {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const schoolName = settings?.school_name || "Bishop Davis Joy Academy";
  const motto = "Excellence in Education";
  const address = settings?.address || "";
  const city = settings?.city || "";
  const country = settings?.country || "";
  const email = settings?.contact_email || "bishopdavisjoyacademy@gmail.com";
  const phone = settings?.contact_phone || "";
  const logo = settings?.logo_url || "/logo.png";

  return (
    <div className={`school-document-header ${className}`}>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          .school-document-header {
            border-bottom: 2px solid #D4AF37 !important;
            padding-bottom: 16px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }
          .school-document-header .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex items-start gap-4 border-b-2 border-[#D4AF37] pb-4 mb-5">
        {showLogo && (
          <div className="shrink-0">
            <Image
              src={logo}
              alt={schoolName}
              width={64}
              height={64}
              className="object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
            {schoolName}
          </h1>
          <p className="text-xs italic text-[#D4AF37] font-medium">{motto}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[10px] text-slate-500">
            {address && <span>{address}{city ? `, ${city}` : ""}{country ? `, ${country}` : ""}</span>}
            {email && <span>Email: {email}</span>}
            {phone && <span>Tel: {phone}</span>}
            {settings?.school_code && <span>Code: {settings.school_code}</span>}
          </div>
        </div>
        {title && (
          <div className="shrink-0 text-right">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{title}</h2>
            {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolDocumentHeader;
