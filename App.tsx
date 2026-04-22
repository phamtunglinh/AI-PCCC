
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Message, KnowledgeItem } from './types';
import { streamMessageWithSearch } from './services/geminiService';
import KnowledgeManager from './components/KnowledgeManager';
import { getFullKnowledge, saveKnowledge, removeKnowledge } from './services/storageService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Chào mừng bạn đến với **Hệ thống Trợ lý ảo PCCC Phú Thọ**. 🛡️\n\nTôi đã được nạp đầy đủ các văn bản pháp quy mới nhất và sẵn sàng hỗ trợ bạn giải đáp các thủ tục, quy định về an toàn cháy nổ.\n\nBạn cần tôi tư vấn vấn đề gì?',
      timestamp: new Date()
    }
  ]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [input, setInput] = useState('');
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

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const stored = await getFullKnowledge();
        setKnowledgeBase(stored);
        if (stored.length > 0) {
          setMessages([{
            role: 'model',
            content: `Hệ thống đã sẵn sàng với **${stored.length} tài liệu chuyên sâu** về PCCC được nạp sẵn. 📚\n\nBạn muốn tra cứu quy định hay thủ tục nào?`,
            timestamp: new Date()
          }]);
        }
      } catch (e) {
        console.error("Storage load error:", e);
      }
    };
    loadStoredData();
  }, []);

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

      <div className={`fixed inset-y-0 left-0 transform ${isAdminMode && isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-all duration-500 ease-in-out z-[100] ${isAdminMode ? 'w-80 lg:w-[400px]' : 'w-0 overflow-hidden'} flex-shrink-0 shadow-2xl border-r border-slate-200`}>
        <div className="h-full flex flex-col bg-slate-900">
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
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
            <button 
              id="copy-embed-btn"
              onClick={copyEmbedCode}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Lấy mã nhúng Iframe
            </button>
            <button 
              id="close-admin-btn"
              onClick={() => { setIsAdminMode(false); setIsSidebarOpen(false); }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg"
            >
              Đóng Quản trị
            </button>
          </div>
        </div>
      </div>

      <main id="chat-main" className={`flex-1 flex flex-col min-w-0 bg-white relative ${isEmbedded ? 'h-full' : ''}`}>
        {!isEmbedded && (
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-5">
              <div 
                id="app-logo"
                className="flex items-center gap-4 cursor-pointer select-none group relative p-1 rounded-2xl active:scale-95 transition-transform" 
                onClick={handleLogoClick}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-200 ${
                    visualClickCount > 0 
                      ? 'bg-red-500 scale-110 ring-4 ring-red-100' 
                      : 'bg-gradient-to-tr from-red-600 to-orange-500 ring-4 ring-red-50'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.98 0 01-2.343 5.657z" />
                    </svg>
                  </div>
                  {visualClickCount >= 3 && (
                    <div className="absolute -top-6 left-0 text-[10px] font-black text-red-600 animate-bounce uppercase whitespace-nowrap">
                      Admin? ({visualClickCount}/5)
                    </div>
                  )}
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-black text-slate-800 text-lg md:text-xl tracking-tight leading-none">AI PCCC PHÚ THỌ</h1>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Hệ thống trực tuyến
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {isAdminMode && (
                <div id="admin-badge" className="hidden md:block px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">
                  Chế độ quản trị
                </div>
              )}
              <button 
                id="toggle-sidebar-btn"
                onClick={() => isAdminMode && setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-xl transition-colors ${isAdminMode ? 'hover:bg-slate-100 text-slate-600' : 'text-transparent cursor-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </header>
        )}

        <section id="chat-history" className={`flex-1 overflow-y-auto px-4 py-8 md:px-10 space-y-8 scrollbar-hide ${isEmbedded ? 'bg-white' : 'bg-gradient-to-b from-white to-slate-50/50'}`}>
          <div className="max-w-4xl mx-auto space-y-10">
            {messages.map((msg, idx) => (
              <motion.div 
                key={`msg-${idx}`} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`group relative max-w-[95%] md:max-w-[85%] rounded-[2rem] p-5 md:p-7 shadow-sm border transition-all ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 border-slate-800 text-white rounded-tr-none shadow-xl' 
                    : 'bg-white border-slate-200 text-slate-800 rounded-tl-none ring-1 ring-slate-100'
                }`}>
                  <div className={`markdown-body max-w-none prose prose-p:my-1 prose-headings:my-2 ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (msg.role === 'model' && isStreaming && idx === messages.length - 1 ? "..." : "")}
                    </ReactMarkdown>
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100/10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Nguồn trích lục
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, sIdx) => (
                          <span 
                            key={`source-${sIdx}`}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold ${
                              msg.role === 'user' ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {msg.role === 'user' ? 'Công dân' : 'Trợ lý ảo'}
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
                  <div className="bg-white border border-slate-200 rounded-[2rem] rounded-tl-none p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-1.5">
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }} 
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-2 h-2 bg-red-600 rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-2 h-2 bg-red-600 rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-2 h-2 bg-red-600 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trợ lý đang phản hồi...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </section>

        <footer id="chat-input-area" className={`p-4 md:p-8 border-t border-slate-100 bg-white/80 backdrop-blur-md sticky bottom-0`}>
          <div className="max-w-4xl mx-auto">
            <div className={`relative flex items-center gap-3 bg-white border-2 border-slate-200 rounded-[2rem] p-1.5 pl-6 focus-within:border-red-600 shadow-xl transition-all ${isStreaming ? 'opacity-50' : 'hover:border-slate-300'}`}>
              <textarea
                id="user-input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập câu hỏi pháp lý PCCC tại đây..."
                rows={1}
                className="flex-1 resize-none border-none focus:ring-0 text-sm md:text-[16px] py-3 bg-transparent max-h-32 font-medium"
                disabled={isStreaming}
              />
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  !input.trim() || isStreaming ? 'bg-slate-100 text-slate-300' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg active:scale-90'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-45" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Câu trả lời dựa trên kho văn bản pháp luật hiện hành
              </p>
            </div>
            {isEmbedded && (
              <div className="text-center mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cung cấp bởi AI PCCC Phú Thọ</p>
              </div>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
