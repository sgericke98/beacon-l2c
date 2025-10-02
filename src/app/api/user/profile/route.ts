import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, AuthContext } from '@/lib/auth-middleware';

async function getProfile(request: NextRequest, context: AuthContext) {
  try {
    // Return the authenticated user's profile
    return NextResponse.json({
      success: true,
      data: {
        id: context.user.id,
        email: context.user.email,
        full_name: context.user.full_name,
        role: context.user.role
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateProfile(request: NextRequest, context: AuthContext) {
  try {
    const { full_name } = await request.json();

    if (!full_name) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Update user metadata in auth.users table
    const { data, error } = await context.supabase.auth.admin.updateUserById(
      context.user.id,
      {
        user_metadata: { full_name }
      }
    );

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: context.user.id,
        email: context.user.email,
        full_name,
        role: context.user.role
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getProfile);
export const PUT = withApiAuth(updateProfile);
