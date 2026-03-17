// Vercel Serverless Function: POST /api/chat-logs
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }

  const logs = req.body;
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ error: 'Invalid logs data' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const rows = logs.map(log => ({
    user_id: userId,
    profile_id: log.profileId || 'self',
    role: log.role,
    content: log.content,
    model: log.model || 'unknown'
  }));

  const { error } = await supabaseAdmin
    .from('chat_logs')
    .insert(rows);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, count: rows.length });
}
