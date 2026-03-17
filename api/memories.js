// Vercel Serverless Function: GET /api/memories | POST /api/memories
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const memories = (data || []).map(m => ({
      id: m.id,
      content: m.content,
      category: m.category,
      timestamp: m.timestamp,
      profileId: m.profile_id,
      confidence: m.confidence
    }));

    return res.json(memories);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { content, category, timestamp, profileId, confidence } = body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('memories')
      .insert({
        user_id: userId,
        profile_id: profileId || 'self',
        content,
        category: category || 'GENERAL',
        timestamp: timestamp || Date.now(),
        confidence: confidence || 0.8
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      id: data.id,
      content: data.content,
      category: data.category,
      timestamp: data.timestamp,
      profileId: data.profile_id,
      confidence: data.confidence
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
