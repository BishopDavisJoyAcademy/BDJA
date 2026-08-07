import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { JoyChat } from "@/components/joy/JoyChat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="md:ml-16 transition-all duration-300">
        <TopBar />
        <main className="p-6 pt-20 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      <JoyChat />
    </div>
  );
}
