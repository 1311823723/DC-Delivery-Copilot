
import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Database,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  XCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { KnowledgeItem } from '../../types';

// 将默认数据提取为常量，仅在本地存储为空时使用
const DEFAULT_DOCUMENTS: KnowledgeItem[] = [
  { id: '1', name: 'SOFA网关接口规范_V2.0.pdf', size: '2.4 MB', date: '2026-01-15', status: 'vectorized' },
  { id: '2', name: '核心系统记账规则_V1.3.docx', size: '5.1 MB', date: '2026-01-16', status: 'vectorized' },
  { id: '3', name: '渤海银行特色业务说明.txt', size: '12 KB', date: '2026-01-18', status: 'processing' },
  { id: '4', name: 'Linux常用排查命令手册.md', size: '45 KB', date: '2026-01-18', status: 'vectorized' },
  { id: '5', name: '生产环境发版Checklist_V4.xlsx', size: '28 KB', date: '2026-01-19', status: 'vectorized' },
  { id: '6', name: 'Docker容器化部署最佳实践.pdf', size: '3.8 MB', date: '2026-01-20', status: 'vectorized' },
  { id: '7', name: '前端React组件库文档.md', size: '156 KB', date: '2026-01-20', status: 'processing' },
];

const KnowledgeBase: React.FC = () => {
  // 初始化时优先从 localStorage 读取数据
  const [documents, setDocuments] = useState<KnowledgeItem[]>(() => {
    try {
      const saved = localStorage.getItem('dc_knowledge_base');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 如果页面刷新时有文件处于 processing 状态，自动将其标记为 vectorized (模拟处理完成)，防止永久卡死在处理中
        return parsed.map((doc: KnowledgeItem) =>
          doc.status === 'processing' ? { ...doc, status: 'vectorized' } : doc
        );
      }
    } catch (e) {
      console.error("Failed to load knowledge base from local storage", e);
    }
    return DEFAULT_DOCUMENTS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 监听 documents 变化并持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('dc_knowledge_base', JSON.stringify(documents));
  }, [documents]);

  // 修改每页显示数量为 4
  const itemsPerPage = 4;

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newDoc: KnowledgeItem = {
        id: Date.now().toString(),
        name: file.name,
        size: formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0],
        status: 'processing',
      };

      setDocuments(prev => [newDoc, ...prev]);

      // 模拟向量化过程：3秒后变为已完成
      setTimeout(() => {
        setDocuments(prev =>
          prev.map(doc => doc.id === newDoc.id ? { ...doc, status: 'vectorized' } : doc)
        );
      }, 3000);

      // 重置 input 以便再次上传同名文件
      event.target.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // 处理删除
  const handleDelete = (id: string) => {
    if (confirm('确认删除此知识库文档吗？删除后将无法作为 AI 参考依据。')) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      // 删除后，如果当前页已经没有数据了（且不是第一页），需要修正页码
      setTimeout(() => {
        setDocuments(currentDocs => {
           const currentFiltered = currentDocs.filter(doc =>
             doc.name.toLowerCase().includes(searchQuery.toLowerCase())
           );
           const maxPage = Math.ceil(currentFiltered.length / itemsPerPage) || 1;
           if (currentPage > maxPage) {
             setCurrentPage(maxPage);
           }
           return currentDocs;
        });
      }, 0);
    }
  };

  // 处理重置
  const handleReset = () => {
    if (confirm('确定要重置知识库吗？\n\n这将清除您本地所有上传/删除的操作记录，并恢复到系统初始演示数据。')) {
      localStorage.removeItem('dc_knowledge_base');
      setDocuments(DEFAULT_DOCUMENTS);
      setCurrentPage(1);
      setSearchQuery('');
    }
  };

  // 过滤逻辑
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 分页逻辑
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  // 边界检查：如果当前页超过总页数（例如删除了数据或搜索结果变少），重置为第一页或最后一页
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">交付知识库资产</h2>
            <p className="text-slate-400 text-sm font-medium mt-0.5">管理 AI 的知识来源，包含项目文档、接口规范、历史故障库。</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Reset Button */}
           <button
             onClick={handleReset}
             className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
             title="重置为默认演示数据"
           >
             <RotateCcw className="w-5 h-5" />
           </button>

           {/* 搜索框 */}
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="搜索文档名称..."
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-64 transition-all shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleTriggerUpload}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" /> 上传新文档
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">文档名称</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">大小</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">上传时间</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">处理状态</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-blue-50/20 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-400 tracking-tighter">{doc.size}</td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-400 tracking-tighter">{doc.date}</td>
                    <td className="px-8 py-5">
                      {doc.status === 'vectorized' ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已向量化
                        </span>
                      ) : doc.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5 animate-spin" /> 处理中
                        </span>
                      ) : (
                         <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest">
                          <AlertCircle className="w-3.5 h-3.5" /> 错误
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="删除文档"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Search className="w-8 h-8 opacity-20" />
                       <span className="text-sm font-medium">未找到匹配的文档</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
             显示 {paginatedDocuments.length > 0 ? startIndex + 1 : 0} 至 {startIndex + paginatedDocuments.length} 项，共 {filteredDocuments.length} 项文档
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="px-2 py-1 text-slate-400 bg-white border border-slate-100 rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    safeCurrentPage === page 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="px-2 py-1 text-slate-400 bg-white border border-slate-100 rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vector DB Status */}
      <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center gap-4">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight leading-none">向量数据库连接正常</p>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Current Connection: ChromaDB (Local Cluster)</p>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
