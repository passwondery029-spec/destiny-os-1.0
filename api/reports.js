// Vercel Serverless Function: GET /api/reports
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const reports = (data || []).map(r => ({
    id: r.id,
    profileId: r.profile_id,
    title: r.title,
    type: r.type,
    summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary,
    content: r.content,
    htmlContent: r.html_content,
    date: r.date,
    tags: r.tags
  }));

  return res.json(reports);
}
