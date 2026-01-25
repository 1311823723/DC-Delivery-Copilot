
import React, { useState, useEffect } from 'react';
import Sidebar from './src/components/Layout/Sidebar';
import FaultDiagnosis from './src/pages/FaultDiagnosis';
import BusinessAnalysis from './src/pages/BusinessAnalysis';
import KnowledgeBase from './src/pages/KnowledgeBase';
import NewcomerGuide from './src/pages/NewcomerGuide';
import { AppTab, ModelConfig } from './types';
import { AI_CONFIG } from './src/services/aiService';
import { HelpCircle, Bell, User } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.NEWCOMER);
  const [currentModelName, setCurrentModelName] = useState('');
  const [config, setConfig] = useState<ModelConfig>({
    temperature: 0.1,
    maxTokens: 2048,
  });

  useEffect(() => {
    let name = '';
    if (AI_CONFIG.ACTIVE_PLAN === 'GEMINI') {
      if (activeTab === AppTab.DIAGNOSIS || activeTab === AppTab.NEWCOMER) {
        name = `${AI_CONFIG.GEMINI_MODELS.DIAGNOSIS}`;
      } else if (activeTab === AppTab.ANALYSIS) {
        name = `${AI_CONFIG.GEMINI_MODELS.ANALYSIS}`;
      } else {
        name = 'Digital China RAG Engine';
      }
    } else {
      name = `${AI_CONFIG.OLLAMA_CONFIG.MODEL}`;
    }
    setCurrentModelName(name);
  }, [activeTab]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case AppTab.NEWCOMER: return '码哥小助手';
      case AppTab.DIAGNOSIS: return '智能故障诊断';
      case AppTab.ANALYSIS: return '业务差异分析';
      case AppTab.KNOWLEDGE: return '知识库管理';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f3f7fa] text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        config={config} 
        setConfig={setConfig}
        currentModelName={currentModelName}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-10 border-b border-slate-100 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.25em]">DIGITAL CHINA</span>
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
              {getHeaderTitle()}
            </span>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
               <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-6 h-6" />
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="text-right">
                <p className="text-xs font-[900] text-slate-900 leading-none">Delivery Admin</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">系统交付专家</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#2563eb] flex items-center justify-center text-white shadow-xl shadow-blue-100 ring-4 ring-white transition-transform group-hover:scale-105">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-10 relative no-scrollbar">
          {/* 使用 hidden 类保持状态，并应用淡入动画 */}
          <div className={`h-full transition-all duration-500 ${activeTab === AppTab.NEWCOMER ? 'block opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
            <NewcomerGuide config={config} />
          </div>
          <div className={`h-full transition-all duration-500 ${activeTab === AppTab.DIAGNOSIS ? 'block opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
            <FaultDiagnosis config={config} />
          </div>
          <div className={`h-full transition-all duration-500 ${activeTab === AppTab.ANALYSIS ? 'block opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
            <BusinessAnalysis config={config} />
          </div>
          <div className={`h-full transition-all duration-500 ${activeTab === AppTab.KNOWLEDGE ? 'block opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
            <KnowledgeBase />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
