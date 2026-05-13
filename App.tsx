
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion, AnimatePresence } from 'motion/react';
import { Message, KnowledgeItem } from './types';
import { streamMessageWithSearch } from './services/geminiService';
import KnowledgeManager from './components/KnowledgeManager';
import { getFullKnowledge, saveKnowledge, removeKnowledge } from './services/storageService';
import { SYSTEM_DOCUMENTS } from './services/systemKnowledge';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [visualClickCount, setVisualClickCount] = useState(0);
  const clickCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Kiểm tra nếu đang ở chế độ nhúng (URL có ?embed=true)
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === 'true';

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior });
    }
  };

  // Improved scroll effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showScrollButton) {
        scrollToBottom(isStreaming ? 'auto' : 'smooth');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isStreaming]);

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
        // Ghép thêm tài liệu hệ thống nếu chưa có trong base
        const merged = [...stored];
        SYSTEM_DOCUMENTS.forEach(sysDoc => {
          if (!merged.find(m => m.id === sysDoc.id)) {
            merged.push(sysDoc as KnowledgeItem);
          }
        });
        setKnowledgeBase(merged);
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const currentInput = input;
    const userMsg: Message = {
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    const modelMsg: Message = {
      role: 'model',
      content: '',
      timestamp: new Date()
    };

    // Update messages in a single state change to avoid race conditions
    setMessages(prev => [...prev, userMsg, modelMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Use the functional update history for the service call as well
      const conversationHistory = [...messages, userMsg];

      const result = await streamMessageWithSearch(
        conversationHistory, 
        knowledgeBase,
        (chunkText) => {
          if (!chunkText) return;
          setMessages(prev => {
            if (prev.length === 0) return prev;
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            if (newMsgs[lastIdx].role === 'model') {
              newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: chunkText };
            }
            return newMsgs;
          });
        },
        controller.signal
      );
      
      if (!controller.signal.aborted) {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (newMsgs[lastIdx].role === 'model') {
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], sources: result.sources };
          }
          return newMsgs;
        });
      }

    } catch (err) {
      if ((err as any).name === 'AbortError') {
        console.log("Stream aborted");
      } else {
        console.error("Chat Error:", err);
        const isKeyMissing = (err as any).message === "API_KEY_MISSING";
        
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (newMsgs[lastIdx].role === 'model') {
            newMsgs[lastIdx] = { 
              ...newMsgs[lastIdx], 
              content: isKeyMissing 
                ? "⚠️ **Lỗi triển khai:** Bạn chưa cấu hình mã API Gemini trên Vercel/Cloudflare. Vui lòng thêm biến môi trường `GEMINI_API_KEY` vào cài đặt của trang web và thử lại."
                : "🔴 Rất tiếc, tôi đang gặp gián đoạn kỹ thuật. Vui lòng thử lại sau giây lát hoặc làm mới trang." 
            };
          }
          return newMsgs;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // ... UI layout update below


  return (
    <div id="app-root" className={`flex flex-col lg:flex-row h-screen h-[100dvh] overflow-hidden font-sans relative ${isEmbedded ? 'bg-white' : 'bg-[#f8fafc]'}`}>
      
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

      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-300 ${isAdminMode && isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`fixed inset-y-0 left-0 transform ${isAdminMode && isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-all duration-300 ease-out z-[100] ${isAdminMode ? 'w-[280px] sm:w-80' : 'w-0 overflow-hidden'} flex-shrink-0 shadow-2xl lg:shadow-none border-r border-slate-200 bg-white`}>
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

      <main id="chat-main" className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
        {!isEmbedded && (
          <header className="h-14 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-none z-50 shadow-sm">
            <div className="flex items-center gap-3">
              <div 
                id="app-logo"
                className="flex items-center gap-3 cursor-pointer select-none group" 
                onClick={handleLogoClick}
              >
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all duration-500 transform ${
                    visualClickCount > 0 
                      ? 'bg-red-600 rotate-12 scale-110 shadow-xl' 
                      : 'bg-red-600 shadow-sm shadow-red-200'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.98 0 01-2.343 5.657z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-sm md:text-base font-display font-black tracking-tight text-slate-900 leading-none">PCCC PHÚ THỌ <span className="text-red-600">AI</span></h1>
                  <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest hidden md:block">TƯ VẤN PHÁP LUẬT (Ver 2.5)</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                id="clear-history-btn"
                onClick={clearHistory}
                title="Làm mới cuộc hội thoại"
                className="flex items-center gap-2 px-2.5 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-[10px] font-bold border border-transparent hover:border-red-100 uppercase tracking-tight"
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

        <section 
          id="chat-history" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4 md:px-6 space-y-4 scrollbar-hide bg-slate-50/50 relative"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <motion.div 
                key={`msg-${idx}`} 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[95%] md:max-w-[85%]`}>
                  <div className={`p-4 md:p-5 rounded-2xl shadow-sm border transition-all ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 border-slate-700 text-white rounded-tr-none' 
                      : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    <div className={`markdown-body max-w-none text-[13.5px] md:text-[14.5px] leading-relaxed ${msg.role === 'user' ? 'prose-invert font-medium' : 'prose-slate'}`}>
                      {(!msg.content && msg.role === 'model' && isStreaming && idx === messages.length - 1) ? (
                        <div className="flex gap-1.5 py-1.5">
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-150" />
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-300" />
                        </div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.content || ""}
                        </ReactMarkdown>
                      )}
                    </div>
                    

                  </div>
                  
                  <div className={`mt-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {msg.role === 'model' && (
                      <div className="flex items-center gap-1.5 opacity-80">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.3)]"></div>
                        <span className="text-red-700 font-black">AI PCCC PHÚ THỌ</span>
                      </div>
                    )}
                    <span className="tabular-nums opacity-60 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="h-4 w-full" />
          </div>

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={() => scrollToBottom('smooth')}
                className="fixed bottom-24 right-6 md:right-10 w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-lg text-slate-600 hover:text-red-600 hover:border-red-100 transition-all z-50 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </section>

        <footer id="chat-input-area" className="flex-none p-2 md:p-3 bg-white border-t border-slate-200 z-40">
          <div className="max-w-4xl mx-auto">
            <div className={`relative flex items-center bg-white border border-slate-300 rounded-[1.25rem] p-1 pr-1 shadow-sm focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-50 transition-all ${isStreaming ? 'opacity-70' : ''}`}>
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
                placeholder="Hỏi về PCCC..."
                rows={1}
                className="flex-1 bg-transparent px-3 py-2 text-[14px] outline-none resize-none max-h-48 scrollbar-hide text-slate-800 placeholder:text-slate-400 font-medium"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  id="stop-generation-btn"
                  onClick={handleStop}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95 transition-all flex-shrink-0"
                  title="Dừng tạo câu trả lời"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="6" y="6" width="8" height="8" />
                  </svg>
                </button>
              ) : (
                <button
                  id="send-message-btn"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                    !input.trim() ? 'bg-slate-100 text-slate-300' : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200 active:scale-95'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-1 px-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center sm:text-left opacity-60">© Đại úy Phạm Tùng Linh - PC07 Phú Thọ</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
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
