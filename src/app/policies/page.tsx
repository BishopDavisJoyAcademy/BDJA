"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";

export default function PoliciesPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">School Policies</h1>
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2">Admission Policy</h2>
            <p>Bishop Davis Joy Academy admits students regardless of race, religion, or national origin. Admission is based on availability of space and the student&rsquo;s ability to benefit from our programs.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2">Attendance Policy</h2>
            <p>Regular attendance is essential for academic success. Students are expected to attend all classes and arrive on time. Parents must notify the school of any absences.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2">Discipline Policy</h2>
            <p>We maintain a positive discipline approach that encourages good behavior through recognition and reward. Our goal is to create a safe and respectful learning environment for all.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2">Fee Policy</h2>
            <p>School fees are payable per term. Parents are encouraged to pay fees on time to avoid disruption to their child&rsquo;s learning. Payment plans are available upon request.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
