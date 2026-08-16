import CmsPageContent from "@/components/CmsPageContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Bishop Davis Joy Academy",
  description: "Learn about Bishop Davis Joy Academy, our mission, vision, and values.",
};

const fallback = (
  <div className="space-y-8">
    <h1 className="text-3xl font-bold text-gray-900">About Bishop Davis Joy Academy</h1>
    <div className="prose prose-lg max-w-none text-gray-700">
      <p>Bishop Davis Joy Academy is a leading educational institution committed to excellence in holistic education. We nurture young minds to become future leaders through quality teaching, modern facilities, and a supportive learning environment.</p>
      <h2>Our Mission</h2>
      <p>To provide world-class education that empowers students to achieve their full potential and become responsible global citizens.</p>
      <h2>Our Vision</h2>
      <p>To be the premier educational institution in Kenya, recognized for academic excellence, innovation, and character development.</p>
      <h2>Core Values</h2>
      <ul>
        <li><strong>Excellence</strong> - Striving for the highest standards in everything we do</li>
        <li><strong>Integrity</strong> - Upholding honesty and strong moral principles</li>
        <li><strong>Innovation</strong> - Embracing creativity and forward-thinking</li>
        <li><strong>Community</strong> - Building strong relationships and supporting one another</li>
        <li><strong>Respect</strong> - Valuing diversity and treating everyone with dignity</li>
      </ul>
    </div>
  </div>
);

export default function AboutPage() {
  return <CmsPageContent slug="about" fallback={fallback} />;
}
