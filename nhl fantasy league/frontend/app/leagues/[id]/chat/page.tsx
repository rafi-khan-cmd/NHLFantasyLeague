'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  leagueId: string;
  userId: string;
  message: string;
  replyToId?: string;
  isPinned: boolean;
  isAnnouncement: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export default function LeagueChatPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.id as string;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [leagueId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getMessages(leagueId, 100);
      setMessages(response.data.reverse()); // Reverse to show newest at bottom
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError('Failed to load chat messages. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const newSocket = io(API_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      newSocket.emit('chat:join', { leagueId });
    });

    newSocket.on('chat:new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('chat:message-deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    setSocket(newSocket);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    try {
      await chatApi.sendMessage(leagueId, newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading chat...</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto p-8 animate-fade-in h-screen flex flex-col">
          <div className="mb-6">
            <Link href={`/leagues/${leagueId}`} className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
              ← Back to League
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              LEAGUE CHAT
            </h1>
            <p className="text-white/80">Discuss trades, strategy, and more</p>
          </div>

          {/* Messages Container */}
          <div className="flex-1 glass border border-white/20 rounded-3xl p-6 mb-6 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-white/60 py-12">
                  <p className="text-lg">No messages yet. Be the first to say something!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 glass border border-white/10 rounded-2xl ${
                      message.isPinned ? 'border-yellow-400/50 bg-yellow-400/10' : ''
                    } ${message.userId === user?.id ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold">
                        {message.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">
                            {message.user?.username || 'Unknown User'}
                          </span>
                          {message.isPinned && (
                            <span className="text-yellow-400 text-xs">📌 Pinned</span>
                          )}
                          {message.isAnnouncement && (
                            <span className="text-nhl-red text-xs font-semibold">Announcement</span>
                          )}
                          <span className="text-white/40 text-xs">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white/90 whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="glass border border-white/20 rounded-2xl p-4">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white placeholder:text-white/50"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !socket}
                className="px-6 py-3 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl font-semibold hover:from-nhl-blue-light hover:to-nhl-red-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-white/50 text-right">
              {newMessage.length}/1000 characters
            </div>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}

