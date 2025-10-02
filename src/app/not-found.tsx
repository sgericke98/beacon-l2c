"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FileX, Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route"
    );
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <FileX className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-gray-500">
            Error 404 - Page not found
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleGoBack}
              className="flex items-center gap-2"
              variant="default"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            
            <Link href="/">
              <Button 
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
            
            <Link href="/search">
              <Button 
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>If you believe this is an error, please contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
