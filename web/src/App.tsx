import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Plus, Menu, X, Database, Newspaper, Trophy, Train, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from './api/client';
import type { Message } from './api/client';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

const FEATURES = [
  { icon: Database, label: 'Database', desc: 'SQL queries & analysis' },
  { icon: Newspaper, label: 'News', desc: 'Trending topics' },
  { icon: Trophy, label: 'Sports', desc: 'NBA, NFL, MLB stats' },
  { icon: Train, label: 'Travel', desc: 'Train tickets' },
  { icon: BookOpen, label: 'Policies', desc: 'HR handbook' },
  { icon: Sparkles, label: 'Fortune', desc: 'I Ching divination' },
];

const COMMON_EMOJIS = ['😊', '😂', '❤️', '👍', '🔥', '✨', '🎉', '💯', '🚀', '👏', '💪', '🙏', '🤔', '😍', '⭐', '💡', '🎯', '✅', '❌', '⚡'];

function App() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [
        {
          role: 'assistant',
          content: "Hey there! I'm your **DataAnalyze Helper** - ready to assist with database queries, trending news, sports stats, travel planning, HR policies, and more. What can I help you with today?",
          timestamp: new Date(),
        },
      ],
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('1');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await apiClient.healthCheck();
      setIsOnline(healthy);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateCurrentSessionMessages = (newMessages: Message[]) => {
    setChatSessions(prev =>
      prev.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: newMessages }
          : session
      )
    );
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 25) + (firstMessage.length > 25 ? '...' : '');
    setChatSessions(prev =>
      prev.map(session =>
        session.id === sessionId ? { ...session, title } : session
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    updateCurrentSessionMessages(newMessages);

    if (messages.length === 1 && messages[0].role === 'assistant') {
      updateSessionTitle(currentSessionId, userMessage.content);
    }

    setInput('');
    setIsLoading(true);
    setError(null);
    setShowEmojiPicker(false);

    try {
      const result = await apiClient.chat(userMessage.content);
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };
      updateCurrentSessionMessages([...newMessages, assistantMessage]);
    } catch (err: any) {
      setError(err.message);
      const errorMessage: Message = {
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nMake sure the backend is running (\`npm run dev\`).`,
        timestamp: new Date(),
      };
      updateCurrentSessionMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          role: 'assistant',
          content: "Hey there! I'm your **DataAnalyze Helper** - ready to assist with database queries, trending news, sports stats, travel planning, HR policies, and more. What can I help you with today?",
          timestamp: new Date(),
        },
      ],
    };
    setChatSessions([newSession, ...chatSessions]);
    setCurrentSessionId(newSession.id);
    setSidebarOpen(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F8FAFA' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex-shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E0E0' }}
      >
        <div className="h-full flex flex-col p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#333333] tracking-tight">MENU</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-[#333333] hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="btn-tiffany flex items-center justify-center gap-2 px-4 py-3 mb-6"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-3">
              CAPABILITIES
            </h3>
            <div className="space-y-2">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 bg-[#F8FAFA] rounded-lg border border-[#E0E0E0]"
                >
                  <Icon className="w-4 h-4 text-[#0ABAB5]" />
                  <div>
                    <p className="text-sm font-semibold text-[#333333]">{label}</p>
                    <p className="text-xs text-[#666666]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-3">
              HISTORY
            </h3>
            <div className="space-y-1">
              {chatSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm truncate transition-colors rounded-lg ${
                    session.id === currentSessionId
                      ? 'bg-[#0ABAB5] text-white font-semibold'
                      : 'text-[#333333] hover:bg-[#F8FAFA]'
                  }`}
                >
                  {session.title}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[#0ABAB5]' : 'bg-[#FF6B6B]'} ${
                  isOnline ? 'animate-pulse-dot' : ''
                }`}
              />
              <span className="text-sm text-[#666666]">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-4"
          style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-[#333333]" />
            </button>
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: '#0ABAB5' }}
            >
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#333333]">
                DataAnalyze Helper
              </h1>
              <p className="text-xs font-medium text-[#666666]">
                Multi-Agent AI Assistant
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-sm font-semibold text-[#666666] truncate max-w-[200px]">
            {currentSession?.title}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: '#F8FAFA' }}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: message.role === 'assistant' ? '#0ABAB5' : '#81D8D0',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message */}
                <div className={`flex-1 max-w-xl ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div
                    className={`px-4 py-3 ${
                      message.role === 'user' ? 'message-user' : 'message-assistant'
                    }`}
                  >
                    <div className="prose-brutal text-sm">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: '#0ABAB5' }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="message-assistant px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0ABAB5]" />
                    <span className="text-sm font-medium text-[#666666]">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: '#FF6B6B' }}
                >
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: '#FFF0F0', border: '1px solid #FFD0D0' }}
                >
                  <p className="text-sm font-bold text-[#FF6B6B]">Connection Error</p>
                  <p className="text-xs text-[#666666] mt-1">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E0E0E0' }}>
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div
              className="flex items-center gap-3 p-2 rounded-2xl"
              style={{ backgroundColor: '#F8FAFA', border: '1px solid #E0E0E0' }}
            >
              {/* Emoji Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">😊</span>
                </button>
                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div
                      className="absolute bottom-full left-0 mb-2 rounded-2xl shadow-xl border z-50 overflow-hidden animate-slide-up"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', width: '320px' }}
                    >
                      <div className="grid grid-cols-10 gap-0">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#E8F8F8] hover:scale-110 active:scale-95 transition-all"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-transparent border-none outline-none text-[#333333] placeholder:text-[#999999]"
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`btn-tiffany p-3 rounded-xl ${
                  !input.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
