import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Loader2, Search, Plus, Users, Check, Trash2, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getThreads, getThread, sendThreadMessage, createThread, createGroupThread, leaveThread } from '../services/messagesService';
import { searchUsers } from '../services/search';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import UserAvatar from './UserAvatar';

export default function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCounts } = useUnread();
  const messagesEndRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('threads'); // 'threads' | 'conversation' | 'search'
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  const [threadToDelete, setThreadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showMembers, setShowMembers] = useState(false);

  const isOnInboxPage = location.pathname.startsWith('/inbox');

  useEffect(() => {
    if (isOpen && view === 'threads' && user && !isOnInboxPage) fetchThreads();
  }, [isOpen, view, user, isOnInboxPage]);

  useEffect(() => {
    if (user && !isOnInboxPage) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user, isOnInboxPage]);

  useEffect(() => {
    if (!user || isOnInboxPage) return;
    const searchForUsers = async () => {
      if (searchQuery.length < 2) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const response = await searchUsers({ query: searchQuery, limit: 10 });
        setSearchResults(response?.items || []);
      } catch (err) {
        console.error('Failed to search users:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };
    const timer = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user, isOnInboxPage]);

  if (isOnInboxPage) return null;
  if (!user) return null;

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const data = await getThreads();
      setThreads(data.items || []);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (thread) => {
    setCurrentThread(thread);
    setView('conversation');
    setLoading(true);
    try {
      const data = await getThread(thread.id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentThread) return;
    setSending(true);
    try {
      const result = await sendThreadMessage(currentThread.id, newMessage.trim());
      if (result?.message) setMessages(prev => [...prev, result.message]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const goBack = () => {
    setView('threads');
    setCurrentThread(null);
    setMessages([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
    fetchThreads();
  };

  const handleToggleUser = (selectedUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === selectedUser.id);
      return isSelected ? prev.filter(u => u.id !== selectedUser.id) : [...prev, selectedUser];
    });
  };

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) return;
    setCreatingThread(true);
    try {
      if (selectedUsers.length === 1) {
        const thread = await createThread(selectedUsers[0].id);
        setSearchQuery(''); setSearchResults([]); setSelectedUsers([]);
        setCurrentThread({ id: thread.id, otherUser: selectedUsers[0] });
        setView('conversation'); setMessages([]);
      } else {
        if (!groupName.trim()) return;
        const thread = await createGroupThread(groupName.trim(), selectedUsers.map(u => u.id));
        setSearchQuery(''); setSearchResults([]); setSelectedUsers([]); setGroupName('');
        setCurrentThread({ id: thread.id, isGroup: true, name: thread.name, participants: thread.participants });
        setView('conversation'); setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setCreatingThread(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!threadToDelete) return;
    setDeleting(true);
    try {
      await leaveThread(threadToDelete.id);
      setThreads(prev => prev.filter(t => t.id !== threadToDelete.id));
      setThreadToDelete(null);
    } catch (err) {
      console.error('Failed to delete/leave thread:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open messages"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white" />
            {unreadCounts.messages > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none rounded-full">
                {unreadCounts.messages > 9 ? '9+' : unreadCounts.messages}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] bg-white border border-neutral-200 shadow-xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] px-4 py-3 flex items-center gap-2.5 flex-shrink-0">
            {(view === 'conversation' || view === 'search') && (
              <button onClick={goBack} className="p-1 hover:bg-white/20 transition-colors flex-shrink-0">
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Avatar in conversation view */}
            {view === 'conversation' && (
              currentThread?.isGroup ? (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
              ) : currentThread?.otherUser && (
                <UserAvatar
                  src={currentThread.otherUser.avatar}
                  name={currentThread.otherUser.displayName || currentThread.otherUser.username}
                  alt={currentThread.otherUser.displayName}
                  className="w-8 h-8 flex-shrink-0"
                />
              )
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {view === 'threads' ? 'Messages' :
                 view === 'search' ? 'New Message' :
                 currentThread?.isGroup ? currentThread.name :
                 currentThread?.otherUser?.displayName || 'Chat'}
              </p>
              {view === 'conversation' && !currentThread?.isGroup && currentThread?.otherUser?.username && (
                <p className="text-xs text-white/70">@{currentThread.otherUser.username}</p>
              )}
              {view === 'conversation' && currentThread?.isGroup && currentThread?.participants && (
                <button
                  onClick={() => setShowMembers(true)}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  {currentThread.participants.length} members · tap to view
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {view === 'threads' && (
                <button
                  onClick={() => setView('search')}
                  className="p-1.5 hover:bg-white/20 transition-colors"
                  title="New message"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                onClick={() => navigate('/inbox')}
                className="text-xs text-white/70 hover:text-white transition-colors px-1.5 py-1"
              >
                Full view
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
              </div>

            ) : view === 'search' ? (
              <div className="flex flex-col h-full">
                {/* Selected users */}
                {selectedUsers.length > 0 && (
                  <div className="px-3 py-2.5 border-b border-neutral-100 flex flex-wrap gap-1.5">
                    {selectedUsers.map(u => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200"
                      >
                        {u.displayName || u.username}
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Group name */}
                {selectedUsers.length >= 2 && (
                  <div className="px-3 py-2.5 border-b border-neutral-100">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                    />
                  </div>
                )}

                {/* Search input */}
                <div className="px-3 py-2.5 border-b border-neutral-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search people..."
                      autoFocus
                      className="w-full pl-8 pr-8 py-1.5 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 animate-spin" />
                    )}
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                  {searchQuery.length < 2 ? (
                    <p className="text-center text-sm text-neutral-400 py-8 px-4">
                      Type to search · select multiple for a group
                    </p>
                  ) : searching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 text-neutral-300 animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-center text-sm text-neutral-400 py-8">No results</p>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {searchResults.map(searchUser => {
                        const isSelected = selectedUsers.some(u => u.id === searchUser.id);
                        return (
                          <button
                            key={searchUser.id}
                            onClick={() => handleToggleUser(searchUser)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-neutral-50 transition-colors text-left ${
                              isSelected ? 'bg-neutral-50' : ''
                            }`}
                          >
                            <UserAvatar
                              src={searchUser.avatar}
                              name={searchUser.displayName || searchUser.username}
                              alt={searchUser.displayName || searchUser.username}
                              className="w-8 h-8 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {searchUser.displayName || searchUser.username}
                              </p>
                              <p className="text-xs text-neutral-400">@{searchUser.username}</p>
                            </div>
                            <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Start chat */}
                {selectedUsers.length > 0 && (
                  <div className="px-3 py-2.5 border-t border-neutral-100">
                    <button
                      onClick={handleStartChat}
                      disabled={(selectedUsers.length >= 2 && !groupName.trim()) || creatingThread}
                      className="w-full py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creatingThread ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedUsers.length === 1 ? (
                        <><MessageSquare className="w-4 h-4" /> Start Chat</>
                      ) : (
                        <><Users className="w-4 h-4" /> Create Group ({selectedUsers.length})</>
                      )}
                    </button>
                  </div>
                )}
              </div>

            ) : view === 'threads' ? (
              threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-4">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium text-neutral-600">No messages yet</p>
                  <p className="text-xs text-neutral-400 mt-1 text-center">Start a conversation from someone's profile</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {threads.map(thread => {
                    const threadName = thread.isGroup
                      ? thread.name
                      : thread.otherUser?.displayName || 'Unknown';
                    const roleLabel = !thread.isGroup && thread.otherUser?.title
                      ? thread.otherUser.title
                      : null;
                    const groupAvatars = thread.isGroup
                      ? thread.participants?.slice(0, 4).map(p => p.avatar) || []
                      : [];

                    return (
                      <div key={thread.id} className="relative group">
                        <button
                          onClick={() => openThread(thread)}
                          className="w-full px-3 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors text-left"
                        >
                          {/* Avatar */}
                          {thread.isGroup ? (
                            <div className="w-10 h-10 flex-shrink-0">
                              {groupAvatars.length <= 1 ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center ring-2 ring-white shadow">
                                  <Users className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full overflow-hidden flex flex-wrap">
                                  {groupAvatars.slice(0, 4).map((avatar, idx) =>
                                    avatar ? (
                                      <img key={idx} src={avatar} alt="" className="w-5 h-5 object-cover" />
                                    ) : (
                                      <div key={idx} className="w-5 h-5 bg-neutral-200 flex items-center justify-center">
                                        <Users className="w-2.5 h-2.5 text-neutral-400" />
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <UserAvatar
                              src={thread.otherUser?.avatar}
                              name={thread.otherUser?.displayName || thread.otherUser?.username}
                              alt={thread.otherUser?.displayName}
                              className="w-10 h-10 flex-shrink-0"
                            />
                          )}

                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                              <div className="min-w-0 flex items-baseline gap-1.5 flex-1">
                                <span className="text-sm font-medium text-neutral-900 truncate">{threadName}</span>
                                {roleLabel && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 flex-shrink-0 hidden sm:block">
                                    {roleLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {thread.unreadCount > 0 && (
                                  <span className="min-w-[16px] h-[16px] px-1 bg-[#0CCE6B] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {thread.unreadCount}
                                  </span>
                                )}
                                <span className="text-[10px] text-neutral-400">
                                  {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-neutral-500 truncate">
                              {thread.lastMessage?.body || 'No messages yet'}
                            </p>
                          </div>
                        </button>

                        {/* Delete on hover */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setThreadToDelete(thread); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title={thread.isGroup ? 'Leave group' : 'Delete'}
                        >
                          {thread.isGroup ? <LogOut className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )

            ) : (
              /* Conversation */
              <div className="flex flex-col p-3 space-y-2.5 bg-neutral-50 min-h-full">
                {messages.map(msg => {
                  const isOwn = msg.senderId === user?.id;
                  const senderAvatar = isOwn
                    ? user?.avatar
                    : msg.sender?.avatar || currentThread?.otherUser?.avatar;
                  const senderName = isOwn
                    ? null
                    : msg.sender?.displayName || currentThread?.otherUser?.displayName;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <UserAvatar
                        src={senderAvatar}
                        name={senderName || user?.displayName}
                        alt={senderName || 'You'}
                        className="w-6 h-6 flex-shrink-0"
                      />
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                        {currentThread?.isGroup && !isOwn && senderName && (
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
                            {senderName}
                          </p>
                        )}
                        <div className={`px-3 py-2 text-sm ${
                          isOwn
                            ? 'bg-neutral-900 text-white rounded-2xl rounded-br-sm'
                            : 'bg-white border border-neutral-200 text-neutral-900 rounded-2xl rounded-bl-sm'
                        }`}>
                          <p>{msg.body}</p>
                          <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-white/60' : 'text-neutral-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message input */}
          {view === 'conversation' && (
            <form onSubmit={handleSend} className="px-3 py-2.5 border-t border-neutral-200 bg-white flex-shrink-0">
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete/leave confirmation */}
      {threadToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              {threadToDelete.isGroup ? 'Leave Group' : 'Delete Conversation'}
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              {threadToDelete.isGroup
                ? `Leave "${threadToDelete.name}"? You won't see new messages.`
                : `Permanently delete this conversation with ${threadToDelete.otherUser?.displayName || 'this user'}?`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setThreadToDelete(null)}
                className="flex-1 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : threadToDelete.isGroup ? (
                  <><LogOut className="w-3.5 h-3.5" /> Leave</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group members modal */}
      {showMembers && currentThread?.isGroup && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                Members ({currentThread.participants?.length || 0})
              </h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-neutral-100">
              {currentThread.participants?.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => { setShowMembers(false); setIsOpen(false); navigate(`/profile/${participant.username || participant.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                >
                  <UserAvatar
                    src={participant.avatar}
                    name={participant.displayName || participant.username}
                    alt={participant.displayName}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {participant.displayName || participant.username}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">@{participant.username}</p>
                  </div>
                  {participant.id === user?.id && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 px-1.5 py-1 bg-neutral-100">
                      You
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
