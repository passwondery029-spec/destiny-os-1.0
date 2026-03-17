// Vercel Serverless Function: GET /api/profiles
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (error || !data.user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const profiles = data.user.user_metadata?.destiny_profiles || [];
  return res.json(profiles);
}
