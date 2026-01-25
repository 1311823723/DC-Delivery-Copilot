
import React from 'react';
import { AppTab, ModelConfig } from '../types';
import { 
  Activity, 
  ShieldCheck, 
  BookOpen, 
  Settings, 
  ChevronRight,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  config: ModelConfig;
  setConfig: (config: ModelConfig) => void;
  currentModelName: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, config, setConfig, currentModelName }) => {
  const menuItems = [
    { id: AppTab.NEWCOMER, label: '码哥小助手', icon: UserPlus, desc: '职场小帮手' },
    { id: AppTab.DIAGNOSIS, label: '智能故障诊断', icon: Activity, desc: '全链路根因定位' },
    { id: AppTab.ANALYSIS, label: '业务差异稽核', icon: ShieldCheck, desc: '逻辑偏差比对' },
    { id: AppTab.KNOWLEDGE, label: '交付知识库', icon: BookOpen, desc: '文档与资产管理' },
  ];

  return (
    <div className="w-72 h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo Section */}
      <div className="p-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Logo Image - Adjusted size and alignment */}
          <div className="w-12 h-12 flex-shrink-0 relative">
             <img 
               src="/logo.png" 
               alt="神码智核" 
               className="w-full h-full object-contain drop-shadow-sm"
               onError={(e) => {
                 // Fallback to external URL if local file is not found yet
                 e.currentTarget.onerror = null;
                 e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/en/thumb/e/e2/Digital_China_logo.png/220px-Digital_China_logo.png";
               }}
             />
          </div>
          <div className="flex flex-col justify-center h-12">
            <h1 className="text-2xl font-[900] text-slate-900 tracking-tight leading-none">神码智核</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1.5 ml-0.5">Intelligent Core</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Core Modules</p>
        <nav className="space-y-1.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-bold truncate">{item.label}</span>
                {activeTab === item.id && <span className="text-[10px] opacity-60 font-medium truncate">{item.desc}</span>}
              </div>
              {activeTab === item.id && <ChevronRight className="ml-auto w-4 h-4 text-white/40" />}
            </button>
          ))}
        </nav>
      </div>

      {/* Model Config Section */}
      <div className="mt-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Model Config</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-500 uppercase tracking-tighter">Innovation (Temp)</span>
              <span className="text-blue-600">{config.temperature}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.1" value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="space-y-2">
             <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-500 uppercase tracking-tighter">Max Tokens</span>
              <span className="text-blue-600">{config.maxTokens}</span>
            </div>
            <input 
              type="text"
              value={config.maxTokens}
              onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-200"
            />
          </div>
        </div>

        {/* System Status Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border border-emerald-100 bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-slate-700">SYSTEM ONLINE</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            Core: <span className="text-blue-600 font-bold">{currentModelName.split(':')[1] || 'deepseek-r1'}</span><br/>
            <span className="opacity-50">Latent: 124ms</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
