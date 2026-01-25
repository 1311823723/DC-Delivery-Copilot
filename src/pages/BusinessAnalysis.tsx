
import React, { useState, useRef, useEffect } from 'react';
import { ModelConfig } from '../../types';
import { getAIResponse } from '../services/aiService';
import { marked } from 'marked';
import { 
  FileText, 
  Search, 
  ShieldCheck, 
  Loader2, 
  Box,
  FileCode,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronRight,
  Download,
  X,
  Workflow
} from 'lucide-react';

interface BusinessAnalysisProps {
  config: ModelConfig;
}

const BusinessAnalysis: React.FC<BusinessAnalysisProps> = ({ config }) => {
  const [standard, setStandard] = useState('');
  const [current, setCurrent] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [showFlowchartButton, setShowFlowchartButton] = useState(false);
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const reportEndRef = useRef<HTMLDivElement>(null);

  // --- 硬编码的演示脚本 (Chain of Thought + Report) ---
  const DEMO_RESPONSE = `
<thinking>
正在深度比对业务需求与代码实现...
1.  **上下文解析**：识别到《对私活期账户开户需求》与 Java 后端服务代码。
2.  **关键逻辑扫描**：
    *   *准入规则*：CustomerCheckService 中的 checkIdExpiry() 逻辑与文档一致。
    *   *合规校验*：检测到 "1-5-5-9" 账户数量限制逻辑，实现正确。
    *   *风险点发现*：AccountLimitWrapper 中“非柜面限额”字段为非必输，与文档的“强制设置”要求冲突。
3.  **结果综合**：整体逻辑覆盖率 95%，存在 1 个高风险合规遗漏。
4.  **可视化准备**：根据代码执行路径构建业务流程视图。
</thinking>

# 深度业务逻辑差异稽核报告

## 1. 核心规则一致性分析 (Core Logic Check)

经智能核心对标分析，核心开户流程代码实现与需求文档高度吻合。

*   **✅ 客户准入 (Access Control)**
    *   **需求**：身份证过期、黑名单客户通过 ESB 接口拦截。
    *   **代码**：\`ValidationUtils.checkBlackList(custId)\` 已正确调用风控系统接口，且异常处理 Try-Catch 块完整。

*   **✅ 账户层级 (Hierarchy)**
    *   **需求**：遵循“一类户只能开一个”原则。
    *   **代码**：\`AccountService.create()\` 方法中包含 \`countAccountByType()\` 校验循环，逻辑正确。

## 2. ⚠️ 发现潜在风险 (Risk Alert)

在 **Step 4: 交易限额设置** 环节发现差异：

| 对比项 | 业务需求文档 (Baseline) | 现场代码实现 (As-Is) | 风险等级 |
| :--- | :--- | :--- | :--- |
| **非柜面限额** | 开户时**必须**强制设置，否则阻断交易 | 代码中该字段为 **Optional (可选)**，为空时默认为 0 | 🔴 High |

> **建议**：请在 \`OpenAccountDTO\` 类中将 \`nonCounterLimit\` 字段注解修改为 \`@NotNull\`，并在 Controller 层增加参数校验。

## 3. 字段映射完整性 (Field Mapping)

*   \`customer_name\` -> \`acct_name\` (映射正确)
*   \`id_no\` -> \`cert_id\` (映射正确)
*   \`mobile_phone\` -> \`contact_info\` (需确认：代码中进行了掩码脱敏处理，符合隐私合规)

---

**已根据代码逻辑逆向生成业务流程图，请点击下方按钮或等待弹窗查看详情。**
`;

  // 模拟 AI 打字流式输出 - 调整为更慢、更自然的节奏
  const simulateAIStreaming = async (text: string) => {
    const thinkEndIndex = text.indexOf('</thinking>') + 11;
    const thinkingPart = text.substring(0, thinkEndIndex);
    const bodyPart = text.substring(thinkEndIndex);

    // 思考部分：稍微快一点点
    for (let i = 0; i < thinkingPart.length; i += 2) {
      setAnalysis(prev => prev + thinkingPart.slice(i, i + 2));
      // 10ms - 30ms 随机延迟
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
    }

    // 思考结束，停顿一下，模拟"组织语言"
    await new Promise(resolve => setTimeout(resolve, 800));

    // 正文部分：模拟真实阅读/生成速度
    for (let i = 0; i < bodyPart.length; i += 1) {
      setAnalysis(prev => prev + bodyPart.charAt(i));
      // 20ms - 50ms 随机延迟，模拟打字感
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));

      // 每输出一点就滚动到底部
      if (i % 10 === 0 && reportEndRef.current) {
        reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const startAnalysis = async () => {
    setIsComparing(true);
    setAnalysis('');
    setShowFlowchartButton(false);
    setIsThinkingExpanded(true);
    setShowFlowchartModal(false);

    // 1. 统一模拟启动思考延迟 (1秒) - 给用户反应时间，模拟AI启动
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 智能判断：是触发演示脚本，还是真实调用 AI
    // 关键词：包含“开户”、“Demo”、“测试”、“流程”等，或者输入框完全为空（默认演示）
    const keywords = ['开户', 'demo', '演示', 'test', '标准', '流程'];
    const inputCombined = (standard + current).toLowerCase();
    const isDemo = inputCombined.length === 0 || keywords.some(k => inputCombined.includes(k));

    if (isDemo) {
        // --- 演示模式 (Demo Path) ---
        await simulateAIStreaming(DEMO_RESPONSE);
        setIsComparing(false);
        setShowFlowchartButton(true);
        // 演示模式下，输出完成后自动弹出图片
        setTimeout(() => setShowFlowchartModal(true), 1500);
    } else {
        // --- 实战模式 (Real AI Path) ---
        const systemPrompt = `你是一个银行资深业务分析专家。请对比【标准需求】与【现场实现】进行差异稽核。
遵循 CoT (Chain of Thought) 模式：
1. 先在 <thinking> 标签中进行思考，分析两者的逻辑差异。
2. 然后输出标准的 Markdown 差异分析报告。
3. 重点关注：核心规则一致性、字段映射、潜在风险。`;

        const userPrompt = `【标准需求文档】：\n${standard}\n\n【现场实际实现】：\n${current}`;

        try {
            await getAIResponse(userPrompt, systemPrompt, config, 'gemini-3-pro-preview', (chunk) => {
                setAnalysis(prev => prev + chunk);
                // 实时滚动到底部
                if (reportEndRef.current) {
                    reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            });
        } catch (err) {
             console.error(err);
             setAnalysis(prev => prev + `\n\n❌ **分析中断** \n\n错误信息：${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsComparing(false);
            // 真实 AI 模式下，通常不自动弹出特定图片，除非未来支持 AI 生成图片
            // 这里我们保持清爽，仅展示文本报告
        }
    }
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = '/flowchart.png'; // 确保 public 目录下有此图片
    link.download = '业务逻辑差异分析流程图.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (reportEndRef.current) {
      reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysis, isThinkingExpanded]);

  const renderContent = () => {
    const thinkMatch = analysis.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/);
    const hasThinking = !!thinkMatch;
    const thinkingContent = thinkMatch ? thinkMatch[1] : '';
    const finalReport = analysis.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/, '').trim();

    return (
      <div className="space-y-6">
        {hasThinking && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
             <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-4 h-4 ${isComparing && !finalReport ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">
                  AI 逻辑推演过程 (Chain of Thought)
                </span>
              </div>
              {isThinkingExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>

            {isThinkingExpanded && (
              <div className="p-6 border-t border-slate-700/30">
                <div className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {thinkingContent}
                  {isComparing && !analysis.includes('</thinking>') && (
                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {finalReport && (
          <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
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
    <div className="h-full flex flex-col space-y-8 overflow-y-auto no-scrollbar pb-10 relative">
      {/* Header */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="bg-[#f97316] p-3 rounded-2xl shadow-xl shadow-orange-100">
          <Box className="text-white w-7 h-7" />
        </div>
        <div>
          <h2 className="text-3xl font-[900] text-slate-900 tracking-tight">存贷业务规则深度差异稽核</h2>
          <p className="text-slate-400 text-base font-semibold mt-1">自动对标标准原型与实际代码逻辑。</p>
        </div>
      </div>

      {/* Input Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 shrink-0">
        {/* Baseline Card */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex items-center gap-3 text-blue-600 font-black text-lg tracking-widest uppercase">
            <FileText className="w-6 h-6" /> 业务需求文档 (BASELINE)
          </div>
          <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-2 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
            <textarea
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              placeholder="在此粘贴标准原型..."
              className="w-full h-72 bg-transparent rounded-2xl p-6 focus:outline-none text-xl font-medium text-slate-600 leading-relaxed placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* As-Is Card */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex items-center gap-3 text-[#f97316] font-black text-lg tracking-widest uppercase">
            <FileCode className="w-6 h-6" /> 现场实际实现 (AS-IS)
          </div>
          <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-2 focus-within:ring-4 focus-within:ring-orange-50 transition-all">
            <textarea
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="在此粘贴现场实现..."
              className="w-full h-72 bg-transparent rounded-2xl p-6 focus:outline-none text-xl font-medium text-slate-600 leading-relaxed placeholder:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Center Action Button */}
      <div className="flex justify-center shrink-0 py-4">
        <button
          onClick={startAnalysis}
          // 在这里我们不禁用按钮，即使没有输入，以便用户点击触发演示模式
          disabled={isComparing && analysis === ''}
          className={`px-12 py-5 rounded-2xl font-black text-lg flex items-center gap-4 transition-all ${
            isComparing
              ? 'bg-slate-800 text-white cursor-wait shadow-xl'
              : 'bg-slate-100 text-slate-500 hover:bg-[#0f172a] hover:text-white shadow-xl hover:shadow-slate-200 active:scale-95'
          }`}
        >
          {isComparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
          {isComparing ? 'AI 智能引擎分析中...' : '启动逻辑差异分析'}
        </button>
      </div>

      {/* Result Section (The Big Box) */}
      {/* 只有当 analysis 有内容，或者正在比较时才显示 */}
      {(analysis || isComparing) && (
        <div className="w-full max-w-[90%] mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
           <div className="bg-[#0f172a] rounded-[3rem] border border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative min-h-[400px]">
            {/* Box Header */}
            <div className="px-10 py-6 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">深度稽核结论报告</h3>
              </div>
              <div className="flex items-center gap-4">
                 {/* 生成流程图按钮 - 仅在分析完成后出现（目前主要针对演示模式） */}
                 {showFlowchartButton && (
                  <button
                    onClick={() => setShowFlowchartModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all animate-in fade-in zoom-in duration-500"
                  >
                    <Workflow className="w-4 h-4" /> 查看逻辑流程图
                  </button>
                 )}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">AI Expert Verified</span>
                </div>
              </div>
            </div>

            {/* Box Content */}
            <div className="p-14 overflow-hidden">
               {/* 没内容时显示 Loading 或 占位 */}
               {!analysis && isComparing && (
                 <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-sm font-bold uppercase tracking-widest">AI 正在思考中...</p>
                 </div>
               )}

               {renderContent()}
               <div ref={reportEndRef} className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Flowchart Modal (Image Based) */}
      {showFlowchartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 transform transition-all">
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <Workflow className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">业务逻辑反向生成流程图</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wider">Generated</span>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Based on Analysis Report</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFlowchartModal(false)}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors group"
              >
                <X className="w-8 h-8 text-slate-300 group-hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Body - Display Local Image */}
            <div className="flex-1 bg-slate-50 overflow-auto p-12 flex items-center justify-center relative">
               {/* Grid Background */}
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.3 }}></div>

              <img
                src="/flowchart.png"
                alt="业务流程图"
                className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200 bg-white relative z-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="relative z-10 flex flex-col items-center justify-center text-slate-400 space-y-4 p-16 border-4 border-dashed border-slate-200 rounded-[2rem] bg-white/50 backdrop-blur-sm">
                        <div class="p-6 bg-slate-100 rounded-full"><Workflow class="w-12 h-12 text-slate-300" /></div>
                        <div class="text-center">
                          <p className="text-xl font-bold text-slate-600">未找到流程图文件</p>
                          <p className="text-sm font-mono mt-2 bg-slate-100 px-3 py-1 rounded text-slate-500">public/flowchart.png</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-8 border-t border-slate-100 bg-white flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                已通过神码智核安全扫描
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowFlowchartModal(false)}
                  className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  关闭预览
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="px-10 py-4 rounded-xl font-bold text-white bg-[#0f172a] hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-200 hover:-translate-y-1 flex items-center gap-3"
                >
                  <Download className="w-5 h-5" /> 下载流程图源文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAnalysis;
