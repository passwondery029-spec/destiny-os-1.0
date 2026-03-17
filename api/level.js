// Vercel Serverless Function: GET /api/level
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
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

  const today = new Date().toISOString().split('T')[0];
  
  let { data: levelData, error } = await supabaseAdmin
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  if (!levelData) {
    const { data: newLevel, error: createError } = await supabaseAdmin
      .from('user_levels')
      .insert({
        user_id: userId,
        level: 1,
        total_exp: 0,
        last_login_date: today
      })
      .select()
      .single();
    
    if (createError) return res.status(500).json({ error: createError.message });
    levelData = newLevel;
  }

  let addedExp = 0;
  if (levelData.last_login_date !== today) {
    addedExp = 20;
    await supabaseAdmin
      .from('user_levels')
      .update({
        total_exp: levelData.total_exp + addedExp,
        last_login_date: today
      })
      .eq('user_id', userId);
    levelData.total_exp += addedExp;
  }

  return res.json({
    level: levelData.level,
    exp: levelData.total_exp,
    totalExp: levelData.total_exp,
    lastLoginDate: levelData.last_login_date,
    lastDailyReportDate: levelData.last_daily_report_date || 0,
    addedExpToday: addedExp > 0 ? addedExp : undefined
  });
}
