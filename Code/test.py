import streamlit as st
import requests
import json

# ==========================================
# 1. 基础配置
# ==========================================
st.set_page_config(
    page_title="ITS-核心交付部智能底座",
    page_icon="🏦",
    layout="wide"
)

# ⚠️ 注意：请确保你的 Ollama 里真的下载了这个名字的模型，或者修改为 'qwen2.5:7b' 等通用模型
MODEL_NAME = "qwen3-vl:235b-cloud"

# 后端 API 地址 (Ollama 默认地址)
OLLAMA_API_URL = "http://localhost:11434/api/generate"

# ==========================================
# 2. 侧边栏设计
# ==========================================
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2830/2830284.png", width=80)  # 换了一个更商务的图标
    st.title("🚀 交付智能底座")
    st.markdown("---")

    menu = st.radio("功能导航", ["🔍 故障根因诊断", "📚 业务差异分析", "⚙️ 系统设置"])

    st.markdown("---")
    st.caption(f"🟢 系统状态：在线")
    st.caption(f"🧠 当前模型：`{MODEL_NAME}`")


# ==========================================
# 3. 通用函数：调用 Ollama
# ==========================================
def query_ollama(prompt):
    """发送请求给后台 Ollama 的通用函数"""
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
        if response.status_code == 200:
            return response.json().get('response', "模型返回数据为空")
        else:
            return f"❌ 调用失败 (状态码 {response.status_code})：请检查模型名称是否正确。"
    except requests.exceptions.ConnectionError:
        return "❌ 连接失败：请确保本地 Ollama 服务已启动 (localhost:11434)。"
    except Exception as e:
        return f"❌ 发生未知错误：{str(e)}"


# ==========================================
# 4. 主页面逻辑
# ==========================================
st.title("🏦 核心交付部 - 跨系统智能专家")

# ➤➤➤ 功能 1: 故障根因诊断
if menu == "🔍 故障根因诊断":
    st.header("🔍 故障日志根因分析")
    st.markdown("该模块用于快速分析生产环境报错日志，定位问题根因。")

    col1, col2 = st.columns([1, 1])

    with col1:
        st.info("👇 原始日志输入")
        log_input = st.text_area("粘贴报错信息", height=350,
                                 placeholder="例如：\n[ERROR] 2024-01-18 Transaction failed: Connection reset by peer...")
        analyze_btn = st.button("🚀 开始 AI 诊断", type="primary", use_container_width=True)

    with col2:
        st.success("💡 AI 分析报告")
        output_container = st.container(border=True)

        if analyze_btn:
            if log_input:
                with output_container:
                    with st.spinner(f"正在呼叫 {MODEL_NAME} 分析堆栈信息..."):
                        # 构造提示词
                        prompt = f"""
                        你是一个银行核心系统资深架构师。请分析以下报错日志：

                        日志内容：
                        {log_input}

                        请按以下格式输出：
                        1. **故障摘要**：用一句话概括问题。
                        2. **可能根因**：列出3个可能的技术原因。
                        3. **排查建议**：给出具体的Linux命令或SQL查询建议。
                        4. **解决方案**：修复该问题的步骤。
                        """
                        result = query_ollama(prompt)
                        st.markdown(result)
            else:
                output_container.warning("⚠️ 请先在左侧输入日志内容！")
        else:
            output_container.info("等待分析指令...")

# ➤➤➤ 功能 2: 业务差异分析
elif menu == "📚 业务差异分析":
    st.header("📚 业务规则差异比对")
    st.markdown("该模块用于比对 **新旧系统逻辑** 或 **需求文档与代码实现** 的差异。")

    col_a, col_b = st.columns(2)
    with col_a:
        doc_standard = st.text_area("📄 输入文档 A (如：旧版业务规则)", height=200)
    with col_b:
        doc_current = st.text_area("📄 输入文档 B (如：新版需求说明)", height=200)

    compare_btn = st.button("⚖️ 开始智能比对", type="primary")

    if compare_btn:
        if doc_standard and doc_current:
            with st.spinner("正在进行语义比对和差异识别..."):
                prompt = f"""
                请比对以下两段业务描述的差异。

                【文档 A】：{doc_standard}

                【文档 B】：{doc_current}

                请输出：
                1. 主要变更点列表。
                2. 潜在的业务风险提示。
                3. 如果是银行转账场景，请特别关注金额限制和审批流程的变化。
                """
                result = query_ollama(prompt)
                st.success("✅ 比对完成")
                st.markdown(result)
        else:
            st.warning("⚠️ 请确保两边的文档框都已填写内容。")

# ➤➤➤ 功能 3: 系统设置
elif menu == "⚙️ 系统设置":
    st.header("⚙️ 系统参数设置")
    st.json({
        "System Version": "v1.0.0",
        "Backend Engine": "Ollama Local",
        "Current Model": MODEL_NAME,
        "Max Context Window": "32k",
        "Department": "ITS-Core Delivery"
    })
    st.info("当前连接正常，无需额外配置。")