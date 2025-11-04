import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * GET /api/settings
 * Get user settings (authenticated)
 */
export const getSettings = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
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
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * PUT /api/settings
 * Update user settings (authenticated)
 */
export const updateSettings = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
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
    return error('Server error: ' + e.message, 500);
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
      return error('Unauthorized', 401);
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
      return error('User not found', 404);
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
    return error('Server error: ' + e.message, 500);
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
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { confirmPassword } = body;

    if (!confirmPassword) {
      return error('Password confirmation is required', 400);
    }

    // TODO: Verify password before deletion
    // For now, we'll skip password verification

    const prisma = getPrisma();

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
    return error('Server error: ' + e.message, 500);
  }
};
