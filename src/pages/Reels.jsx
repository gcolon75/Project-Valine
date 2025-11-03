// src/pages/Reels.jsx
import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, MoreVertical } from 'lucide-react';
import ReelsCommentModal from '../components/ReelsCommentModal';
import { useApiFallback } from '../hooks/useApiFallback';
import { getReels, toggleReelLike, toggleReelBookmark } from '../services/reelsService';

// Mock/fallback reels data
const FALLBACK_REELS = [
  {
    id: 1,
    videoUrl: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0fd273d2c6d9a064f3ae35579b2bbdf',
    thumbnail: 'https://i.pravatar.cc/400?img=1',
    author: {
      username: 'voiceactor_sarah',
      displayName: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    caption: 'Behind the scenes of my latest voiceover project! 🎤 #VoiceActing #BTS',
    likes: 1234,
    comments: 89,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 2,
    videoUrl: 'https://player.vimeo.com/external/413802934.sd.mp4?s=019c0a34d6e6a4a9e13c3f6be8e36e15356a4e0b',
    thumbnail: 'https://i.pravatar.cc/400?img=12',
    author: {
      username: 'audio_engineer_mike',
      displayName: 'Michael Chen',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    caption: 'Studio tour! Check out my setup 🎧 #AudioEngineering #Studio',
    likes: 2456,
    comments: 134,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 3,
    videoUrl: 'https://player.vimeo.com/external/336879879.sd.mp4?s=15f1e8d0e3c8a9b6e5e6f0e5e3f8e4e5e3f8e4e5',
    thumbnail: 'https://i.pravatar.cc/400?img=5',
    author: {
      username: 'writer_emily',
      displayName: 'Emily Rodriguez',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    caption: 'Writing process for my new script! ✍️ #ScriptWriting #Creative',
    likes: 987,
    comments: 45,
    isLiked: false,
    isBookmarked: false,
  },
];

export default function Reels() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Fetch reels from API with fallback to mock data
  const { data: reels, loading: isLoading, usingFallback } = useApiFallback(
    () => getReels(20),
    FALLBACK_REELS,
    { diagnosticContext: 'Reels.getReels' }
  );

  const [reelsState, setReelsState] = useState(reels);
  const [showComments, setShowComments] = useState(false);

  // Update reels state when API data arrives
  useEffect(() => {
    if (reels && reels.length > 0) {
      setReelsState(reels);
    }
  }, [reels]);

  // Navigate to next/previous reel
  const goToNext = () => {
    if (currentIndex < reels.length - 1) {
      setIsLoading(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') goToPrevious();
      if (e.key === 'ArrowDown') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Video playback control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => console.log('Video play failed:', err));
    }
  }, [currentIndex]);

  // Touch swipe detection
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      goToNext();
    }
    if (touchStart - touchEnd < -50) {
      goToPrevious();
    }
  };

  // Toggle like with API
  const toggleLike = async (reelId) => {
    // Optimistic update
    setReelsState(prev => prev.map(reel => 
      reel.id === reelId 
        ? { ...reel, isLiked: !reel.isLiked, likes: reel.isLiked ? reel.likes - 1 : reel.likes + 1 }
        : reel
    ));

    // Try to sync with API
    if (!usingFallback) {
      try {
        await toggleReelLike(reelId);
      } catch (err) {
        // Rollback on error
        console.error('Failed to toggle like:', err);
        setReelsState(prev => prev.map(reel => 
          reel.id === reelId 
            ? { ...reel, isLiked: !reel.isLiked, likes: reel.isLiked ? reel.likes + 1 : reel.likes - 1 }
            : reel
        ));
      }
    }
  };

  // Toggle bookmark with API
  const toggleBookmark = async (reelId) => {
    // Optimistic update
    setReelsState(prev => prev.map(reel => 
      reel.id === reelId 
        ? { ...reel, isBookmarked: !reel.isBookmarked }
        : reel
    ));

    // Try to sync with API
    if (!usingFallback) {
      try {
        await toggleReelBookmark(reelId);
      } catch (err) {
        // Rollback on error
        console.error('Failed to toggle bookmark:', err);
        setReelsState(prev => prev.map(reel => 
          reel.id === reelId 
            ? { ...reel, isBookmarked: !reel.isBookmarked }
            : reel
        ));
      }
    }
  };

  const currentReel = reelsState[currentIndex];

  return (
    <div className="fixed inset-0 bg-black">
      {/* Reels Container */}
      <div
        ref={containerRef}
        className="h-full w-full relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Video Background */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={currentReel.videoUrl}
            poster={currentReel.thumbnail}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            autoPlay
            playsInline
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full flex items-end">
            <div className="w-full px-4 pb-24 pointer-events-auto">
              <div className="flex items-end justify-between">
                
                {/* Left: Author Info */}
                <div className="flex-1 space-y-3">
                  {/* Author */}
                  <div className="flex items-center space-x-3">
                    <img 
                      src={currentReel.author.avatar} 
                      alt={currentReel.author.displayName}
                      className="w-12 h-12 rounded-full border-2 border-white"
                    />
                    <div>
                      <p className="text-white font-semibold">{currentReel.author.displayName}</p>
                      <p className="text-white/80 text-sm">@{currentReel.author.username}</p>
                    </div>
                    <button className="ml-2 bg-[#0CCE6B] hover:bg-[#0BBE60] text-white px-4 py-1 rounded-full text-sm font-semibold transition-colors">
                      Follow
                    </button>
                  </div>

                  {/* Caption */}
                  <p className="text-white text-sm max-w-xs">
                    {currentReel.caption}
                  </p>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-col items-center space-y-6 pb-4">
                  {/* Like */}
                  <button 
                    onClick={() => toggleLike(currentReel.id)}
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      currentReel.isLiked 
                        ? 'bg-red-500' 
                        : 'bg-white/20 hover:bg-white/30'
                    }`}>
                      <Heart 
                        className={`w-6 h-6 ${
                          currentReel.isLiked 
                            ? 'text-white fill-white' 
                            : 'text-white'
                        }`} 
                      />
                    </div>
                    <span className="text-white text-xs font-semibold">
                      {currentReel.likes.toLocaleString()}
                    </span>
                  </button>

                  {/* Comment */}
                  <button 
                    onClick={() => setShowComments(true)}
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-xs font-semibold">
                      {currentReel.comments}
                    </span>
                  </button>

                  {/* Share */}
                  <button className="flex flex-col items-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                  </button>

                  {/* Bookmark */}
                  <button 
                    onClick={() => toggleBookmark(currentReel.id)}
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      currentReel.isBookmarked 
                        ? 'bg-[#0CCE6B]' 
                        : 'bg-white/20 hover:bg-white/30'
                    }`}>
                      <Bookmark 
                        className={`w-6 h-6 ${
                          currentReel.isBookmarked 
                            ? 'text-white fill-white' 
                            : 'text-white'
                        }`}
                      />
                    </div>
                  </button>

                  {/* More */}
                  <button className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <MoreVertical className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrevious}
            className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors pointer-events-auto"
          >
            <ChevronUp className="w-6 h-6 text-white" />
          </button>
        )}

        {currentIndex < reels.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors pointer-events-auto md:left-4 md:top-1/2 md:-translate-y-1/2 md:bottom-auto"
          >
            <ChevronDown className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Mute Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-20 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors pointer-events-auto"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Progress Indicators */}
        <div className="absolute top-20 left-0 right-0 flex justify-center space-x-2 pointer-events-none">
          {reels.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex 
                  ? 'w-8 bg-white' 
                  : 'w-1 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Swipe Hint (only on mobile) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center md:hidden pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm animate-pulse">
            Swipe up for more
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Comment Modal */}
      <ReelsCommentModal 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
        reel={currentReel} 
      />
    </div>
  );
}
