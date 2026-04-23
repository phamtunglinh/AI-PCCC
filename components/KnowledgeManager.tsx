
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

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size === 0) continue;
        
        setUploadProgress(`Đang xử lý ${i + 1}/${files.length}: ${file.name}`);
        
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
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi nạp một số tài liệu.");
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredKnowledge = knowledgeBase.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 overflow-hidden shadow-2xl">
      <div className="p-8 bg-slate-50 border-b border-slate-100">
        <h2 className="font-bold flex items-center gap-4 text-2xl tracking-tighter font-display text-slate-900">
          <div className="p-2.5 bg-red-600 rounded-2xl shadow-lg shadow-red-100 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          THƯ VIỆN PHÁP QUY
        </h2>
        <p className="text-[10px] text-slate-400 font-black mt-4 uppercase tracking-[0.3em]">Hệ thống quản lý dữ liệu số</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        <label 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative group flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer ${
          isUploading ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-200 hover:border-red-500 hover:bg-red-50/50'
        }`}>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.docx" 
            multiple 
            onChange={(e) => e.target.files && processFiles(e.target.files)} 
            disabled={isUploading} 
          />
          <div className="text-center group-active:scale-95 transition-transform">
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-black text-red-600 uppercase tracking-widest">{uploadProgress}</span>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-white text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:bg-red-600 group-hover:text-white transition-all shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-bold block text-slate-700 uppercase">Nạp tài liệu mới</span>
                <span className="text-[10px] text-slate-400 mt-2 block font-black uppercase tracking-wider">Hỗ trợ PDF & DOCX</span>
              </>
            )}
          </div>
        </label>

        <div className="space-y-6">
          <div className="relative group">
            <input 
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-sm focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all outline-none placeholder:text-slate-400"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-4 text-slate-400 group-focus-within:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DANH MỤC LƯU TRỮ ({knowledgeBase.length})</h3>
            </div>
            
            {filteredKnowledge.length === 0 && (
              <div className="text-center py-20 px-6 rounded-[2rem] border border-slate-100 bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest italic">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
                </p>
              </div>
            )}

            <div className="grid gap-3">
              {filteredKnowledge.map(item => (
                <div key={item.id} className="group relative flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 hover:border-red-200 transition-all hover:bg-slate-50 shadow-sm overflow-hidden">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.mimeType === 'application/pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-slate-800 uppercase tracking-tight">{item.title}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">{formatSize(item.size)} • CƠ SỞ DỮ LIỆU</p>
                  </div>
                  <button 
                    onClick={() => onDelete(item.id)} 
                    className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-slate-50 rounded-xl hover:bg-red-50"
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
      </div>
      
      <div className="p-8 bg-slate-50 border-t border-slate-100">
         <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.4)]"></span>
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">Hướng dẫn quản trị</p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              Các văn bản được cập nhật sẽ ngay lập tức được Trợ lý AI học và sử dụng để trả lời các thắc mắc của người dân.
            </p>
         </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;
