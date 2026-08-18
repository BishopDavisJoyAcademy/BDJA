"use client";

import { CalendarDays } from "lucide-react";

const events = [
  { date: "Sep 2", title: "Term III Opening", type: "Academic" },
  { date: "Sep 15", title: "Parent-Teacher Meeting", type: "Meeting" },
  { date: "Oct 10", title: "Mid Term Break Begins", type: "Holiday" },
  { date: "Oct 24", title: "Mid Term Break Ends", type: "Academic" },
  { date: "Nov 15", title: "Sports Day", type: "Events" },
  { date: "Nov 28", title: "Term III Closing", type: "Academic" },
];

export default function CalendarPage() {
  return (
    <>
    <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">School Calendar</h1>
        <p className="text-gray-600 mb-8">Important dates for the academic year.</p>
        <div className="space-y-3">
          {events.map((e, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-[#1e3a5f] text-white rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">{e.date.split(" ")[0]}</span>
                <span className="text-lg font-bold">{e.date.split(" ")[1]}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1e3a5f]">{e.title}</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{e.type}</span>
              </div>
              <CalendarDays className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
