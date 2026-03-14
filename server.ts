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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, temperature, profileId, userId } = req.body;
    const client = getArkClient();

    const apiMessages = [];
    if (systemInstruction) {
      apiMessages.push({ role: 'system', content: systemInstruction });
    }
    apiMessages.push(...messages);

    // Save to database as chat history for memory extraction later
    if (profileId) {
      const lastUserMessage = messages[messages.length - 1]; // Only the latest sent by user
      if (lastUserMessage && lastUserMessage.role === 'user') {
        try {
          await supabase.from('chat_logs').insert([{
            profile_id: profileId,
            user_id: userId, // Added for RLS
            role: 'user',
            text: lastUserMessage.content,
            timestamp: Date.now()
          }]);
        } catch (dbErr) {
          console.error('Failed to save user chat log:', dbErr);
        }
      }
    }

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: apiMessages,
      temperature: temperature || 0.7,
    });

    const replyText = response.choices[0]?.message?.content || '';

    // Save AI reply to database
    if (profileId && replyText) {
      try {
        await supabase.from('chat_logs').insert([{
          profile_id: profileId,
          user_id: userId, // Added for RLS
          role: 'model',
          text: replyText,
          timestamp: Date.now()
        }]);
      } catch (dbErr) {
        console.error('Failed to save model chat log:', dbErr);
      }
    }

    res.json({ text: replyText });
  } catch (error: any) {
    console.error('Ark API Error (Chat):', error);
    res.status(500).json({ error: error.message || 'Failed to communicate with Ark API' });
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
    .select('profile_id')
    .gte('timestamp', startTimestamp);

  if (profileErr) {
    console.error('Failed to fetch chat logs for memory extraction:', profileErr);
    return;
  }

  if (!profilesData || profilesData.length === 0) {
    console.log('[CRON] No chat logs found for today. Skipping.');
    return;
  }

  // Get unique profiles
  const uniqueProfiles = [...new Set(profilesData.map(row => row.profile_id))];

  const client = getArkClient();

  // Process each profile
  for (const profileId of uniqueProfiles) {
    console.log(`[CRON] Extracting memories for profileId: ${profileId}`);
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
        // Insert into Supabase memory table
        for (const mem of extractedMemories) {
          await supabase.from('memories').insert([{
            profile_id: profileId,
            content: mem.content,
            category: mem.category || 'EVENT',
            timestamp: Date.now(),
            confidence: 0.95
          }]);
        }
        console.log(`[CRON] Successfully extracted ${extractedMemories.length} memories for ${profileId}`);
      } else {
        console.log(`[CRON] No new core memories found for ${profileId} today.`);
      }
    } catch (e) {
      console.error(`[CRON] Failed to parse/store memory for ${profileId}:`, e);
    }
  }

  console.log('[CRON] Memory Extraction Completed.');
}

// Scheduled Task
cron.schedule('59 23 * * *', () => {
  runMemoryExtractionJob();
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
