// Vercel Serverless Function: POST /api/chat
// 天机阁对话 API - 调用 Ark (Volcengine) 大模型
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, profileId, userId, temperature = 0.7, levelConfig, displayText } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Get Ark API credentials from env
    const arkApiKey = process.env.ARK_API_KEY;
    const arkEndpointId = process.env.ARK_ENDPOINT_ID || 'ep-20240101123456-abcde';

    if (!arkApiKey) {
      console.error('ARK_API_KEY is missing');
      return res.status(500).json({ error: 'Server configuration error: ARK_API_KEY missing' });
    }

    // Call Ark API
    const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${arkApiKey}`
      },
      body: JSON.stringify({
        model: arkEndpointId,
        messages: messages,
        temperature: temperature,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ark API error:', errorText);
      return res.status(502).json({ error: 'AI service error', details: errorText });
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || 'The Oracle is silent...';

    // Save chat log to database (fire and forget)
    try {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      await supabaseAdmin.from('chat_logs').insert([
        {
          user_id: userId,
          profile_id: profileId || 'self',
          role: 'user',
          content: displayText || messages[messages.length - 1]?.content || '',
          model: 'ark-volcengine'
        },
        {
          user_id: userId,
          profile_id: profileId || 'self',
          role: 'model',
          content: replyText,
          model: 'ark-volcengine'
        }
      ]);
    } catch (logError) {
      console.error('Failed to save chat log:', logError);
      // Don't fail the request if logging fails
    }

    return res.json({
      text: replyText,
      model: 'ark-volcengine',
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
