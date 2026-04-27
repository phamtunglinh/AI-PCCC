
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Message, KnowledgeItem } from './types';
import { streamMessageWithSearch } from './services/geminiService';
import KnowledgeManager from './components/KnowledgeManager';
import { getFullKnowledge, saveKnowledge, removeKnowledge } from './services/storageService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [visualClickCount, setVisualClickCount] = useState(0);
  const clickCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Kiểm tra nếu đang ở chế độ nhúng (URL có ?embed=true)
  const isEmbedded = new URLSearchParams(window.location.search).get('embed') === 'true';

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load knowledge and messages
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Load chat history
        const savedMsgs = sessionStorage.getItem('pccc_chat_messages');
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(parsed);
        } else {
          setMessages([
            {
              role: 'model',
              content: 'Xin chào! Tôi là **Chatbot AI về PCCC - Phạm Tùng Linh PC07 Phú Thọ**. Hãy đặt câu hỏi để tôi trả lời!',
              timestamp: new Date()
            }
          ]);
        }

        const stored = await getFullKnowledge();
        setKnowledgeBase(stored);
      } catch (e) {
        console.error("Storage load error:", e);
      }
    };
    loadStoredData();
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('pccc_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const clearHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?")) {
      const initialMsg = {
        role: 'model' as const,
        content: 'Lịch sử đã được xóa. Tôi có thể giúp gì tiếp cho bạn?',
        timestamp: new Date()
      };
      setMessages([initialMsg]);
      sessionStorage.setItem('pccc_chat_messages', JSON.stringify([initialMsg]));
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isEmbedded) return;
    e.stopPropagation();
    clickCountRef.current += 1;
    setVisualClickCount(clickCountRef.current);
    
    if (timerRef.current) clearTimeout(timerRef.current);

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      setVisualClickCount(0);
      setShowPasswordOverlay(true);
    } else {
      timerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        setVisualClickCount(0);
      }, 4000);
    }
  };

  const verifyAdmin = () => {
    if (adminPassword === "adminPCCC") {
      setIsAdminMode(true);
      setIsSidebarOpen(true);
      setShowPasswordOverlay(false);
      setAdminPassword('');
    } else {
      alert("Mật mã không chính xác!");
      setAdminPassword('');
    }
  };

  const copyEmbedCode = () => {
    const currentUrl = window.location.href.split('?')[0];
    const embedCode = `<iframe src="${currentUrl}?embed=true" width="100%" height="700px" frameborder="0" style="border:1px solid #e2e8f0; border-radius:12px;"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    alert("Đã sao chép mã nhúng vào bộ nhớ tạm!");
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const currentInput = input;
    const userMsg: Message = {
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const modelMsg: Message = {
      role: 'model',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      const result = await streamMessageWithSearch(
        [...messages, userMsg], 
        knowledgeBase,
        (chunkText) => {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = chunkText;
            return newMsgs;
          });
        }
      );
      
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].sources = result.sources;
        return newMsgs;
      });

    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "Xin lỗi, tôi gặp chút gián đoạn. Vui lòng thử lại sau.";
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div id="app-root" className={`flex h-screen overflow-hidden font-sans relative ${isEmbedded ? 'bg-white' : 'bg-[#f8fafc]'}`}>
      
      <AnimatePresence>
        {showPasswordOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8-0v4h8z" />
                  </svg>
                </div>
                <h2 id="admin-portal-title" className="text-xl font-bold text-slate-900 tracking-tight">Cổng Quản Trị</h2>
                <p className="text-sm text-slate-500 mt-1">Xác thực quyền hạn để chỉnh sửa dữ liệu</p>
              </div>
              
              <input 
                autoFocus
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-600 focus:ring-4 focus:ring-red-50 outline-none transition-all text-center text-lg font-bold tracking-[0.5em] placeholder:text-slate-300 placeholder:tracking-normal"
                placeholder="••••••"
              />
              
              <div className="flex gap-3 mt-6">
                <button 
                  id="cancel-admin-btn"
                  onClick={() => { setShowPasswordOverlay(false); setAdminPassword(''); }}
                  className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-all active:scale-95 text-sm"
                >
                  Hủy bỏ
                </button>
                <button 
                  id="confirm-admin-btn"
                  onClick={verifyAdmin}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-200 transition-all active:scale-95 text-sm"
                >
                  Đăng nhập
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 transform ${isAdminMode && isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-all duration-300 ease-out z-[100] ${isAdminMode ? 'w-80 lg:w-[400px]' : 'w-0 overflow-hidden'} flex-shrink-0 shadow-xl border-r border-slate-200 bg-white`}>
        <div className="h-full flex flex-col">
          <KnowledgeManager 
            onAdd={(item) => {
              setKnowledgeBase(prev => [...prev, item]);
              saveKnowledge(item);
            }} 
            knowledgeBase={knowledgeBase} 
            onDelete={(id) => {
              setKnowledgeBase(prev => prev.filter(i => i.id !== id));
              removeKnowledge(id);
            }} 
          />
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <button 
              id="copy-embed-btn"
              onClick={copyEmbedCode}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border border-slate-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Sử dụng mã nhúng
            </button>
            <button 
              id="close-admin-btn"
              onClick={() => { setIsAdminMode(false); setIsSidebarOpen(false); }}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
            >
              Thoát Quản trị
            </button>
          </div>
        </div>
      </div>

      <main id="chat-main" className={`flex-1 flex flex-col min-w-0 bg-[#fdfdfd] relative ${isEmbedded ? 'h-full' : ''}`}>
        {!isEmbedded && (
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <div 
                id="app-logo"
                className="flex items-center gap-3 cursor-pointer select-none group" 
                onClick={handleLogoClick}
              >
                <div className="relative">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all duration-300 ${
                    visualClickCount > 0 
                      ? 'bg-red-600 scale-105' 
                      : 'bg-red-600 shadow-md shadow-red-100'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.98 0 01-2.343 5.657z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-tight uppercase font-display">CHATBOT AI PCCC (ver 2) - Phạm Tùng Linh PC07</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                id="clear-history-btn"
                onClick={clearHistory}
                title="Làm mới cuộc hội thoại"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-[11px] font-semibold border border-transparent hover:border-red-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              
              {isAdminMode && (
                <button 
                  id="toggle-sidebar-btn"
                  onClick={() => isAdminMode && setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
            </div>
          </header>
        )}

        <section id="chat-history" className="flex-1 overflow-y-auto px-4 py-8 md:px-12 space-y-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((msg, idx) => (
              <motion.div 
                key={`msg-${idx}`} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[92%] md:max-w-[85%] rounded-[1.5rem] p-5 transition-all msg-bubble-shadow ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-white border border-slate-100 text-slate-900 rounded-bl-none'
                }`}>
                  <div className={`markdown-body max-w-none text-[15px] leading-relaxed ${msg.role === 'user' ? 'prose-invert font-semibold' : 'prose-slate'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (msg.role === 'model' && isStreaming && idx === messages.length - 1 ? "..." : "")}
                    </ReactMarkdown>
                  </div>
                  
                  <div className={`mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-slate-400 justify-end' : 'text-slate-400'}`}>
                    {msg.role === 'model' && (
                      <div className="flex gap-1.5 mr-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-slate-500">Chat bot AI</span>
                      </div>
                    )}
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            <AnimatePresence>
              {isStreaming && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1.5">
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }} 
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-1.5 h-1.5 bg-red-500 rounded-full"
                        />
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }} 
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                          className="w-1.5 h-1.5 bg-red-500 rounded-full"
                        />
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }} 
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
                          className="w-1.5 h-1.5 bg-red-500 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang kiểm chứng pháp lý...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </section>

        <footer id="chat-input-area" className="p-3 md:p-4 bg-gradient-to-t from-white via-white/95 to-transparent sticky bottom-0">
          <div className="max-w-3xl mx-auto">
            <div className={`relative flex items-center bg-white border border-slate-200 rounded-[2rem] p-1.5 pr-1.5 shadow-lg focus-within:border-red-600 transition-all ${isStreaming ? 'opacity-70' : 'hover:border-slate-300'}`}>
              <textarea
                id="user-input-box"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập câu hỏi cần tư vấn về PCCC..."
                rows={1}
                className="flex-1 resize-none border-none focus:ring-0 text-slate-900 text-[14px] md:text-[15px] py-1.5 pl-4 pr-1 bg-transparent max-h-32 font-medium placeholder:text-slate-400"
                disabled={isStreaming}
              />
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  !input.trim() || isStreaming ? 'bg-slate-100 text-slate-300' : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-100 active:scale-95'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            
            <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 px-4">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center sm:text-left">Bản quyền thuộc về Đại úy Phạm Tùng Linh - PC07 Phú Thọ</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hệ thống sẵn sàng</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
