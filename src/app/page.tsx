import CmsPageContent from "@/components/CmsPageContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bishop Davis Joy Academy - Excellence in Education",
  description: "Welcome to Bishop Davis Joy Academy. Quality education for a brighter future.",
};

const fallback = (
  <div className="space-y-8">
    <div className="text-center space-y-4 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Welcome to Bishop Davis Joy Academy</h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">Nurturing excellence, building character, and shaping the leaders of tomorrow through quality education.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Academic Excellence</h3>
        <p className="text-gray-600">Our curriculum is designed to challenge and inspire students to reach their full potential.</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Holistic Development</h3>
        <p className="text-gray-600">We focus on developing the whole child — academically, socially, emotionally, and physically.</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Modern Facilities</h3>
        <p className="text-gray-600">State-of-the-art classrooms, laboratories, and sports facilities for optimal learning.</p>
      </div>
    </div>
  </div>
);

export default function HomePage() {
  return <CmsPageContent slug="home" fallback={fallback} />;
}
