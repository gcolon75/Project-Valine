import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { requireEmailVerified } from '../utils/authMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';
import { logAuthDiagnostics } from '../utils/correlationId.js';

/**
 * GET /api/settings
 * Get user settings (authenticated)
 */
export const getSettings = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          notifications: {
            email: true,
            push: true,
            reelRequests: true,
            messages: true,
            comments: true,
            likes: true,
          },
          accountSecurity: {
            twoFactorEnabled: false,
            loginNotifications: true,
          },
          privacy: {
            showActivity: true,
            allowMessagesFrom: 'everyone', // 'everyone', 'connections', 'nobody'
            showOnlineStatus: true,
          },
        },
      });
    }

    return json(settings);
  } catch (e) {
    console.error('Get settings error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /api/settings
 * Update user settings (authenticated)
 */
export const updateSettings = async (event) => {
  try {
    // CSRF protection (Phase 3)
    const csrfError = csrfProtection(event);
    if (csrfError) {
      return csrfError;
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Require email verification for updating settings
    const verificationError = await requireEmailVerified(userId);
    if (verificationError) {
      return verificationError;
    }

    const body = JSON.parse(event.body || '{}');
    const { notifications, accountSecurity, privacy, billing } = body;

    const prisma = getPrisma();

    // Get or create settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          notifications: notifications || {},
          accountSecurity: accountSecurity || {},
          privacy: privacy || {},
          billing: billing || null,
        },
      });
    } else {
      // Update settings
      const updateData = {};
      if (notifications !== undefined) updateData.notifications = notifications;
      if (accountSecurity !== undefined) updateData.accountSecurity = accountSecurity;
      if (privacy !== undefined) updateData.privacy = privacy;
      if (billing !== undefined) updateData.billing = billing;

      settings = await prisma.userSettings.update({
        where: { userId },
        data: updateData,
      });
    }

    return json(settings);
  } catch (e) {
    console.error('Update settings error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /api/account/export
 * Generate account data export (GDPR compliance)
 */
export const exportAccountData = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Gather all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            media: true,
            credits: true,
          },
        },
        settings: true,
        posts: true,
        reels: true,
        comments: true,
        likes: true,
        bookmarks: true,
        sentRequests: true,
        receivedRequests: true,
        sentMessages: true,
        conversations: {
          include: {
            conversation: {
              include: {
                messages: true,
              },
            },
          },
        },
        notifications: true,
        sentReelRequests: true,
        receivedReelRequests: true,
      },
    });

    if (!user) {
      return error(404, 'User not found');
    }

    // Remove sensitive fields
    const exportData = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: user.profile,
      settings: user.settings,
      posts: user.posts,
      reels: user.reels,
      comments: user.comments,
      likes: user.likes,
      bookmarks: user.bookmarks,
      connectionRequests: {
        sent: user.sentRequests,
        received: user.receivedRequests,
      },
      messages: user.sentMessages,
      conversations: user.conversations,
      notifications: user.notifications,
      reelRequests: {
        sent: user.sentReelRequests,
        received: user.receivedReelRequests,
      },
      exportedAt: new Date().toISOString(),
    };

    // In production, you might want to:
    // 1. Store this as a file in S3
    // 2. Send a download link via email
    // 3. Queue it for async processing
    // For now, we'll return it directly

    return json(exportData);
  } catch (e) {
    console.error('Export account data error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /api/account
 * Delete account (GDPR compliance - scheduled deletion)
 */
export const deleteAccount = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { confirmPassword } = body;

    if (!confirmPassword) {
      return error(400, 'Password confirmation is required');
    }

    const prisma = getPrisma();

    // Get user to verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return error(404, 'User not found');
    }

    // Verify password using bcrypt
    const bcrypt = await import('bcryptjs');
    const passwordMatch = await bcrypt.compare(confirmPassword, user.password);
    
    if (!passwordMatch) {
      return error(401, 'Invalid password');
    }

    // In production, you might want to:
    // 1. Mark account for deletion (30-day grace period)
    // 2. Queue background job to remove data
    // 3. Send confirmation email
    // For now, we'll just delete immediately

    await prisma.user.delete({
      where: { id: userId },
    });

    return json({
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Delete account error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/preferences
 * Get user preferences (theme, etc.)
 */
export const getPreferences = async (event) => {
  try {
    // Log auth diagnostics for debugging
    logAuthDiagnostics('getPreferences', event);
    
    const userId = getUserFromEvent(event);
    if (!userId) {
      console.log('[getPreferences] UNAUTHORIZED - No user ID from token');
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get user and settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        theme: true,
        onboardingComplete: true,
        profileComplete: true,
      },
    });

    if (!user) {
      return error(404, 'User not found');
    }

    // Get user settings if they exist
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return json({
      theme: user.theme || 'light',
      onboardingComplete: user.onboardingComplete || false,
      profileComplete: user.profileComplete || false,
      notifications: settings?.notifications || {},
      privacy: settings?.privacy || {},
    });
  } catch (e) {
    console.error('Get preferences error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /me/preferences
 * Update user preferences (theme, etc.)
 */
export const updatePreferences = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { theme, onboardingComplete, profileComplete, notifications, privacy } = body;

    const prisma = getPrisma();

    // Update user theme if provided
    const userUpdateData = {};
    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return error(400, 'Invalid theme value. Must be "light" or "dark"');
      }
      userUpdateData.theme = theme;
    }
    if (onboardingComplete !== undefined) {
      userUpdateData.onboardingComplete = Boolean(onboardingComplete);
    }
    if (profileComplete !== undefined) {
      userUpdateData.profileComplete = Boolean(profileComplete);
    }

    // Update user if we have user-level changes
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Update or create settings if we have settings-level changes
    if (notifications !== undefined || privacy !== undefined) {
      const settingsUpdateData = {};
      if (notifications !== undefined) settingsUpdateData.notifications = notifications;
      if (privacy !== undefined) settingsUpdateData.privacy = privacy;

      await prisma.userSettings.upsert({
        where: { userId },
        update: settingsUpdateData,
        create: {
          userId,
          ...settingsUpdateData,
        },
      });
    }

    // Return updated preferences
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        theme: true,
        onboardingComplete: true,
        profileComplete: true,
      },
    });

    const updatedSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return json({
      theme: updatedUser?.theme || 'light',
      onboardingComplete: updatedUser?.onboardingComplete || false,
      profileComplete: updatedUser?.profileComplete || false,
      notifications: updatedSettings?.notifications || {},
      privacy: updatedSettings?.privacy || {},
    });
  } catch (e) {
    console.error('Update preferences error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
