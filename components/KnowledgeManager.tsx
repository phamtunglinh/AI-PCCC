
import React, { useState } from 'react';
import { KnowledgeItem } from '../types';

interface KnowledgeManagerProps {
  onAdd: (item: KnowledgeItem) => void;
  knowledgeBase: KnowledgeItem[];
  onDelete: (id: string) => void;
}

const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({ onAdd, knowledgeBase, onDelete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const processFile = async (file: File) => {
    if (file.size === 0) return;
    setIsUploading(true);
    setUploadProgress('Đang xử lý...');
    
    try {
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith('.pdf')) {
        const base64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve((r.result as string).split(',')[1]);
          r.readAsDataURL(file);
        });
        
        onAdd({ 
          id: Math.random().toString(36).substr(2, 9), 
          title: file.name, 
          content: '', 
          fileData: base64, 
          mimeType: 'application/pdf', 
          size: file.size 
        });
      } else if (fileNameLower.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        // @ts-ignore
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        onAdd({ 
          id: Math.random().toString(36).substr(2, 9), 
          title: file.name, 
          content: result.value, 
          mimeType: 'text/plain', 
          size: file.size 
        });
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi nạp tài liệu.");
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredKnowledge = knowledgeBase.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden shadow-2xl">
      <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-white/5">
        <h2 className="font-black flex items-center gap-3 text-xl uppercase tracking-tighter">
          <div className="p-2 bg-red-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          Thư viện Pháp quy
        </h2>
        <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-[0.2em]">Quản lý kho dữ liệu chuyên môn</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {/* Upload Area */}
        <label className={`relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isUploading ? 'bg-slate-800/50 border-red-500/50 animate-pulse' : 'bg-slate-800/30 border-slate-700 hover:border-red-500 hover:bg-slate-800/50'
        }`}>
          <input type="file" className="hidden" accept=".pdf,.docx" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={isUploading} />
          <div className="text-center">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">{uploadProgress}</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-bold block">Thêm tài liệu mới</span>
                <span className="text-[10px] text-slate-500 mt-1 block font-medium">PDF hoặc Word (Không giới hạn số lượng)</span>
              </>
            )}
          </div>
        </label>

        {/* Search & List */}
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text"
              placeholder="Tìm nhanh tài liệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Danh mục tài liệu ({knowledgeBase.length})</h3>
            </div>
            
            {filteredKnowledge.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight italic">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Thư viện đang trống'}
                </p>
              </div>
            )}

            {filteredKnowledge.map(item => (
              <div key={item.id} className="group flex items-center gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700 hover:border-red-500/30 transition-all hover:bg-slate-800/60">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.mimeType === 'application/pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate text-slate-200">{item.title}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{formatSize(item.size)} • PDF Pháp quy</p>
                </div>
                <button 
                  onClick={() => onDelete(item.id)} 
                  className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Xóa tài liệu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-slate-950/40 border-t border-slate-800">
         <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">Ghi chú vận hành</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Trợ lý ảo sẽ tự động tổng hợp thông tin từ tất cả tài liệu bạn nạp ở trên để trả lời công dân. Hãy nạp các file PDF mới nhất của Luật PCCC.
            </p>
         </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;
