
import React, { useState, useEffect, useRef } from 'react';
import { ModelConfig } from '../types';
import { getAIResponse } from '../services/aiService';
import { marked } from 'marked';
import {
  ClipboardCheck,
  Terminal,
  Sparkles,
  Loader2,
  FileSearch,
  Zap,
  Brain,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface FaultDiagnosisProps {
  config: ModelConfig;
}

const FaultDiagnosis: React.FC<FaultDiagnosisProps> = ({ config }) => {
  const [logInput, setLogInput] = useState('');
  const [report, setReport] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const reportEndRef = useRef<HTMLDivElement>(null);

  const demoData = `[ERROR] 2026-01-18 14:23:01 [Gateway-Thread-9] c.d.b.GatewayController: Transaction failed.
Error Code: ESB-TIMEOUT-0092
Message: Connection timed out when calling system [LoanCore_V2] at 192.168.1.20:8080`;

  const handleDemo = () => setLogInput(demoData);

  // 模拟特定场景的执行过程
  const runStaticScenario = async (serialNo: string) => {
    let currentThinking = "<thinking>\n";
    setReport(currentThinking);

    // 严格按照用户要求的5个步骤进行模拟
    const steps = [
      "正在思考问题...",
      `正在追踪链路 (流水号: ${serialNo})...`,
      "正在结合系统内置问题库尝试定位...",
      "未找到存量案例，转入深度分析...",
      "正在读取sofa日志..."
    ];

    // 逐步输出思考过程，每一步给予较长的停顿，营造深度分析感 (慢一点)
    for (const step of steps) {
      // 时间随机范围 2.0秒 - 3.5秒，显著变慢
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));
      currentThinking += `> ${step}\n`;
      setReport(currentThinking);
      if (reportEndRef.current) reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    currentThinking += "</thinking>\n\n";
    setReport(currentThinking);

    // 最终的精准结论 (完全匹配用户要求的话术)
    const finalResult = `
# 🎯 诊断结论

**你是调用存款系统活期转账交易时，使用的转出账号可用余额不足导致的错误，请检查账户的可用余额。**

## 🕵️‍♂️ 根因分析
核心记账服务返回错误码 \`RB_5466\`，表示账户余额不足，账户扣款失败。
`;

    // 模拟最终报告的打字机效果 (慢一点)
    const chars = finalResult.split('');
    for (const char of chars) {
        setReport(prev => prev + char);
        // 打字速度 30ms - 60ms，比之前更慢
        await new Promise(r => setTimeout(r, 40 + Math.random() * 80));
        if (reportEndRef.current) reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const startAnalysis = async () => {
    if (!logInput) return;
    setIsAnalyzing(true);
    setReport('');
    setIsThinkingExpanded(true);

    const inputContent = logInput.trim();

    // 简单粗暴的判断：只要包含 G 或 T (区分大小写，严格按照用户指令)
    if (inputContent.includes('G') || inputContent.includes('T')) {
       // 尝试提取像流水号的东西用于展示，如果提取不到，就用默认值
       // 匹配规则：G或T开头，后面跟一串数字或字母
       const match = inputContent.match(/([GT][a-zA-Z0-9]+)/);
       const serialNoDisplay = match ? match[1] : (inputContent.length > 20 ? inputContent.substring(0, 20) + "..." : inputContent);

       try {
         await runStaticScenario(serialNoDisplay);
       } catch (e) {
         console.error(e);
       } finally {
         setIsAnalyzing(false);
       }
    } else {
       // --- 未命中规则：进入真实 AI 诊断模式 ---
       const systemPrompt = `你是一个资深银行核心系统技术专家。请对输入的错误日志进行深度诊断。
请遵循 "CoT (Chain of Thought)" 思维模式：
1. 首先，在 <thinking> 标签内进行深度思考。分析日志的时间戳、线程号、错误代码（如 ESB-TIMEOUT-0092）和报错堆栈。结合上下文推断可能的根因（网络波动、数据库锁、下游服务超时等）。
2. 思考结束后，在 <thinking> 标签外输出正式的 Markdown 格式诊断报告。
   - 报告必须包含：# 诊断结论、## 根因分析、## 解决方案（包含具体命令或配置建议）。
   - 确保标题分级清晰（# 一级, ## 二级）。`;

      try {
        await getAIResponse(logInput, systemPrompt, config, 'gemini-3-flash-preview', (chunk) => {
          setReport(prev => prev + chunk);
          if (reportEndRef.current) {
            reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        });
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setReport(`❌ **诊断中断** \n\n错误信息：${errorMessage}`);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (reportEndRef.current) {
      reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [report, isThinkingExpanded]);

  const renderContent = () => {
    const thinkMatch = report.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/);
    const hasThinking = !!thinkMatch;
    const thinkingContent = thinkMatch ? thinkMatch[1] : '';
    const finalReport = report.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/, '').trim();

    return (
      <div className="space-y-6">
        {hasThinking && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-4 h-4 ${isAnalyzing && !finalReport ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">
                  AI 深度思考链路 (Chain of Thought)
                </span>
              </div>
              {isThinkingExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>

            {isThinkingExpanded && (
              <div className="p-6 border-t border-slate-700/30">
                <div className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {thinkingContent}
                  {isAnalyzing && !report.includes('</thinking>') && (
                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {finalReport && (
          <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
             <div
              className="prose prose-invert prose-slate markdown-body max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(finalReport) as string }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-8 overflow-hidden">
      {/* Header - 还原图片视觉 */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-100">
            <Terminal className="text-white w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-[900] text-slate-900 tracking-tight">全链路故障智能根因定位</h2>
            <p className="text-slate-400 text-lg font-semibold mt-1">依托神州大脑知识库，分钟级定位跨系统疑难杂症。</p>
          </div>
        </div>
        <button
          onClick={handleDemo}
          className="flex items-center gap-3 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-all text-sm font-black border border-blue-100"
        >
          <Zap className="w-4 h-4 fill-current" /> 载入标准演示数据
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Left: Input (White Card) */}
        <div className="lg:col-span-5 bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">日志输入源</span>
          </div>
          <div className="flex-1 p-8 flex flex-col space-y-6">
            <div className="flex-1 bg-slate-50/50 rounded-[2rem] border border-slate-100 p-2 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
              <textarea
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="请在此粘贴报错堆栈或控制台日志..."
                className="w-full h-full bg-transparent rounded-2xl p-6 text-lg font-medium focus:outline-none resize-none leading-relaxed text-slate-600 placeholder:text-slate-300"
              />
            </div>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !logInput}
              className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 transition-all ${
                isAnalyzing || !logInput 
                  ? 'bg-slate-100 text-slate-300' 
                  : 'bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white hover:shadow-2xl hover:shadow-blue-200'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isAnalyzing ? '正在分析诊断中...' : '启动智能诊断'}
            </button>
          </div>
        </div>

        {/* Right: Output (Black Card) */}
        <div className="lg:col-span-7 bg-[#0f172a] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
          <div className="px-10 py-6 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">AI 核心诊断报告</span>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="text-xs text-blue-400 font-black uppercase">Thinking</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-14 scroll-smooth no-scrollbar">
            {!report && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <FileSearch className="w-24 h-24 text-slate-400 mb-6" />
                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">准备就绪，待命分析中</p>
              </div>
            ) : (
              <div className="max-w-none">
                {renderContent()}
                <div ref={reportEndRef} className="h-8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultDiagnosis;
