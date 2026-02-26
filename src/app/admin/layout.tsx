import { AdminSidebar } from "@/components/admin-sidebar";
import { ProjectProvider } from "@/lib/project-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </ProjectProvider>
  );
}
