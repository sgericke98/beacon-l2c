"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Building2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Organization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  member_role: string;
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (organizationId: string) => void;
  className?: string;
}

export function OrganizationSelector({ onOrganizationChange, className }: OrganizationSelectorProps) {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with user's primary organization
  useEffect(() => {
    if (user?.organization_id) {
      setSelectedOrgId(user.organization_id);
    }
  }, [user?.organization_id]);

  const availableOrganizations = user?.available_organizations || [];
  const currentOrganization = availableOrganizations.find(
    org => org.organization_id === selectedOrgId
  ) || availableOrganizations[0];

  const handleOrganizationChange = async (organizationId: string) => {
    if (organizationId === selectedOrgId) return;

    setIsLoading(true);
    try {
      // Update the selected organization
      setSelectedOrgId(organizationId);
      
      // Store in localStorage for persistence
      localStorage.setItem('selectedOrganizationId', organizationId);
      
      // Notify parent component
      onOrganizationChange?.(organizationId);
      
      // Optionally refresh the page to reload data with new organization context
      // window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load persisted organization selection
  useEffect(() => {
    const persistedOrgId = localStorage.getItem('selectedOrganizationId');
    if (persistedOrgId && availableOrganizations.some(org => org.organization_id === persistedOrgId)) {
      setSelectedOrgId(persistedOrgId);
    }
  }, [availableOrganizations]);

  if (!user || availableOrganizations.length === 0) {
    return null;
  }

  if (availableOrganizations.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentOrganization?.organization_name}</span>
        <Badge variant="secondary" className="text-xs">
          {currentOrganization?.member_role}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
          disabled={isLoading}
        >
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[200px]">
            {currentOrganization?.organization_name || 'Select Organization'}
          </span>
          <Badge variant="secondary" className="text-xs">
            {currentOrganization?.member_role}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableOrganizations.map((org) => (
          <DropdownMenuItem
            key={org.organization_id}
            onClick={() => handleOrganizationChange(org.organization_id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{org.organization_name}</span>
              <span className="text-xs text-muted-foreground">
                {org.organization_slug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={org.organization_id === selectedOrgId ? "default" : "secondary"}
                className="text-xs"
              >
                {org.member_role}
              </Badge>
              {org.organization_id === selectedOrgId && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default OrganizationSelector;
