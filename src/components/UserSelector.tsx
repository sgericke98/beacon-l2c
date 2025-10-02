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
import { ChevronDown, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface User {
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
}

interface UserSelectorProps {
  onUserChange?: (userId: string | null) => void;
  className?: string;
}

export function UserSelector({ onUserChange, className }: UserSelectorProps) {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Only show for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Fetch users from the organization
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
    onUserChange?.(userId);
    
    // Store in localStorage for persistence
    if (userId) {
      localStorage.setItem('selectedUserId', userId);
    } else {
      localStorage.removeItem('selectedUserId');
    }
  };

  // Load persisted user selection
  useEffect(() => {
    const persistedUserId = localStorage.getItem('selectedUserId');
    if (persistedUserId) {
      setSelectedUserId(persistedUserId);
    }
  }, []);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
          disabled={isLoading}
        >
          <User className="h-4 w-4" />
          <span className="truncate max-w-[150px]">
            {selectedUser ? (selectedUser.full_name || selectedUser.email) : 'All Users'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Filter by User
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Search input */}
        <div className="p-2">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        
        <DropdownMenuSeparator />
        
        {/* All Users option */}
        <DropdownMenuItem
          onClick={() => handleUserChange(null)}
          className="flex items-center justify-between"
        >
          <span>All Users</span>
          {!selectedUserId && (
            <div className="h-2 w-2 rounded-full bg-green-500" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* User list */}
        {filteredUsers.map((user) => (
          <DropdownMenuItem
            key={user.user_id}
            onClick={() => handleUserChange(user.user_id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {user.full_name || user.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={user.user_id === selectedUserId ? "default" : "secondary"}
                className="text-xs"
              >
                {user.role}
              </Badge>
              {user.user_id === selectedUserId && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        {filteredUsers.length === 0 && searchTerm && (
          <DropdownMenuItem disabled>
            No users found
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserSelector;
