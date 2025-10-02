"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthLoading } from "@/components/ui/page-loading";
import { OrganizationSelector } from "@/components/OrganizationSelector";
import { UserSelector } from "@/components/UserSelector";
import { useOrganizationContext } from "@/hooks/useOrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/auth';
  const { switchOrganization } = useOrganizationContext();
  const { user } = useAuth();

  // Don't show sidebar and header on auth page
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="h-12 flex items-center justify-between border-b bg-background">
              <div className="flex items-center">
                <SidebarTrigger className="ml-4" />
                <h1 className="ml-4 text-lg font-semibold">
                  Lead to Cash Analytics
                </h1>
              </div>
              <div className="flex items-center gap-4 mr-4">
                <OrganizationSelector 
                  onOrganizationChange={switchOrganization}
                />
                {user?.role === 'admin' && (
                  <UserSelector />
                )}
              </div>
            </header>
            <div className="p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
