"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ErrorHandler } from "@/components/ErrorHandler";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ErrorHandler />
        <Toaster />
        <Sonner />
        <AppLayout>{children}</AppLayout>
      </TooltipProvider>
    </AuthProvider>
  );
}
