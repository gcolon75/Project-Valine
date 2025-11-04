// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3001';

// Mock data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@valine.com',
  displayName: 'Test User',
  avatar: 'https://i.pravatar.cc/150?img=1',
  bio: 'Voice actor and content creator',
  role: 'artist',
  profileComplete: true
};

const mockReels = [
  {
    id: 'reel-1',
    videoUrl: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0fd273d2c6d9a064f3ae35579b2bbdf',
    thumbnail: 'https://i.pravatar.cc/400?img=1',
    author: {
      id: 'user-1',
      username: 'voiceactor_sarah',
      displayName: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    caption: 'Behind the scenes of my latest voiceover project! 🎤 #VoiceActing #BTS',
    likes: 1234,
    comments: 89,
    isLiked: false,
    isBookmarked: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'reel-2',
    videoUrl: 'https://player.vimeo.com/external/413802934.sd.mp4?s=019c0a34d6e6a4a9e13c3f6be8e36e15356a4e0b',
    thumbnail: 'https://i.pravatar.cc/400?img=12',
    author: {
      id: 'user-2',
      username: 'audio_engineer_mike',
      displayName: 'Michael Chen',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    caption: 'Studio tour! Check out my setup 🎧 #AudioEngineering #Studio',
    likes: 2456,
    comments: 134,
    isLiked: false,
    isBookmarked: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

const mockPosts = [
  {
    id: 'post-1',
    content: 'Just finished recording a new audiobook! Excited to share it with you all soon.',
    author: mockUser,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    likes: 42,
    comments: 5,
    isLiked: false,
    isBookmarked: false,
    media: []
  },
  {
    id: 'post-2',
    content: 'Working on a new character voice today. What do you think?',
    author: {
      id: 'user-2',
      username: 'another_user',
      displayName: 'Another User',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    likes: 87,
    comments: 12,
    isLiked: false,
    isBookmarked: false,
    media: []
  }
];

const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    recipientId: 'user-1',
    content: 'Hey, loved your recent reel!',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false
  }
];

const mockConversations = [
  {
    id: 'conv-1',
    participants: [
      {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
      {
        id: 'user-2',
        username: 'another_user',
        displayName: 'Another User',
        avatar: 'https://i.pravatar.cc/150?img=2',
      }
    ],
    lastMessage: {
      content: 'Hey, loved your recent reel!',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      senderId: 'user-2'
    },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'like',
    actorId: 'user-2',
    targetType: 'reel',
    targetId: 'reel-1',
    content: 'liked your reel',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false
  }
];

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token-123'
    }, { status: 200 });
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      user: { ...mockUser, ...body, id: 'new-user-' + Date.now() },
      token: 'mock-jwt-token-456'
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser, { status: 200 });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // Reels endpoints
  http.get(`${API_BASE}/reels`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(mockReels.slice(0, limit), { status: 200 });
  }),

  http.get(`${API_BASE}/reels/:id`, ({ params }) => {
    const reel = mockReels.find(r => r.id === params.id);
    if (!reel) {
      return HttpResponse.json({ error: 'Reel not found' }, { status: 404 });
    }
    return HttpResponse.json(reel, { status: 200 });
  }),

  http.post(`${API_BASE}/reels/:id/like`, ({ params }) => {
    const reel = mockReels.find(r => r.id === params.id);
    if (!reel) {
      return HttpResponse.json({ error: 'Reel not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...reel,
      isLiked: !reel.isLiked,
      likes: reel.isLiked ? reel.likes - 1 : reel.likes + 1
    }, { status: 200 });
  }),

  http.post(`${API_BASE}/reels/:id/bookmark`, ({ params }) => {
    const reel = mockReels.find(r => r.id === params.id);
    if (!reel) {
      return HttpResponse.json({ error: 'Reel not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...reel,
      isBookmarked: !reel.isBookmarked
    }, { status: 200 });
  }),

  http.get(`${API_BASE}/reels/:id/comments`, ({ params }) => {
    return HttpResponse.json([
      {
        id: 'comment-1',
        reelId: params.id,
        author: mockUser,
        content: 'Great work!',
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ], { status: 200 });
  }),

  http.post(`${API_BASE}/reels/:id/comments`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'comment-' + Date.now(),
      reelId: params.id,
      author: mockUser,
      content: body.content,
      createdAt: new Date().toISOString()
    }, { status: 201 });
  }),

  // Posts endpoints
  http.get(`${API_BASE}/posts`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(mockPosts.slice(0, limit), { status: 200 });
  }),

  http.post(`${API_BASE}/posts`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'post-' + Date.now(),
      ...body,
      author: mockUser,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      isLiked: false,
      isBookmarked: false
    }, { status: 201 });
  }),

  http.post(`${API_BASE}/posts/:id/like`, ({ params }) => {
    const post = mockPosts.find(p => p.id === params.id);
    if (!post) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...post,
      isLiked: !post.isLiked,
      likes: post.isLiked ? post.likes - 1 : post.likes + 1
    }, { status: 200 });
  }),

  http.post(`${API_BASE}/posts/:id/bookmark`, ({ params }) => {
    const post = mockPosts.find(p => p.id === params.id);
    if (!post) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...post,
      isBookmarked: !post.isBookmarked
    }, { status: 200 });
  }),

  // Users endpoints
  http.get(`${API_BASE}/users/:username`, ({ params }) => {
    if (params.username === 'testuser') {
      return HttpResponse.json(mockUser, { status: 200 });
    }
    return HttpResponse.json({ error: 'User not found' }, { status: 404 });
  }),

  // Conversations endpoints
  http.get(`${API_BASE}/conversations`, () => {
    return HttpResponse.json(mockConversations, { status: 200 });
  }),

  http.post(`${API_BASE}/conversations`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'conv-' + Date.now(),
      participants: body.participants || [],
      lastMessage: null,
      unreadCount: 0,
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/conversations/:id/messages`, ({ params, request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const messages = mockMessages.filter(m => m.conversationId === params.id);
    return HttpResponse.json(messages.slice(0, limit), { status: 200 });
  }),

  http.post(`${API_BASE}/conversations/:id/messages`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'msg-' + Date.now(),
      conversationId: params.id,
      senderId: mockUser.id,
      content: body.content,
      createdAt: new Date().toISOString(),
      read: false
    }, { status: 201 });
  }),

  // Messages endpoints (legacy)
  http.get(`${API_BASE}/messages`, ({ request }) => {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    return HttpResponse.json(
      conversationId 
        ? mockMessages.filter(m => m.conversationId === conversationId)
        : mockMessages,
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/messages`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'msg-' + Date.now(),
      ...body,
      createdAt: new Date().toISOString(),
      read: false
    }, { status: 201 });
  }),

  // Notifications endpoints
  http.get(`${API_BASE}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    return HttpResponse.json(mockNotifications, { status: 200 });
  }),

  http.patch(`${API_BASE}/notifications/:id/read`, ({ params }) => {
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  http.patch(`${API_BASE}/notifications/mark-all`, () => {
    return HttpResponse.json({ success: true, marked: mockNotifications.length }, { status: 200 });
  }),

  // Unread counts
  http.get(`${API_BASE}/unread-counts`, () => {
    return HttpResponse.json({
      notifications: mockNotifications.filter(n => !n.read).length,
      messages: mockMessages.filter(m => !m.read).length
    }, { status: 200 });
  }),

  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ ok: true, status: 'healthy' }, { status: 200 });
  })
];
