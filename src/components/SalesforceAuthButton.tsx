"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SalesforceAuthStatus {
  isAuthenticated: boolean;
  error?: string;
}

export default function SalesforceAuthButton() {
  const [authStatus, setAuthStatus] = useState<SalesforceAuthStatus>({ isAuthenticated: false });
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { session } = useAuth();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    if (!session?.access_token) {
      setAuthStatus({ isAuthenticated: false, error: 'You must be signed in to check Salesforce authentication' });
      setIsChecking(false);
      return;
    }

    try {
      setIsChecking(true);
      const response = await fetch('/api/salesforce/auth/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthStatus({ isAuthenticated: data.authenticated });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to check authentication status' }));
        setAuthStatus({ isAuthenticated: false, error: errorData.error || 'Failed to check authentication status' });
      }
    } catch (error) {
      setAuthStatus({ 
        isAuthenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  const testConnection = async () => {
    if (!session?.access_token) {
      setAuthStatus({ isAuthenticated: false, error: 'You must be signed in to test Salesforce connection' });
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthStatus({ isAuthenticated: false });
      
      // Test the connection by checking status
      await checkAuthStatus();
      setIsAuthenticating(false);
    } catch (error) {
      setAuthStatus({ 
        isAuthenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      setIsAuthenticating(false);
    }
  };

  const importToken = async () => {
    if (!session?.access_token) {
      setAuthStatus({ isAuthenticated: false, error: 'You must be signed in to import Salesforce token' });
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthStatus({ isAuthenticated: false });
      
      const response = await fetch('/api/salesforce/import-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthStatus({ isAuthenticated: true });
        console.log('Token imported successfully:', data.message);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to import token' }));
        setAuthStatus({ isAuthenticated: false, error: errorData.error || 'Failed to import token' });
      }
    } catch (error) {
      setAuthStatus({ 
        isAuthenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (authStatus.isAuthenticated) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isChecking) {
      return "Checking authentication status...";
    }
    if (authStatus.isAuthenticated) {
      return "Connected to Salesforce (Service Credentials)";
    }
    return "Not connected to Salesforce";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Salesforce Authentication</CardTitle>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getStatusText()}
        </p>
        
        {authStatus.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authStatus.error}</AlertDescription>
          </Alert>
        )}

        {authStatus.isAuthenticated && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You're successfully connected to Salesforce using service credentials. You can now download orders, opportunities, and quotes.
            </AlertDescription>
          </Alert>
        )}

        {!authStatus.isAuthenticated && !isChecking && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Salesforce authentication will use existing tokens or service credentials. 
              If you have an existing token, it will be used automatically. Otherwise, 
              configure SF_USERNAME, SF_PASSWORD, SF_CLIENT_ID, and SF_CLIENT_SECRET.
            </p>
            <div className="space-y-2">
              <Button
                onClick={testConnection}
                disabled={isAuthenticating}
                className="w-full flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                onClick={importToken}
                disabled={isAuthenticating}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Importing Token...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Import Local Token
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {authStatus.isAuthenticated && (
          <Button
            onClick={checkAuthStatus}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
