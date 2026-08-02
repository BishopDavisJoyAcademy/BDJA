"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">About Bishop Davis Joy Academy</h1>
        <div className="space-y-4 text-gray-600 leading-relaxed">
          <p>Bishop Davis Joy Academy is a leading educational institution committed to nurturing young minds and building bright futures. Located in Nanyuki, Kenya, we offer the Competency Based Curriculum (CBC) from Playgroup through Grade 6.</p>
          <p>Our motto, <strong className="text-[#1e3a5f]">&ldquo;Prayer, Commitment and Hard Work for Success&rdquo;</strong>, guides everything we do. We believe in empowering children to make a difference in their lives, their community, and the wider world.</p>
          <p>With over 500 happy learners, 40+ dedicated staff, and more than 10 years of excellence, BDJA continues to provide a safe, nurturing, and stimulating environment where children grow, learn, and shine.</p>
        </div>
      </div>
    </PublicLayout>
  );
}
