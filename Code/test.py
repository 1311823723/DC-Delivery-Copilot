import streamlit as st
import requests
import json
import time

# ==========================================
# 1. 基础配置 & 界面美化
# ==========================================
st.set_page_config(
    page_title="神州交付领航者",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义 CSS：隐藏默认菜单，优化字体，让它看起来像专业软件
st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    .stTextArea textarea {font-size: 14px; font-family: "Consolas", monospace;}
    .stButton button {font-weight: bold;}
    </style>
    """, unsafe_allow_html=True)

# ⚠️ 你的模型名称 (请确保 Ollama 里已下载该模型)
MODEL_NAME = "qwen3-vl:8b"
OLLAMA_API_URL = "http://localhost:11434/api/generate"


# ==========================================
# 2. 核心功能函数 (流式与普通)
# ==========================================

def query_ollama_stream(prompt, sys_prompt=""):
    """
    [核心] 流式请求 Ollama，实现打字机效果
    """
    full_prompt = f"{sys_prompt}\n\n用户问题：{prompt}"
    payload = {
        "model": MODEL_NAME,
        "prompt": full_prompt,
        "stream": True,  # 开启流式
        "options": {
            "temperature": st.session_state.get('temp', 0.1),
            "num_predict": st.session_state.get('tokens', 2048)
        }
    }

    try:
        # stream=True 建立长连接
        with requests.post(OLLAMA_API_URL, json=payload, stream=True, timeout=120) as response:
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            body = json.loads(line)
                            chunk = body.get('response', '')
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
            else:
                yield f"❌ 模型调用失败 (状态码 {response.status_code})"
    except requests.exceptions.ConnectionError:
        yield "❌ 连接失败：请检查本地 Ollama 服务是否启动 (localhost:11434)。"
    except Exception as e:
        yield f"❌ 发生未知错误: {str(e)}"


# ==========================================
# 3. 侧边栏设计
# ==========================================
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2830/2830284.png", width=70)
    st.title("🚀 交付领航者")
    st.caption("Digital China Delivery Copilot")
    st.markdown("---")

    menu = st.radio("功能模组", ["🔍 智能故障诊断", "⚖️ 业务差异分析", "⚙️ 知识库管理"])

    st.markdown("### 🛠️ 模型参数")
    st.slider("创新性 (Temperature)", 0.0, 1.0, 0.1, key='temp', help="越低越严谨，越高越发散")
    st.number_input("最大长度 (Tokens)", 512, 4096, 2048, key='tokens')

    st.markdown("---")
    st.success(f"🟢 服务状态：在线\n\n🧠 引擎：{MODEL_NAME}")

# ==========================================
# 4. 主界面逻辑
# ==========================================

# ➤➤➤ 模块 1: 故障诊断
if menu == "🔍 智能故障诊断":
    st.title("🔍 生产故障根因智能定位")
    st.markdown("**场景说明**：针对跨系统联调（如ESB、网关）报错，自动分析日志堆栈，定位根因。")

    col1, col2 = st.columns([1, 1.2])

    with col1:
        st.subheader("📝 报错日志输入")

        # 初始化 session_state 用于“一键演示”
        if "log_input_val" not in st.session_state:
            st.session_state.log_input_val = ""

        # 演示按钮：点击后自动填入数据
        if st.button("我是演示：一键填入测试数据 🪄"):
            st.session_state.log_input_val = """[ERROR] 2026-01-18 14:23:01 [Gateway-Thread-9] c.d.b.GatewayController: Transaction failed.
Error Code: ESB-TIMEOUT-0092
Message: Connection timed out when calling system [LoanCore_V2] at 192.168.1.20:8080
Caused by: java.net.SocketTimeoutException: Read timed out
    at java.net.SocketInputStream.socketRead0(Native Method)
    at okhttp3.internal.http1.Http1ExchangeCodec.readHeaderLine(Http1ExchangeCodec.kt:150)"""
            st.rerun()

        user_input = st.text_area("请粘贴 Linux/控制台 原始日志",
                                  height=350,
                                  value=st.session_state.log_input_val,
                                  placeholder="在此粘贴报错信息...")

        analyze_btn = st.button("🚀 开始全链路诊断", type="primary", use_container_width=True)

    with col2:
        st.subheader("💡 AI 诊断报告")
        output_container = st.container(border=True)

        if analyze_btn and user_input:
            with output_container:
                # 1. 视觉特效：模拟 AI 思考步骤
                with st.status("🤖 AI 正在介入分析...", expanded=True) as status:
                    st.write("1. 解析日志堆栈结构...")
                    time.sleep(0.8)
                    st.write("2. 检索《核心系统错误码字典》...")
                    time.sleep(0.8)
                    st.write("3. 匹配知识库历史案例 (Knowledge Base)...")
                    time.sleep(0.8)
                    status.update(label="✅ 分析完成！开始生成报告", state="complete", expanded=False)

                # 2. 准备提示词
                sys_prompt = """
                你是一个银行核心系统技术专家。请分析以下报错日志。
                输出格式要求：
                1. **故障摘要**：用一句话概括问题。
                2. **根因分析**：技术层面的原因。
                3. **排查命令**：给出具体的 Linux 或 SQL 排查命令。
                4. **修复建议**：具体解决方案。
                请使用 Markdown 格式，关键信息加粗。
                """

                # 3. 流式输出 (打字机效果)
                stream = query_ollama_stream(user_input, sys_prompt)
                st.write_stream(stream)

                st.success("报告已生成，建议归档至知识库。")
        elif analyze_btn and not user_input:
            st.warning("⚠️ 请先在左侧输入日志！")
        else:
            with output_container:
                st.info("👈 等待输入日志...")

# ➤➤➤ 模块 2: 业务差异分析
elif menu == "⚖️ 业务差异分析":
    st.title("⚖️ 存贷业务规则差异比对")
    st.markdown("**场景说明**：对比【原型系统需求】与【现场实际实现】的业务逻辑差异，预防生产事故。")

    col_a, col_b = st.columns(2)
    with col_a:
        st.info("📄 文档 A：原型/标准需求")
        doc_standard = st.text_area("输入标准规则", height=200,
                                    placeholder="例如：逾期利息应计入复利科目(10101)...")
    with col_b:
        st.warning("📄 文档 B：现场/代码实现")
        doc_current = st.text_area("输入现场规则", height=200,
                                   placeholder="例如：逾期利息当前计入罚息科目(20202)...")

    compare_btn = st.button("⚖️ 启动智能稽核", type="primary")

    if compare_btn:
        if doc_standard and doc_current:
            st.markdown("### 📊 比对结果")

            # 使用流式输出
            sys_prompt = "你是银行核心业务专家。请对比两段描述，指出差异点，评估风险等级（高/中/低），并给出代码修改建议。"
            stream = query_ollama_stream(f"标准：{doc_standard}\n现场：{doc_current}", sys_prompt)
            st.write_stream(stream)

            # 假装给一个高风险评分，制造紧张感
            st.divider()
            st.metric(label="⚠️ 业务风险指数", value="High Risk", delta="-严重逻辑冲突", delta_color="inverse")
        else:
            st.warning("⚠️ 请确保两边的文档框都已填写内容。")

# ➤➤➤ 模块 3: 知识库管理
elif menu == "⚙️ 知识库管理":
    st.title("📚 交付知识库资产")
    st.markdown("管理 AI 的知识来源，包含项目文档、接口规范、历史故障库。")

    # 静态数据展示
    data = {
        "文档名称": ["SOFA网关接口规范_V2.0.pdf", "核心系统记账规则_V1.3.docx", "渤海银行特色业务说明.txt",
                     "Linux常用排查命令手册.md"],
        "大小": ["2.4 MB", "5.1 MB", "12 KB", "45 KB"],
        "上传时间": ["2026-01-15", "2026-01-16", "2026-01-18", "2026-01-18"],
        "状态": ["✅ 已向量化", "✅ 已向量化", "🔄 处理中", "✅ 已向量化"]
    }
    st.dataframe(data, use_container_width=True)

    col1, col2 = st.columns([1, 4])
    with col1:
        st.button("📤 上传新文档", disabled=True, help="演示环境禁用上传")
    with col2:
        st.caption("ℹ️ 当前连接本地向量数据库：ChromaDB (Local)")