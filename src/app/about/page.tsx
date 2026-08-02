"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { CmsPageContent } from "@/components/CmsPageContent";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Target, Eye, Heart, BookOpen, Users, Award } from "lucide-react";

export default function AboutPage() {
  const fallbackContent = (
    <div className="space-y-8">
      <p className="text-lg text-gray-600 leading-relaxed">
        Bishop Davis Joy Academy is a premier educational institution located in Nanyuki, Kenya.
        We provide quality education from Playgroup through Grade 6, following the Competency Based Curriculum (CBC).
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <ScrollReveal delay={100}>
          <div className="bg-gradient-to-br from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
            <Target className="w-8 h-8 mb-4 text-bdja-secondary" />
            <h3 className="text-xl font-bold mb-2">Our Mission</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              To encourage children in learning opportunity through prayer, commitment and hard work.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <div className="bg-gradient-to-br from-bdja-secondary to-amber-600 rounded-2xl p-6 text-white">
            <Eye className="w-8 h-8 mb-4 text-white" />
            <h3 className="text-xl font-bold mb-2">Our Vision</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              To empower children to make a difference in their lives, the life of their community and the wider world.
            </p>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={100}>
        <div className="mt-10">
          <h3 className="text-2xl font-bold text-bdja-primary mb-6">Our Core Values</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Heart, title: "Compassion", desc: "Caring for every child" },
              { icon: BookOpen, title: "Excellence", desc: "Striving for the best" },
              { icon: Users, title: "Community", desc: "Together we grow" },
              { icon: Award, title: "Integrity", desc: "Honesty in all we do" },
            ].map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 100}>
                <div className="bg-white border border-gray-100 rounded-xl p-5 text-center hover:shadow-lg hover:border-bdja-primary/20 transition-all duration-300 hover:-translate-y-1">
                  <v.icon className="w-8 h-8 text-bdja-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-bdja-dark text-sm">{v.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );

  return (
    <PublicLayout>
      <CmsPageContent
        slug="about"
        fallbackTitle="About Us"
        fallbackContent={fallbackContent}
        metaDescription="Learn about Bishop Davis Joy Academy - our mission, vision, and values."
      />
    </PublicLayout>
  );
}
