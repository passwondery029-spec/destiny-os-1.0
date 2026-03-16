import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { REPORT_GENERATION_PROMPT, MEMORY_EXTRACTION_PROMPT } from './server/prompts';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

// Initialize Supabase Admin Client for the server
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ARK_API_KEY = process.env.VITE_ARK_API_KEY || process.env.ARK_API_KEY || '';
const ARK_ENDPOINT_ID = process.env.VITE_ARK_ENDPOINT_ID || process.env.ARK_ENDPOINT_ID || '';

// Base client for normal DB operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for auth bypass (requires service_role key)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

console.log(`[Boot] supabaseUrl=${supabaseUrl ? 'OK' : 'MISSING'}, anonKey=${supabaseAnonKey ? 'OK' : 'MISSING'}, serviceKey=${supabaseServiceKey ? 'OK' : 'MISSING'}, supabaseAdmin=${supabaseAdmin ? 'YES' : 'NO (聊天记录写入将依赖用户 auth token 通过 RLS)'}`);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client for Volcengine Ark
const getArkClient = () => {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    throw new Error('ARK_API_KEY is missing');
  }
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  });
};

const getModel = () => {
  // Use the provided Endpoint ID, or fallback to a default if not set
  return process.env.ARK_ENDPOINT_ID || 'ep-20240101123456-abcde';
};

// API Routes

// --- AUTHENTICATION BYPASS INTERFACE ---
// 解决 Supabase 默认需要外网邮箱验证和严格 Rate Limit 的问题
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: '未配置 SUPABASE_SERVICE_ROLE_KEY，无法使用后台免验证注册。请联系管理员添加环境变量，或在 Supabase 后台关闭 Email Confirmations并调高 Rate Limit。'
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // 强制直接激活，绕过发邮件确认步骤
    });

    if (error) {
      // Handle "already registered" cleanly
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: '该邮箱已经被注册过了' });
      }
      throw error;
    }

    res.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error('Custom Auth Register Error:', error);
    res.status(500).json({ error: error.message || '后台自动注册失败' });
  }
});

// 辅助函数：创建带用户身份的 DB client
const getDbClient = (authToken?: string) => {
  if (supabaseAdmin) return supabaseAdmin;
  if (authToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });
  }
  return supabase;
};

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, temperature, profileId, userId, levelConfig, displayText } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const client = getArkClient();
    const dbClient = getDbClient(authToken);
    
    console.log(`[Chat] profileId=${profileId}, userId=${userId}, hasAuthToken=${!!authToken}, usingAdmin=${!!supabaseAdmin}`);

    const apiMessages = [];
    if (systemInstruction) {
      apiMessages.push({ role: 'system', content: systemInstruction });
    }
    apiMessages.push(...messages);

    // 构建算力限制的系统提示
    let computingPowerInstruction = '';
    if (levelConfig && levelConfig._maxResponseLength) {
      computingPowerInstruction = `\n\n【算力优化】当前连接为优化模式，请精炼表达，突出重点。`;
      
      // 修改最后一个 system message 或者添加新的 system message
      if (apiMessages.length > 0 && apiMessages[0].role === 'system') {
        apiMessages[0].content += computingPowerInstruction;
      } else {
        apiMessages.unshift({ role: 'system', content: computingPowerInstruction });
      }
    }

    // 聊天记录保存已移至前端（利用用户 auth session 通过 RLS）
    // 服务端仅在有 supabaseAdmin 时备份写入
    if (supabaseAdmin && profileId) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const textToSave = displayText || lastUserMessage.content;
        await supabaseAdmin.from('chat_logs').insert([{
          profile_id: profileId, user_id: userId, role: 'user', text: textToSave, timestamp: Date.now()
        }]).then(({ error }) => { if (error) console.error('[DB-Admin] user save err:', error.message); });
      }
    }

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: apiMessages,
      temperature: temperature || 0.7,
    });

    let replyText = response.choices[0]?.message?.content || '';

    // 确保回复不超过字数限制（双重保险）
    if (levelConfig && levelConfig._maxResponseLength && replyText.length > levelConfig._maxResponseLength) {
      // 尝试在标点符号处截断，保持语义完整
      const truncatedText = replyText.substring(0, levelConfig._maxResponseLength);
      const lastPunctuation = Math.max(
        truncatedText.lastIndexOf('。'),
        truncatedText.lastIndexOf('！'),
        truncatedText.lastIndexOf('？'),
        truncatedText.lastIndexOf('\n')
      );
      
      if (lastPunctuation > levelConfig._maxResponseLength * 0.5) {
        replyText = truncatedText.substring(0, lastPunctuation + 1);
      } else {
        replyText = truncatedText + '...';
      }
      
      console.log(`[算力优化] 原回复 ${response.choices[0]?.message?.content?.length || 0} 字，优化为 ${replyText.length} 字`);
    }

    // AI 回复保存已移至前端（与用户消息一起批量写入，通过 RLS）
    // 服务端仅在有 supabaseAdmin 时备份写入
    if (supabaseAdmin && profileId && replyText) {
      await supabaseAdmin.from('chat_logs').insert([{
        profile_id: profileId, user_id: userId, role: 'model', text: replyText, timestamp: Date.now()
      }]).then(({ error }) => { if (error) console.error('[DB-Admin] reply save err:', error.message); });
    }

    res.json({ text: replyText });
  } catch (error: any) {
    console.error('='.repeat(60));
    console.error('Ark API Error (Chat):');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Ark API Key configured:', !!process.env.ARK_API_KEY);
    console.error('Ark Endpoint ID:', process.env.ARK_ENDPOINT_ID || 'NOT SET');
    console.error('='.repeat(60));
    
    // 返回更详细的错误信息
    let errorMessage = 'Failed to communicate with Ark API';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Error code: ${error.code}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/report', async (req, res) => {
  try {
    const { topic, profileInfo, context } = req.body;

    // =========================================================================
    // 方案 1：调用外部专属命理 Agent (例如 Coze, Dify, FastGPT 等)
    // 如果你在 .env 中配置了 EXTERNAL_REPORT_AGENT_URL，系统会优先把数据发给你的专属 Agent
    // 你的专属 Agent 需要返回一个 JSON： { "title": "...", "summary": "...", "content": "..." }
    // =========================================================================
    const externalAgentUrl = process.env.EXTERNAL_REPORT_AGENT_URL;
    if (externalAgentUrl) {
      console.log('Calling external report agent at:', externalAgentUrl);
      const externalRes = await fetch(externalAgentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EXTERNAL_REPORT_AGENT_KEY && { 'Authorization': `Bearer ${process.env.EXTERNAL_REPORT_AGENT_KEY}` })
        },
        body: JSON.stringify({ topic, profileInfo, context })
      });

      if (!externalRes.ok) {
        throw new Error(`External agent returned status ${externalRes.status}`);
      }

      const data = await externalRes.json();
      return res.json(data);
    }

    // =========================================================================
    // 方案 2：使用内置大模型 + 本地深度 Prompt (在 server/prompts.ts 中修改)
    // =========================================================================
    const client = getArkClient();
    const prompt = REPORT_GENERATION_PROMPT(topic, profileInfo, context);

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
    });

    let text = response.choices[0]?.message?.content || '{}';
    // Clean up Markdown JSON wrapper and any leading/trailing whitespace
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    // Sometimes the model might return invalid JSON due to unescaped control characters in the text
    // A robust way is to just wrap the whole thing in a try-catch and return a fallback if it fails
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (parseError) {
      console.error('Ark API JSON Parse Error (Report):', parseError, 'Raw Text:', text);
      // Fallback: If it completely fails to output JSON, wrap the raw text in our structure
      parsedData = {
        title: "命运深度解析报告",
        summary: "模型返回了复杂的文本结构，已为您自动提取核心内容。",
        content: text
      };
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Ark API Error (Report):', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

app.post('/api/divine', async (req, res) => {
  try {
    const { question, hexagramCode } = req.body;
    const client = getArkClient();

    const DIVINER_PROMPT = `
    你现在是“断事局”的首席预测师，人称【铁口直断】。
    你是一个完全独立于主系统的AI人格。
    
    **人设特点**：
    1. 严肃、冷峻、不讲废话。
    2. 专注于六爻预测（Liu Yao）或易经占卜。
    3. 只针对用户的具体问题给出一个明确的“吉/凶/平”结论。

    **输入信息**：
    - 用户所问之事：${question}
    - 随机生成的卦象代码（模拟掷币结果，0为背，1为字）：${hexagramCode}
    
    **任务**：
    1. 根据卦象代码，推演出本卦和变卦（若有）。
    2. 结合用户所问之事，进行断语。
    3. 输出必须包含 Markdown 格式。

    **输出格式要求**：
    ## 卦象：[本卦名] 之 [变卦名] (如果没有变卦则只写本卦)
    
    **【断语】**：[吉 / 凶 / 平] (必须明确一个)
    
    **【天机解析】**：
    (简短分析，不超过100字。引用一句易经爻辞)
    
    **【行事建议】**：
    (给出1条非常具体的行动建议)
    `;

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: DIVINER_PROMPT },
        { role: 'user', content: '请起卦。' }
      ],
      temperature: 0.5,
    });

    res.json({ text: response.choices[0]?.message?.content || '' });
  } catch (error: any) {
    console.error('Ark API Error (Divine):', error);
    res.status(500).json({ error: error.message || 'Failed to consult diviner' });
  }
});

// MEMORY EXTRACTION LOGIC
async function runMemoryExtractionJob() {
  console.log('[CRON] Starting Daily Memory Extraction at 23:59...');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.getTime();

  // 1. Fetch all distinct profile ideas that chatted today
  const { data: profilesData, error: profileErr } = await supabase
    .from('chat_logs')
    .select('profile_id, user_id')
    .gte('timestamp', startTimestamp);

  if (profileErr) {
    console.error('Failed to fetch chat logs for memory extraction:', profileErr);
    return;
  }

  if (!profilesData || profilesData.length === 0) {
    console.log('[CRON] No chat logs found for today. Skipping.');
    return;
  }

  // Get unique profiles with user_id
  const uniqueProfiles = new Map();
  profilesData.forEach(row => {
    if (!uniqueProfiles.has(row.profile_id)) {
      uniqueProfiles.set(row.profile_id, row.user_id);
    }
  });

  const client = getArkClient();

  // Process each profile
  for (const [profileId, userId] of uniqueProfiles) {
    console.log(`[CRON] Extracting memories for profileId: ${profileId}`);
    
    // First, check memory limit based on user level
    const memoryLimit = await getUserMemoryLimit(userId);
    const { count: currentMemoryCount } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    
    console.log(`[CRON] Profile ${profileId} has ${currentMemoryCount || 0}/${memoryLimit} memories`);
    
    // Fetch specific logs for this profile today
    const { data: logs, error: logsErr } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('profile_id', profileId)
      .gte('timestamp', startTimestamp)
      .order('timestamp', { ascending: true });

    if (logsErr || !logs || logs.length === 0) continue;

    // Format the chat log to string
    const chatLogString = logs.map(l => `${l.role === 'user' ? '用户' : 'AI'}: ${l.text}`).join('\n');
    const finalPrompt = MEMORY_EXTRACTION_PROMPT + '\n' + chatLogString;

    try {
      const response = await client.chat.completions.create({
        model: getModel(),
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: 0.2, // Lower temperature for more factual extraction
      });

      let text = response.choices[0]?.message?.content || '[]';
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const extractedMemories = JSON.parse(text);

      if (Array.isArray(extractedMemories) && extractedMemories.length > 0) {
        // 【硬约束】每天最多提取 8 条记忆，宁缺毋滥
        const MAX_DAILY_MEMORIES = 8;
        const limitedMemories = extractedMemories.slice(0, MAX_DAILY_MEMORIES);
        
        console.log(`[CRON] Extracted ${extractedMemories.length} memories, limited to ${limitedMemories.length} for quality control`);
        
        // Calculate how many new memories we can add
        const availableSlots = memoryLimit - (currentMemoryCount || 0);
        const memoriesToAdd = limitedMemories.slice(0, Math.max(0, availableSlots));
        
        if (memoriesToAdd.length > 0) {
          // If over limit, delete oldest memories first
          if ((currentMemoryCount || 0) + extractedMemories.length > memoryLimit) {
            const memoriesToDelete = (currentMemoryCount || 0) + memoriesToAdd.length - memoryLimit;
            if (memoriesToDelete > 0) {
              const { data: oldestMemories } = await supabase
                .from('memories')
                .select('id')
                .eq('profile_id', profileId)
                .order('timestamp', { ascending: true })
                .limit(memoriesToDelete);
              
              if (oldestMemories && oldestMemories.length > 0) {
                const idsToDelete = oldestMemories.map(m => m.id);
                await supabase.from('memories').delete().in('id', idsToDelete);
                console.log(`[CRON] Deleted ${idsToDelete.length} old memories for ${profileId}`);
              }
            }
          }
          
          // Insert into Supabase memory table
          for (const mem of memoriesToAdd) {
            await supabase.from('memories').insert([{
              profile_id: profileId,
              user_id: userId,
              content: mem.content,
              category: mem.category || 'EVENT',
              timestamp: Date.now(),
              confidence: 0.95
            }]);
          }
          console.log(`[CRON] Successfully extracted ${memoriesToAdd.length} memories for ${profileId}`);
        } else {
          console.log(`[CRON] Memory limit reached for ${profileId}, skipping new memories`);
        }
      } else {
        console.log(`[CRON] No new core memories found for ${profileId} today.`);
      }
    } catch (e) {
      console.error(`[CRON] Failed to parse/store memory for ${profileId}:`, e);
    }
  }

  console.log('[CRON] Memory Extraction Completed.');
}

// CHAT LOG CLEANUP LOGIC (keep only last 48 hours)
async function runChatLogCleanupJob() {
  console.log('[CRON] Starting Chat Log Cleanup...');
  
  // Calculate timestamp for 48 hours ago
  const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
  
  try {
    const { data: deletedLogs, error } = await supabase
      .from('chat_logs')
      .delete()
      .lt('timestamp', fortyEightHoursAgo)
      .select();
    
    if (error) {
      console.error('[CRON] Failed to clean up chat logs:', error);
    } else {
      console.log(`[CRON] Cleaned up ${deletedLogs?.length || 0} chat logs older than 48 hours`);
    }
  } catch (e) {
    console.error('[CRON] Error during chat log cleanup:', e);
  }
}

// Level Configs (must match frontend constants.ts)
const LEVEL_CONFIGS = [
  { level: 1, title: '初窥门径', minExp: 0, maxMemoryContext: 5, freeReportQuota: 1, unlockPrice: 0, maxMemoryCount: 50 },
  { level: 2, title: '炼气化神', minExp: 100, maxMemoryContext: 10, freeReportQuota: 2, unlockPrice: 6, maxMemoryCount: 100 },
  { level: 3, title: '筑基修士', minExp: 300, maxMemoryContext: 20, freeReportQuota: 3, unlockPrice: 18, maxMemoryCount: 200 },
  { level: 4, title: '金丹大成', minExp: 800, maxMemoryContext: 30, freeReportQuota: 5, unlockPrice: 68, maxMemoryCount: 300 },
  { level: 5, title: '元婴老祖', minExp: 2000, maxMemoryContext: 50, freeReportQuota: 8, unlockPrice: 128, maxMemoryCount: 500 },
  { level: 6, title: '化神尊者', minExp: 5000, maxMemoryContext: 80, freeReportQuota: 10, unlockPrice: 198, maxMemoryCount: 800 },
  { level: 7, title: '返虚地仙', minExp: 10000, maxMemoryContext: 120, freeReportQuota: 15, unlockPrice: 328, maxMemoryCount: 1200 },
  { level: 8, title: '大乘天仙', minExp: 25000, maxMemoryContext: 200, freeReportQuota: 20, unlockPrice: 648, maxMemoryCount: 2000 },
  { level: 9, title: '九天玄仙', minExp: 50000, maxMemoryContext: 300, freeReportQuota: 30, unlockPrice: 1288, maxMemoryCount: 3000 },
  { level: 10, title: '太上道祖', minExp: 100000, maxMemoryContext: 500, freeReportQuota: 50, unlockPrice: 0, maxMemoryCount: 9999 },
];

// Get user memory limit based on level
async function getUserMemoryLimit(userId: string | null): Promise<number> {
  if (!userId) return LEVEL_CONFIGS[0].maxMemoryCount;
  
  try {
    // Try to get user level from metadata
    const { data: { user } } = await supabase.auth.getUser(userId);
    if (user?.user_metadata?.level) {
      const userLevel = user.user_metadata.level;
      const config = LEVEL_CONFIGS.find(c => c.level === userLevel);
      if (config) return config.maxMemoryCount;
    }
  } catch (e) {
    console.error('Error getting user level:', e);
  }
  
  // Default to level 1 if no level found
  return LEVEL_CONFIGS[0].maxMemoryCount;
}

// Scheduled Tasks
// Daily memory extraction at 23:59
cron.schedule('59 23 * * *', () => {
  runMemoryExtractionJob();
});

// Chat log cleanup every hour (keep only last 48 hours)
cron.schedule('0 * * * *', () => {
  runChatLogCleanupJob();
});

// Also run cleanup once on startup
runChatLogCleanupJob();

// Dify Report Generation API
// ============ Dify 异步任务系统 ============
// 内存中存储任务状态（生产环境应使用 Redis 或数据库）
const difyTasks: Map<string, {
  status: 'pending' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: { htmlContent: string; title: string; summary: string };
  error?: string;
  createdAt: number;
}> = new Map();

// 每 30 分钟清理已完成超过 1 小时的任务
setInterval(() => {
  const now = Date.now();
  for (const [taskId, task] of difyTasks.entries()) {
    if (task.status !== 'pending' && now - task.createdAt > 3600000) {
      difyTasks.delete(taskId);
    }
  }
}, 1800000);

// 提交 Dify 报告生成任务（立即返回 taskId）
app.post('/api/dify/report', async (req, res) => {
  try {
    const { profile, memories, reportType, customTopic } = req.body;
    
    const taskId = `dify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[Dify] Task ${taskId} created for ${profile?.name}, type: ${reportType}`);
    
    // 立即创建任务
    difyTasks.set(taskId, {
      status: 'pending',
      progress: 10,
      createdAt: Date.now()
    });

    // 立即返回 taskId，不阻塞
    res.json({ success: true, taskId, message: '报告生成已启动，预计需要 8-10 分钟' });

    // 后台异步执行 Dify 调用
    const EXTERNAL_REPORT_AGENT_URL = process.env.EXTERNAL_REPORT_AGENT_URL;
    const EXTERNAL_REPORT_AGENT_KEY = process.env.EXTERNAL_REPORT_AGENT_KEY;
    
    if (EXTERNAL_REPORT_AGENT_URL && EXTERNAL_REPORT_AGENT_KEY) {
      try {
        const typeNames: Record<string, string> = {
          'YEARLY': '2025流年运势',
          'CAREER': '事业前程详批',
          'WEALTH': '财库补全指引',
          'CUSTOM': '定制深度报告'
        };
        
        // bazi_input: 纯排盘信息
        const baziInput = [
          profile?.name ? `姓名：${profile.name}` : '',
          profile?.gender ? `性别：${profile.gender === 'male' ? '男' : '女'}` : '',
          profile?.birthDate ? `出生日期：${profile.birthDate}` : '',
          profile?.birthTime ? `出生时间：${profile.birthTime}` : '',
          profile?.bazi ? `八字：${profile.bazi}` : '',
        ].filter(Boolean).join('\n');

        // xuqiu: 报告需求 + 记忆碎片 + 自定义主题
        const reportTypeName = typeNames[reportType] || '深度命理报告';
        const xuqiuParts = [
          `报告类型：${reportTypeName}`,
          customTopic ? `定制主题：${customTopic}` : '',
          memories ? `\n用户记忆碎片：\n${typeof memories === 'string' ? memories : JSON.stringify(memories)}` : '',
        ].filter(Boolean).join('\n');

        // 更新进度
        const task = difyTasks.get(taskId);
        if (task) task.progress = 20;

        // 设置 10 分钟超时（600000ms）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000);
        
        console.log(`[Dify] Task ${taskId} sending to Dify: bazi_input=${baziInput.substring(0, 50)}..., xuqiu=${xuqiuParts.substring(0, 80)}...`);
        
        const difyResponse = await fetch(EXTERNAL_REPORT_AGENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EXTERNAL_REPORT_AGENT_KEY}`
          },
          body: JSON.stringify({
            inputs: {
              bazi_input: baziInput,
              xuqiu: xuqiuParts
            },
            response_mode: 'blocking',
            user: profile?.id || 'anonymous'
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (difyResponse.ok) {
          const difyData = await difyResponse.json();
          const htmlContent = difyData.data?.outputs?.html || difyData.data?.outputs?.content || difyData.data?.outputs?.text || '';
          const title = difyData.data?.outputs?.title || `深度报告 - ${profile?.name}`;
          const summary = difyData.data?.outputs?.summary || '基于您的命盘和记忆档案生成的深度分析报告。';
          
          const completedTask = difyTasks.get(taskId);
          if (completedTask) {
            completedTask.status = 'completed';
            completedTask.progress = 100;
            completedTask.result = { htmlContent, title, summary };
          }
          console.log(`[Dify] Task ${taskId} completed successfully`);
          return;
        } else {
          const errorText = await difyResponse.text();
          throw new Error(`Dify API returned ${difyResponse.status}: ${errorText}`);
        }
      } catch (difyError: any) {
        console.error(`[Dify] Task ${taskId} failed:`, difyError.message);
        const failedTask = difyTasks.get(taskId);
        if (failedTask) {
          failedTask.status = 'failed';
          failedTask.error = difyError.message || '调用失败';
        }
        return;
      }
    }
    
    // 如果没有配置 Dify，标记任务失败
    console.log(`[Dify] Task ${taskId}: No Dify config, marking as failed`);
    const noConfigTask = difyTasks.get(taskId);
    if (noConfigTask) {
      noConfigTask.status = 'failed';
      noConfigTask.error = '未配置 Dify API';
    }
  } catch (error: any) {
    console.error('[Dify] Report submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '提交报告任务时发生错误'
    });
  }
});

// 查询 Dify 报告生成状态
app.get('/api/dify/report/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = difyTasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }

  if (task.status === 'completed') {
    res.json({
      success: true,
      status: 'completed',
      progress: 100,
      ...task.result
    });
  } else if (task.status === 'failed') {
    res.json({
      success: false,
      status: 'failed',
      error: task.error || '生成失败'
    });
  } else {
    // 根据时间估算进度（8分钟 = 480秒）
    const elapsed = (Date.now() - task.createdAt) / 1000;
    const estimatedProgress = Math.min(90, Math.round(20 + (elapsed / 480) * 70));
    task.progress = estimatedProgress;
    
    res.json({
      success: true,
      status: 'pending',
      progress: estimatedProgress,
      message: '报告正在生成中，请耐心等待...'
    });
  }
});

// Manual trigger API route for testing or forced extraction
app.post('/api/admin/run-memory-extraction', async (req, res) => {
  try {
    await runMemoryExtractionJob();
    res.json({ success: true, message: 'Memory extraction job has been queued.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
