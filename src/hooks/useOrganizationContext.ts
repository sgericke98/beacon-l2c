"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Organization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  member_role: string;
}

// Extended User type that includes organization information
interface ExtendedUser {
  id: string;
  email?: string;
  organization_id?: string;
  organization_name?: string;
  available_organizations?: Organization[];
}

interface OrganizationContext {
  selectedOrganizationId: string | null;
  selectedOrganizationName: string | null;
  switchOrganization: (organizationId: string) => void;
  getOrganizationHeaders: () => Record<string, string>;
  getOrganizationQueryParams: () => Record<string, string>;
}

export function useOrganizationContext(): OrganizationContext {
  const { user } = useAuth();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedOrganizationName, setSelectedOrganizationName] = useState<string | null>(null);

  // Cast user to ExtendedUser type for organization properties
  const extendedUser = user as ExtendedUser | null;

  // Initialize with user's primary organization
  useEffect(() => {
    if (extendedUser?.organization_id) {
      setSelectedOrganizationId(extendedUser.organization_id);
      setSelectedOrganizationName(extendedUser.organization_name || null);
    }
  }, [extendedUser?.organization_id, extendedUser?.organization_name]);

  // Load persisted organization selection
  useEffect(() => {
    const persistedOrgId = localStorage.getItem('selectedOrganizationId');
    if (persistedOrgId && extendedUser?.available_organizations) {
      const org = extendedUser.available_organizations.find(o => o.organization_id === persistedOrgId);
      if (org) {
        setSelectedOrganizationId(org.organization_id);
        setSelectedOrganizationName(org.organization_name);
      }
    }
  }, [extendedUser?.available_organizations]);

  const switchOrganization = useCallback((organizationId: string) => {
    const org = extendedUser?.available_organizations?.find(o => o.organization_id === organizationId);
    if (org) {
      setSelectedOrganizationId(org.organization_id);
      setSelectedOrganizationName(org.organization_name);
      localStorage.setItem('selectedOrganizationId', organizationId);
    }
  }, [extendedUser?.available_organizations]);

  const getOrganizationHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (selectedOrganizationId) {
      headers['x-organization-id'] = selectedOrganizationId;
    }
    return headers;
  }, [selectedOrganizationId]);

  const getOrganizationQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (selectedOrganizationId) {
      params.organization_id = selectedOrganizationId;
    }
    return params;
  }, [selectedOrganizationId]);

  return {
    selectedOrganizationId,
    selectedOrganizationName,
    switchOrganization,
    getOrganizationHeaders,
    getOrganizationQueryParams,
  };
}
