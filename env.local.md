# ==========================================
# Destiny OS 环境配置
# 复制此文件为 .env.local 并填入真实值
# ==========================================

# Supabase 配置
SUPABASE_URL=https://kvqqrlmapsfmskhhyyvm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXFybG1hcHNmbXNraGh5eXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDE1MzcsImV4cCI6MjA4ODc3NzUzN30.BH2rTWDGFDztR6-QanB7mxcGJ18l67yOvJIpHli_tOo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXFybG1hcHNmbXNraGh5eXZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIwMTUzNywiZXhwIjoyMDg4Nzc3NTM3fQ.ZHgbGKTVMRXIwYm8Ag343fMXskhw3GerbdUBEACea8I

# Volcengine Ark (豆包) 配置
ARK_API_KEY=43936606-58c9-4711-bd9a-1a61c177ebc0
ARK_ENDPOINT_ID=ep-m-20260305204118-rh2xg

# ==========================================
# 外部命理 Agent 配置 (可选)
# 如果你想使用自己搭建的专属 Agent (如 Coze, Dify) 来生成深度报告，请配置以下变量。
# 如果配置了此项，系统将不再使用内置大模型生成报告，而是将请求转发给该 URL。
# ==========================================
# 你的专属 Agent Webhook API 地址
# EXTERNAL_REPORT_AGENT_URL=https://whhongyi.com.cn/v1/workflows/run
# 你的专属 Agent API Key (如果需要)
# EXTERNAL_REPORT_AGENT_KEY=app-cUlOQU72y4XPOkCUAk74eLqy
