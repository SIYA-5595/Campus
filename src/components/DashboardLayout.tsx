import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export function DashboardLayout({ children }: { children: ReactNode }) { 
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/50 glass-card px-4">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-display font-semibold text-lg">
              My College IT Portal
            </h1>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
