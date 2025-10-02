import { NextRequest, NextResponse } from 'next/server';
import { withAdminApiAuth, AuthContext } from '@/lib/auth-middleware';

async function getUsers(request: NextRequest, context: AuthContext) {
  try {
    const { data: members, error } = await context.supabase
      .from('organization_members')
      .select(`
        organization_member_id,
        user_id,
        member_role,
        member_is_active,
        member_joined_at
      `)
      .order('member_joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users', message: error.message },
        { status: 500 }
      );
    }

    // Get user details from auth.users for each member
    const transformedUsers = await Promise.all(
      (members || []).map(async (member) => {
        // Type guard to ensure member has the required properties
        if (!member || typeof member !== 'object' || !('user_id' in member)) {
          console.error('Invalid member data:', member);
          return {
            id: 'unknown',
            email: 'Unknown',
            full_name: 'Unknown',
            role: 'unknown',
            is_active: false,
            joined_at: null,
            created_at: null
          };
        }

        const { data: userData } = await context.supabase.auth.admin.getUserById(member.user_id as string);
        
        return {
          id: member.user_id,
          email: userData?.user?.email || 'Unknown',
          full_name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown',
          role: member.member_role,
          is_active: member.member_is_active,
          joined_at: member.member_joined_at,
          created_at: userData?.user?.created_at
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      count: transformedUsers.length
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createUser(request: NextRequest, context: AuthContext) {
  try {
    const { email, full_name, role = 'member' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await context.supabase.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12), // Generate random password
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      console.error('Error creating user in auth:', authError);
      return NextResponse.json(
        { error: 'Failed to create user', message: authError.message },
        { status: 500 }
      );
    }

    // Get the current user's organization (assuming single organization for now)
    const { data: currentUserOrg, error: orgError } = await context.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', context.user.id as any)
      .single();

    if (orgError || !currentUserOrg || !('organization_id' in currentUserOrg)) {
      console.error('Error getting user organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to get organization', message: 'User not associated with any organization' },
        { status: 500 }
      );
    }

    // Add user to organization_members table
    const { data: memberData, error: memberError } = await context.supabase
      .from('organization_members')
      .insert({
        user_id: authData.user.id,
        organization_id: currentUserOrg.organization_id,
        member_role: role,
        member_is_active: true
      } as any)
      .select()
      .single();

    if (memberError) {
      console.error('Error creating organization member:', memberError);
      return NextResponse.json(
        { error: 'Failed to add user to organization', message: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role,
        organization_id: currentUserOrg.organization_id
      },
      message: 'User created successfully and added to organization'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminApiAuth(getUsers);
export const POST = withAdminApiAuth(createUser);
