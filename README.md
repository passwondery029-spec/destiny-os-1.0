# 天命系统 | Destiny OS

<img width="1200" height="475" alt="Destiny OS Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

> AI 命理 · 传统文化 · 心理咨询助手，探索您的命运轨迹

## 项目介绍

天命系统（Destiny OS）是一款融合东方传统命理文化与现代 AI 技术的个人成长助手应用。提供八字排盘、每日运势、AI 心理咨询、人生数据库等功能。

## 功能特性

- 🔮 **八字排盘** - 基于真实农历日历的精准命理分析
- 📊 **每日运势** - 个性化推送今日运势与建议
- 💬 **Oracle AI** - AI 驱动的智能命理咨询助手
- 📚 **人生数据库** - 记录与管理个人成长档案
- 🎮 **境界系统** - 修仙式成长体系，解锁更多功能

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
# 复制并修改 .env.local
cp .env.example .env.local
# 编辑 .env.local，填入你的配置

# 3. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 环境变量配置

在 `.env.local` 中配置以下变量：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `ARK_API_KEY` | ❌ | ARK API Key（用于 AI 生成报告）|
| `ARK_ENDPOINT_ID` | ❌ | ARK Endpoint ID |
| `EXTERNAL_REPORT_AGENT_URL` | ❌ | Dify 工作流地址（优先级高于 ARK）|
| `EXTERNAL_REPORT_AGENT_KEY` | ❌ | Dify API Key |

## 项目结构

```
destiny-os/
├── components/       # React 组件
├── services/         # 业务逻辑服务
├── server/          # 服务端代码
├── public/          # 静态资源
├── vendor/          # 第三方库（已打包）
├── constants.ts     # 全局常量配置
└── types.ts         # TypeScript 类型定义
```

## 技术栈

- **前端**: React + TypeScript + Vite
- **样式**: Tailwind CSS + Framer Motion
- **后端**: Express + Node.js
- **数据库**: Supabase
- **AI**: Google Gemini / OpenAI / Dify

## 开发说明

### vendor 目录

项目包含预打包的 vendor 目录，可脱离 node_modules 运行：

```bash
# 使用 vendor 版本（无需 npm install）
npm run start:vendor

# 使用标准版本（需要 npm install）
npm run dev
```

### 支付配置

支持微信支付收款码配置：
1. 将微信收款码图片放入 `public/wechat-pay.png`
2. 在"我的"页面点击充值即可显示

## 许可证

MIT License

## 注意事项

- 本服务提供的命理分析仅供娱乐与文化研究参考
- 请遵守当地法律法规使用本产品
