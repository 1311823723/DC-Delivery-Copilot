import streamlit as st
import time
import json
import os
import requests
import re
import random

# ==========================================
# 1. 页面基础配置 (必须在第一行)
# ==========================================
st.set_page_config(
    page_title="神码智核 - 核心交付底座",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# 2. CSS 样式 (复刻 React 高级感 + 深色控制台)
# ==========================================
st.markdown("""
<style>
    /* 全局字体与背景 */
    .stApp { background-color: #f3f7fa; font-family: 'Inter', sans-serif; }

    /* 隐藏默认 Header 和 侧边栏自带样式 */
    header[data-testid="stHeader"] { display: none; }
    section[data-testid="stSidebar"] { background-color: #ffffff; border-right: 1px solid #e2e8f0; }

    /* 自定义顶部导航栏 */
    .custom-header {
        position: fixed; top: 0; left: 0; right: 0; height: 70px;
        background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);
        border-bottom: 1px solid #f1f5f9; z-index: 999;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 40px; margin-left: 20rem; /* 留出侧边栏宽度 */
    }
    @media (max-width: 992px) { .custom-header { margin-left: 0; } }

    .brand-text { font-size: 11px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.25em; }
    .page-title { font-size: 14px; font-weight: 800; color: #334155; text-transform: uppercase; margin-left: 15px; padding-left: 15px; border-left: 2px solid #e2e8f0; }

    /* 用户卡片 */
    .user-card { display: flex; align-items: center; gap: 15px; }
    .user-info { text-align: right; line-height: 1.2; }
    .user-name { font-size: 13px; font-weight: 900; color: #0f172a; }
    .user-role { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .user-avatar { width: 42px; height: 42px; background-color: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.2); }

    /* 内容卡片容器 */
    .content-card { background: white; border-radius: 24px; padding: 30px; border: 1px solid #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.02); margin-top: 20px; }

    /* 深色控制台风格 */
    .dark-console {
        background-color: #0f172a; color: #e2e8f0; border-radius: 24px; padding: 30px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.2); border: 1px solid #1e293b;
        min-height: 500px; font-family: 'JetBrains Mono', monospace;
    }

    /* 按钮美化 */
    .stButton button { background-color: #2563eb; color: white; border-radius: 10px; border: none; font-weight: 600; padding: 0.5rem 1rem; transition: all 0.2s; }
    .stButton button:hover { background-color: #1d4ed8; transform: translateY(-1px); }
    .stButton button:disabled { background-color: #94a3b8; color: #e2e8f0; }

    /* 调整主内容区域 padding，防止被 Header 遮挡 */
    .block-container { padding-top: 90px; }

    /* 表格样式优化 */
    table { width: 100%; border-collapse: collapse; margin: 15px 0; color: #e2e8f0; }
    th { background-color: #1e293b; color: #60a5fa; padding: 12px; text-align: left; border-bottom: 2px solid #334155; }
    td { padding: 12px; border-bottom: 1px solid #334155; }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 3. 后端数据源与逻辑 (Mock Data & Logic)
# ==========================================

# 模拟日志数据库 (用于故障诊断)
MOCK_LOG_DATABASE = {
    "SEQ-20260130-001": """[2026-01-30 14:23:01.452] [ERROR] [http-nio-8080-exec-5] c.d.b.GatewayController : 交易处理失败
java.util.concurrent.TimeoutException: Calling downstream system [LoanCore_V2] timed out after 5000ms
    at com.digitalchina.core.rpc.Client.invoke(Client.java:128)
    at com.digitalchina.biz.loan.LoanService.apply(LoanService.java:45)
    ... 25 more
[Context] TraceId: 7f8a9b2c-1d3e | User: 10086 | Branch: SH_001""",

    "SEQ-20260130-002": """[2026-01-30 15:10:22.108] [ERROR] [batch-job-thread-2] c.d.c.InterestCalcUtil : 跑批计算异常
java.lang.NullPointerException: The field 'loan_rate' is null in transaction data
    at com.digitalchina.core.calc.InterestCalcUtil.calculate(InterestCalcUtil.java:88)
    at com.digitalchina.batch.NightlyJob.execute(NightlyJob.java:202)
[Context] JobId: JOB_BATCH_05 | BatchDate: 2026-01-29"""
}


# 加载知识库 (JSON)
@st.cache_data
def load_knowledge_base():
    path = os.path.join("public", "knowledge_index.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


knowledge_base = load_knowledge_base()


# RAG 检索逻辑 (关键词加权)
def search_knowledge(query, top_k=3):
    if not knowledge_base: return []
    scored_results = []
    for item in knowledge_base:
        content = item["content"]
        score = 0
        if query in content:
            score += 10
        else:
            for char in query:
                if char in content: score += 0.5
        if score > 1: scored_results.append((score, item))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [x[1] for x in scored_results[:top_k]]


# Ollama 调用逻辑 (流式)
def call_ollama_stream(model, messages):
    url = "http://localhost:11434/api/chat"
    payload = {"model": model, "messages": messages, "stream": True}
    try:
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        body = json.loads(line)
                        if "message" in body:
                            yield body["message"]["content"]
            else:
                yield f"❌ Error: {response.status_code} - Ollama 服务未响应"
    except:
        yield "❌ 连接失败: 请确认本地 Ollama 已运行 `ollama serve`"


# ==========================================
# 4. 侧边栏布局 (Sidebar)
# ==========================================
with st.sidebar:
    # Logo 区域
    logo_path = "public/logo.png"
    if os.path.exists(logo_path):
        st.image(logo_path, width=60)
    else:
        st.markdown("### 🚀 神码智核")

    st.caption("核心交付部 · 效能底座")
    st.markdown("---")

    # 导航菜单
    nav = st.radio(
        "功能导航",
        ["🎓 码哥小助手", "🩺 智能故障诊断", "📦 存量功能交接", "📚 知识库管理"],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # 模型选择
    st.markdown("#### ⚙️ 引擎配置")
    selected_model = st.selectbox(
        "推理模型",
        ["qwen3-vl:8b", "deepseek-r1", "qwen2.5", "llama3"],
        index=0
    )
    st.info(f"🟢 系统在线\n\n已加载 {len(knowledge_base)} 个知识切片")

# ==========================================
# 5. 自定义 Header (HTML 注入)
# ==========================================
page_titles = {
    "🎓 码哥小助手": "Newcomer Guide",
    "🩺 智能故障诊断": "Fault Diagnosis",
    "📦 存量功能交接": "Legacy Handover",
    "📚 知识库管理": "Knowledge Base"
}
current_en_title = page_titles.get(nav, "Dashboard")

header_html = f"""
<div class="custom-header">
    <div style="display:flex; align-items:center;">
        <span class="brand-text">DIGITAL CHINA</span>
        <span class="page-title">{current_en_title}</span>
    </div>
    <div style="display:flex; align-items:center; gap: 20px;">
        <div style="color: #94a3b8; cursor: pointer;">🔔</div>
        <div class="user-card">
            <div class="user-info">
                <div class="user-name">Delivery Admin</div>
                <div class="user-role">系统交付专家</div>
            </div>
            <div class="user-avatar">User</div>
        </div>
    </div>
</div>
"""
st.markdown(header_html, unsafe_allow_html=True)

# ==========================================
# 6. 主功能区逻辑
# ==========================================

# ----------------------------------------------------
# 功能 1: 码哥小助手 (RAG)
# ----------------------------------------------------
if nav == "🎓 码哥小助手":
    st.markdown("### 👋 欢迎回来，有什么可以帮您？")
    st.caption("基于本地知识库回答，数据不出域")

    chat_container = st.container()
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # 渲染历史消息
    with chat_container:
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    # 输入框
    if prompt := st.chat_input("我是新来的，请问怎么配置开发环境？"):
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                # RAG 检索
                docs = search_knowledge(prompt)

                # 构建 Prompt
                if docs:
                    context = "\n".join([f"- {d['content']}" for d in docs])
                    sys_prompt = f"你是一个友好的技术导师。请基于参考文档回答：\n{context}\n\n用户问题：{prompt}"
                    st.toast(f"已检索到 {len(docs)} 条相关文档", icon="📚")
                else:
                    sys_prompt = f"用户问：{prompt}。本地知识库没找到，请用通用知识回答并提示他查阅文档。"

                # 流式输出
                response_ph = st.empty()
                full_res = ""
                for chunk in call_ollama_stream(selected_model, [{"role": "user", "content": sys_prompt}]):
                    full_res += chunk
                    response_ph.markdown(full_res + "▌")
                response_ph.markdown(full_res)

                # 展示引用源
                if docs:
                    with st.expander("📖 引用来源 (Grounding)"):
                        for d in docs: st.info(d['content'][:200] + "...")

        st.session_state.chat_history.append({"role": "assistant", "content": full_res})

# ----------------------------------------------------
# 功能 2: 智能故障诊断 (MCP / Agent)
# ----------------------------------------------------
elif nav == "🩺 智能故障诊断":
    st.markdown("### 🩺 全链路故障根因分析")
    st.caption("Agentic Workflow: 自动执行 [拉取 -> 分析 -> 归档] 流程")

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown('<div class="content-card">', unsafe_allow_html=True)
        st.subheader("📥 现场数据接入")
        tab1, tab2 = st.tabs(["流水号追踪 (Auto)", "手动粘贴"])

        log_content = ""
        with tab1:
            st.info("💡 演示流水号: `SEQ-20260130-001`")
            serial = st.text_input("Transaction ID", value="SEQ-20260130-001")

            if st.button("📡 连接 ESB 总线拉取"):
                with st.status("正在追踪分布式链路...", expanded=True) as status:
                    time.sleep(0.5)
                    st.write("🔄 连接日志中心 (LogCenter)...")
                    time.sleep(0.5)
                    st.write("🔍 检索 TraceID: 7f8a9b2c...")

                    if serial in MOCK_LOG_DATABASE:
                        st.session_state.log_cache = MOCK_LOG_DATABASE[serial]
                        status.update(label="✅ 拉取成功", state="complete", expanded=False)
                    else:
                        status.update(label="❌ 未找到日志", state="error")

            if "log_cache" in st.session_state:
                log_content = st.session_state.log_cache
                st.code(log_content, language="log")

        with tab2:
            log_content = st.text_area("粘贴堆栈信息", height=200)

        analyze_btn = st.button("⚡ 启动智能根因分析", type="primary", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="dark-console">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #334155; padding-bottom:10px;">
                <span>✨ AI DIAGNOSIS REPORT</span>
                <span style="color:#4ade80;">● ONLINE</span>
            </div>
            <div id="report-area"></div>
        """, unsafe_allow_html=True)

        if analyze_btn and log_content:
            report_ph = st.empty()
            prompt = f"""
            你是一个Java架构师。分析此日志：
            ```
            {log_content}
            ```
            请务必输出 Markdown 表格：| 错误类型 | 定位组件 | 根因 | 建议 |
            """

            full_text = ""
            for chunk in call_ollama_stream(selected_model, [{"role": "user", "content": prompt}]):
                full_text += chunk
                # Hack: 模拟在控制台里打印
                report_ph.markdown(f'<div style="background:#0f172a; color:#e2e8f0;">{full_text}</div>',
                                   unsafe_allow_html=True)
        else:
            st.markdown(
                '<div style="color:#64748b; text-align:center; padding-top:100px;">Waiting for input stream...</div>',
                unsafe_allow_html=True)

        st.markdown("</div>", unsafe_allow_html=True)

# ----------------------------------------------------
# 功能 3: 存量功能交接 (新功能 - 代码对齐)
# ----------------------------------------------------
elif nav == "📦 存量功能交接":
    st.markdown("### 📦 存量功能/代码智能交接")
    st.caption("Code-Doc Alignment: 自动关联需求文档与代码实现，生成交接 SOP")

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown('<div class="content-card">', unsafe_allow_html=True)
        st.subheader("🔍 功能定位")
        func_name = st.text_input("交易码/功能名", value="loan_approval_01 (贷款审批)")

        st.info(
            "系统将自动执行：\n1. 扫描 Java 工程目录 (AST)\n2. 提取 Controller/Service 调用链\n3. 关联《详细设计文档.docx》")

        start_btn = st.button("🚀 生成交接指引", type="primary", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="dark-console">', unsafe_allow_html=True)

        if start_btn:
            with st.status("正在构建代码知识图谱...", expanded=True) as status:
                time.sleep(0.6)
                st.write("📂 解析 AST 语法树 (Abstract Syntax Tree)...")
                time.sleep(0.6)
                st.write("🔗 关联文档: 《贷款业务需求规格说明书_v2.1.docx》...")
                time.sleep(0.6)
                st.write("🤖 Qwen-Coder 正在生成逻辑注释...")
                status.update(label="✅ 生成完毕", state="complete", expanded=False)

            # 模拟的 AI 输出报告
            st.markdown(f"""
### 📘 功能交接报告：{func_name}

#### 1. 业务全景 (Based on Docs)
该交易用于分行客户经理提交贷款审批申请。核心规则包含**黑名单校验**、**额度占用**、**利率定价**三个环节。

#### 2. 代码实现链路 (Code Trace)
* **入口**: `LoanController.java` (Line 45) -> `approve()`
* **核心逻辑**: `LoanService.java`
* **持久层**: `LoanMapper.xml` (Table: `T_LOAN_INFO`)

#### 3. 核心逻辑解析 (AI Generated)
```java
// 1. 校验客户状态 (对应需求文档 3.2.1 章节)
if (!clientService.checkStatus(clientId)) {{
    throw new BizException("E001", "客户状态异常");
}}

// 2. 额度扣减 (注意：此处使用了 Redis 分布式锁)
RLock lock = redisson.getLock("loan_limit_" + clientId);
try {{
    // ... 扣减逻辑 ...
}} finally {{
    lock.unlock();
}}
###4 .潜在风险提示
                        
扫描发现 LoanService.java 第 120 行存在硬编码 (Hardcode) 的利率参数 0.045，建议在接手后迁移至配置中心。 ) else: st.markdown('<div style="color:#64748b; text-align:center; padding-top:100px;">Waiting for function input...</div>', unsafe_allow_html=True)
    ```java
    st.markdown('</div>', unsafe_allow_html=True)""")
# --- Tab 4: 知识库管理 ---
elif nav == "📚 知识库管理":
    st.markdown("### 📚 交付知识库透视 (RAG Core)")

    # 顶部统计
    c1, c2, c3 = st.columns(3)
    c1.metric("已向量化文档", f"{len(knowledge_base)} 个")
    c2.metric("Embedding 维度", "384 维 (MiniLM)")
    c3.metric("多模态解析", "RapidOCR 启用")

    st.divider()

    # 可视化区域
    t1, t2 = st.tabs(["📂 切片索引", "🔢 向量数据可视化"])

    with t1:
        st.dataframe(
            [{"ID": k["id"], "内容摘要": k["content"][:80]+"...", "来源": "本地知识库"} for k in knowledge_base],
            use_container_width=True
        )

    with t2:
        st.warning("⚠️ 高能预警：这就是计算机眼中的知识")
        if knowledge_base and 'vector' in knowledge_base[0]:
            # 模拟展示第一个切片的向量
            vec = knowledge_base[0]['vector']
            st.markdown(f"**切片 ID-{knowledge_base[0]['id']} 的向量指纹 (前50维):**")
            st.bar_chart(vec[:50], height=200, color="#2563eb")
            with st.expander("查看完整 384 维数组数据"):
                st.code(str(vec), language="json")
        else:
            # 如果没有真实向量，模拟一个图表
            mock_vec = [random.uniform(-1, 1) for _ in range(50)]
            st.markdown("**[模拟] 向量分布指纹 (前 50 维):**")
            st.bar_chart(mock_vec, height=200, color="#2563eb")