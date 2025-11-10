import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, PlusSquare, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from './api/client';
import type { Message } from './api/client';
import { cn } from './lib/utils';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

const COMMON_EMOJIS = ['😊', '😂', '❤️', '👍', '🔥', '✨', '🎉', '💯', '🚀', '👏', '💪', '🙏', '🤔', '😍', '⭐', '💡', '🎯', '✅', '❌', '⚡'];

function App() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'New Conversation',
      messages: [
        {
          role: 'assistant',
          content: 'Good day! I\'m your personal secretary. I\'m here to assist you with database inquiries, latest news updates, employee policy guidance, sports information, travel arrangements, and I Ching divination. What can I help you with?',
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current session
  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 检查后端健康状态
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
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    setChatSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, title }
          : session
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

    // Update session title if it's the first user message
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
        content: `Sorry, I encountered an error: ${err.message}\n\nPlease make sure the backend service is running (\`npm run dev\` in project root).`,
        timestamp: new Date(),
      };

      updateCurrentSessionMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [
        {
          role: 'assistant',
          content: 'Good day! I\'m your personal secretary. I\'m here to assist you with database inquiries, latest news updates, employee policy guidance, sports information, travel arrangements, and I Ching divination. What can I help you with?',
          timestamp: new Date(),
        },
      ],
    };
    setChatSessions([newSession, ...chatSessions]);
    setCurrentSessionId(newSession.id);
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#FAFAFA', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-[280px] flex-shrink-0 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: '#1A1A1A', borderColor: '#333333' }}
      >
        <div className="h-full flex flex-col">
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end p-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex flex-col h-full p-5 space-y-3">
            {/* New Chat Button */}
            <button
              onClick={() => {
                handleNewChat();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ backgroundColor: '#2A2A2A', color: 'white', border: '1px solid #404040' }}
            >
              <PlusSquare className="w-5 h-5" />
              <span className="font-semibold text-base">New Chat</span>
            </button>

            {/* Features Section */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  What I Can Do
                </h3>

                {/* Feature Cards */}
                <div className="space-y-2">
                  {/* Database Analysis */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">📊</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Database Analysis</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Query MySQL databases and generate insights
                    </p>
                  </div>

                  {/* Trending News */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">📰</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Trending News</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Real-time updates from Weibo, Zhihu, Bilibili
                    </p>
                  </div>

                  {/* Sports Info */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">⚽</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Sports Data</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      NBA, NFL, MLB, NHL, CBA statistics
                    </p>
                  </div>

                  {/* Travel Arrangements */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">🚄</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Train Tickets</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      China Railway ticket search and planning
                    </p>
                  </div>

                  {/* Employee Policies */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">📖</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Policy Guidance</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      RAG-powered employee handbook assistant
                    </p>
                  </div>

                  {/* I Ching Divination */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">🔮</span>
                      <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>Fortune Telling</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      I Ching divination and hexagram interpretation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Profile */}
            <div className="mt-auto pt-4 border-t" style={{ borderColor: '#333333' }}>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#2A2A2A', border: '1px solid #404040' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4A4A4A' }}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Welcome back,</p>
                  <p className="text-base font-semibold truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>User</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b shadow-sm" style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6" style={{ color: '#1A1A1A' }} />
            </button>

            <div className="rounded-xl p-2 sm:p-3" style={{ backgroundColor: '#1A1A1A' }}>
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold" style={{ color: '#1A1A1A' }}>
                DataAnalyze Helper
              </h1>
              <div className="flex items-center space-x-2">
                <div
                  className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-red-500")}
                />
                <span className="text-xs sm:text-sm font-medium" style={{ color: '#6B7280' }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block text-base font-semibold" style={{ color: '#4B5563' }}>
            {currentSession?.title || 'New Conversation'}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 sm:gap-4 items-start",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: message.role === 'assistant' ? '#1A1A1A' : '#4A4A4A',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={cn("flex-1 max-w-2xl", message.role === 'user' && 'flex justify-end')}>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-3 sm:px-5 sm:py-4 shadow-sm",
                      message.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    )}
                    style={{
                      backgroundColor: message.role === 'user' ? '#1A1A1A' : '#FFFFFF',
                      border: message.role === 'user' ? 'none' : '1px solid #E5E7EB',
                    }}
                  >
                    <div
                      className={cn("prose prose-sm sm:prose-base max-w-none", message.role === 'user' && 'prose-invert')}
                      style={{ 
                        color: message.role === 'user' ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2 sm:gap-4 items-start">
                <div
                  className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: '#1A1A1A' }}
                >
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3 py-3 sm:px-5 sm:py-4 shadow-sm" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ color: '#4A4A4A' }} />
                    <span className="text-sm sm:text-base font-medium" style={{ color: '#6B7280' }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex gap-2 sm:gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#EF4444' }}>
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3 py-3 sm:px-5 sm:py-4 shadow-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                  <p className="text-sm sm:text-base font-semibold" style={{ color: '#DC2626' }}>Connection Error</p>
                  <p className="text-xs sm:text-[15px] mt-1" style={{ color: '#B91C1C' }}>{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t px-3 sm:px-6 py-3 sm:py-6" style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
            <div
              className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-5 sm:py-4 rounded-xl shadow-lg border-2 transition-all focus-within:border-gray-400"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
              }}
            >
              {/* Emoji Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Open emoji picker"
                >
                  <span className="text-xl sm:text-2xl leading-none" role="img" aria-label="emoji">😊</span>
                </button>

                {showEmojiPicker && (
                  <>
                    {/* Backdrop to close picker */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    
                    {/* Emoji Picker Popup */}
                    <div
                      className="absolute bottom-full left-0 mb-2 sm:mb-3 rounded-2xl shadow-2xl border z-50 animate-slide-up overflow-hidden"
                      style={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB',
                        width: 'min(320px, calc(100vw - 2rem))'
                      }}
                    >
                      <div className="grid grid-cols-8 gap-0">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-xl sm:text-2xl hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                            style={{ 
                              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                              backgroundColor: index === 5 ? '#E3F2FD' : '#FFFFFF'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a new message here..."
                className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base font-medium placeholder:font-normal"
                style={{ color: '#1F2937' }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 p-2 sm:p-3 rounded-lg transition-all",
                  !input.trim() || isLoading
                    ? "opacity-40 cursor-not-allowed bg-gray-200"
                    : "hover:scale-110 shadow-md active:scale-95"
                )}
                style={{
                  backgroundColor: input.trim() && !isLoading ? '#1A1A1A' : undefined,
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ color: '#4A4A4A' }} />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
