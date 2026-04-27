
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
              content: 'Xin chào! Tôi là trợ lý AI về PCCC và CNCH do **Đại úy Phạm Tùng Linh - Phòng PC07 Phú Thọ** phát triển. Hãy đặt câu hỏi để tôi trả lời!',
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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8-0v4h8z" />
                  </svg>
                </div>
                <h2 id="admin-portal-title" className="text-2xl font-black text-slate-800 tracking-tight">Cổng Quản Trị</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">Nhập mật mã để tiếp tục</p>
              </div>
              
              <input 
                autoFocus
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()}
                className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all text-center text-xl font-bold tracking-[0.5em] placeholder:text-slate-300 placeholder:tracking-normal"
                placeholder="Mật mã"
              />
              
              <div className="flex gap-4 mt-8">
                <button 
                  id="cancel-admin-btn"
                  onClick={() => { setShowPasswordOverlay(false); setAdminPassword(''); }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button 
                  id="confirm-admin-btn"
                  onClick={verifyAdmin}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-xl shadow-red-200 transition-all active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 transform ${isAdminMode && isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-all duration-500 ease-in-out z-[100] ${isAdminMode ? 'w-80 lg:w-[420px]' : 'w-0 overflow-hidden'} flex-shrink-0 shadow-2xl border-r border-slate-200`}>
        <div className="h-full flex flex-col bg-white">
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
          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
            <button 
              id="copy-embed-btn"
              onClick={copyEmbedCode}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border border-slate-200 flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Mã nhúng Iframe
            </button>
            <button 
              id="close-admin-btn"
              onClick={() => { setIsAdminMode(false); setIsSidebarOpen(false); }}
              className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
            >
              Thoát Quản trị
            </button>
          </div>
        </div>
      </div>

      <main id="chat-main" className={`flex-1 flex flex-col min-w-0 bg-slate-50 relative ${isEmbedded ? 'h-full' : ''}`}>
        {!isEmbedded && (
          <header className="bg-white/95 backdrop-blur-2xl border-b border-slate-200 px-3 py-0.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <div 
                id="app-logo"
                className="flex items-center gap-2 cursor-pointer select-none group relative p-0.5 rounded-xl active:scale-95 transition-transform" 
                onClick={handleLogoClick}
              >
                <div className="relative">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                    visualClickCount > 0 
                      ? 'bg-red-600 scale-110 ring-4 ring-red-100' 
                      : 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-200'
                  }`}>
                    {/* Fire Badge Icon */}
                    <div className="relative">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.98 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-bold text-slate-800 text-[11px] tracking-tight leading-none font-display uppercase">TRỢ LÝ PCCC</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                id="clear-history-btn"
                onClick={clearHistory}
                title="Xóa lịch sử"
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {isAdminMode && (
                <div id="admin-badge" className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.3)]"></span>
                  ADMIN
                </div>
              )}
              <button 
                id="toggle-sidebar-btn"
                onClick={() => isAdminMode && setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-xl transition-all ${isAdminMode ? 'hover:bg-slate-100 text-slate-600' : 'text-transparent cursor-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </header>
        )}

        <section id="chat-history" className={`flex-1 overflow-y-auto px-3 py-4 md:px-8 space-y-4 scrollbar-hide bg-slate-50`}>
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <motion.div 
                key={`msg-${idx}`} 
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                  scale: { type: "spring", damping: 20, stiffness: 250 }
                }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`group relative max-w-[94%] md:max-w-[90%] rounded-2xl p-3 md:p-4 transition-all ${
                  msg.role === 'user' 
                    ? 'bg-sky-50 border border-sky-100 text-slate-800 rounded-tr-none shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                }`}>
                  <div className={`markdown-body max-w-none prose prose-p:my-1 prose-sm ${msg.role === 'user' ? 'opacity-95 text-[13px]' : 'prose-slate text-[14px]'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (msg.role === 'model' && isStreaming && idx === messages.length - 1 ? "..." : "")}
                    </ReactMarkdown>
                  </div>
                  
                  <div className={`mt-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>}
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {msg.role === 'user' ? 'CÔNG DÂN' : 'PCCC'}
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
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1.5">
                        <motion.div 
                          animate={{ scale: [1, 1.3, 1] }} 
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-sm"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.3, 1] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-1.5 h-1.5 bg-red-600 rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.3, 1] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-1.5 h-1.5 bg-red-600 rounded-full"
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-display">Đang truy vấn...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </section>

        <footer id="chat-input-area" className={`p-1.5 md:p-2 bg-white/80 backdrop-blur-2xl border-t border-slate-100 sticky bottom-0`}>
          <div className="max-w-4xl mx-auto">
            <div className={`relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-0.5 pl-4 focus-within:border-red-500 shadow-sm transition-all ${isStreaming ? 'opacity-50' : 'hover:border-slate-300'}`}>
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
                placeholder="Câu hỏi PCCC..."
                rows={1}
                className="flex-1 resize-none border-none focus:ring-0 text-slate-800 text-[13px] py-1.5 bg-transparent max-h-24 font-medium placeholder:text-slate-400"
                disabled={isStreaming}
              />
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  !input.trim() || isStreaming ? 'bg-slate-100 text-slate-300' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-95'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            
            <div className="mt-1 flex items-center justify-between px-2">
              <div className="flex gap-3">
                 <div className="flex items-center gap-1">
                   <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">Dữ liệu PC07</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">Tùng Linh - Phú Thọ</span>
                 </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
