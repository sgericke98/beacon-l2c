"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

  // Initialize with user's primary organization
  useEffect(() => {
    if (user?.organization_id) {
      setSelectedOrganizationId(user.organization_id);
      setSelectedOrganizationName(user.organization_name || null);
    }
  }, [user?.organization_id, user?.organization_name]);

  // Load persisted organization selection
  useEffect(() => {
    const persistedOrgId = localStorage.getItem('selectedOrganizationId');
    if (persistedOrgId && user?.available_organizations) {
      const org = user.available_organizations.find(o => o.organization_id === persistedOrgId);
      if (org) {
        setSelectedOrganizationId(org.organization_id);
        setSelectedOrganizationName(org.organization_name);
      }
    }
  }, [user?.available_organizations]);

  const switchOrganization = useCallback((organizationId: string) => {
    const org = user?.available_organizations?.find(o => o.organization_id === organizationId);
    if (org) {
      setSelectedOrganizationId(org.organization_id);
      setSelectedOrganizationName(org.organization_name);
      localStorage.setItem('selectedOrganizationId', organizationId);
    }
  }, [user?.available_organizations]);

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
