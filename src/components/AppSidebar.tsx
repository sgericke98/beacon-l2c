"use client";

import {
  BarChart3,
  Database,
  GitBranch,
  User,
  LogOut,
  Settings,
  UserPlus,
  TrendingUp,
  FileText,
  Shield,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { AdminUserManagement } from "@/components/auth/AdminUserManagement";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const analyticsItems = [
  { title: "Dashboard", url: "/", icon: BarChart3, description: "Overview & insights" },
  { title: "Raw Data", url: "/raw-data", icon: Database, description: "Data exploration" },
  { title: "Flow", url: "/flow", icon: GitBranch, description: "Process visualization" },
];

const systemItems = [
  { title: "Setup", url: "/setup", icon: Settings, description: "Configuration" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const currentPath = pathname;

  // Check if current user is admin
  const isAdmin = user?.email === 'admin@yourcompany.com' || user?.user_metadata?.role === 'admin';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (isActive: boolean) =>
    isActive
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium"
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors";

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <>
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          {state !== "collapsed" && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Beacon</span>
              <span className="text-xs text-muted-foreground">Powered by Techtorch</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <Link
                      href={item.url}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {state !== "collapsed" && (
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <Link
                      href={item.url}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {state !== "collapsed" && (
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setShowUserManagement(true)}
                    className="h-10 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    {state !== "collapsed" && (
                      <div className="flex flex-col items-start">
                        <span className="font-medium">User Management</span>
                        <span className="text-xs text-muted-foreground">Admin controls</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="group relative flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              {state !== "collapsed" && (
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email || 'user@example.com'}
                  </span>
                  {isAdmin && (
                    <Badge variant="secondary" className="mt-1 w-fit text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
              )}
              {state !== "collapsed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    
    {/* User Management Modal */}
    {showUserManagement && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-background border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <AdminUserManagement onClose={() => setShowUserManagement(false)} />
        </div>
      </div>
    )}
  </>
  );
}
