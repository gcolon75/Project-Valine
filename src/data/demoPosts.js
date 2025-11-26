// Demo posts to populate the feed for presentations
const NOW = Date.now();

export const demoPosts = [
  {
    id: 'demo-p1',
    author: {
      id: 'demo-user-1',
      displayName: 'Avery Quinn',
      username: 'averyquinn',
      avatar: 'https://i.pravatar.cc/150?img=32',
      headline: 'Writer • Sci-Fi'
    },
    content: 'Just finished a six-page pilot cold open! Looking for feedback on pacing and hook. Short cold open for a space-noir pilot. Anyone interested in taking a look? 🚀',
    tags: ['Script', 'SciFi', 'Pilot'],
    createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    mediaUrl: null,
    likes: 42,
    isLiked: false,
    commentsCount: 8,
    isDemo: true
  },
  {
    id: 'demo-p2',
    author: {
      id: 'demo-user-2',
      displayName: 'Milo Reyes',
      username: 'miloreyes',
      avatar: 'https://i.pravatar.cc/150?img=14',
      headline: 'Actor • Drama'
    },
    content: 'New audition tape is up! This is a teaser - monologue snippet from my latest submission. Full tape is gated - hit the request button to get access. 🎭',
    tags: ['Drama', 'Monologue'],
    createdAt: new Date(NOW - 5 * 60 * 60 * 1000).toISOString(),
    mediaUrl: null,
    likes: 31,
    isLiked: false,
    commentsCount: 12,
    isDemo: true
  },
  {
    id: 'demo-p3',
    author: {
      id: 'demo-user-3',
      displayName: 'Noa Kim',
      username: 'noakim',
      avatar: 'https://i.pravatar.cc/150?img=20',
      headline: 'Director • Indie'
    },
    content: 'Working on a short film and need a writer to punch up a key scene. Got mood board and beat sheet ready. Looking for collaborators who can bring fresh perspective. DM me! 🎬',
    tags: ['ShortFilm', 'Directing', 'Comedy'],
    createdAt: new Date(NOW - 24 * 60 * 60 * 1000).toISOString(),
    mediaUrl: null,
    likes: 18,
    isLiked: false,
    commentsCount: 4,
    isDemo: true
  },
  {
    id: 'demo-p4',
    author: {
      id: 'demo-user-4',
      displayName: 'Jordan Ellis',
      username: 'jordanellis',
      avatar: 'https://i.pravatar.cc/150?img=50',
      headline: 'Voice Actor • Animation'
    },
    content: 'Just wrapped a voice session for an upcoming animated series! Can\'t share details yet but so excited about this project. Voice acting community is amazing! 🎙️✨',
    tags: ['Animation', 'VoiceOver'],
    createdAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(),
    mediaUrl: null,
    likes: 67,
    isLiked: false,
    commentsCount: 15,
    isDemo: true
  },
  {
    id: 'demo-p5',
    author: {
      id: 'demo-user-5',
      displayName: 'Maya Patel',
      username: 'mayapatel',
      avatar: 'https://i.pravatar.cc/150?img=47',
      headline: 'Narrator • Audiobooks'
    },
    content: 'Finished recording my 50th audiobook today! 📚 It\'s been an incredible journey. Thank you to everyone who has supported my narration work. Here\'s to the next 50!',
    tags: ['Audiobook', 'Narration'],
    createdAt: new Date(NOW - 12 * 60 * 60 * 1000).toISOString(),
    mediaUrl: null,
    likes: 124,
    isLiked: false,
    commentsCount: 28,
    isDemo: true
  }
];

export default demoPosts;
