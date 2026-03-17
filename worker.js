// Cloudflare Workers entry point for destiny-os API
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
};

// Handle OPTIONS preflight
function handleOptions(request) {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Helper: Get Supabase admin client
function getSupabaseAdmin(env) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Helper: JSON response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// === API Routes ===

// GET /api/level
async function getLevel(request, env, supabaseAdmin, userId) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get or create user level
  let { data: levelData, error } = await supabaseAdmin
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return jsonResponse({ error: error.message }, 500);
  }

  // Create new level if not exists
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
    
    if (createError) return jsonResponse({ error: createError.message }, 500);
    levelData = newLevel;
  }

  // Check daily login bonus
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

  return jsonResponse({
    level: levelData.level,
    exp: levelData.total_exp,
    totalExp: levelData.total_exp,
    lastLoginDate: levelData.last_login_date,
    lastDailyReportDate: levelData.last_daily_report_date || 0,
    addedExpToday: addedExp > 0 ? addedExp : undefined
  });
}

// GET /api/wallet/balance
async function getBalance(request, env, supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (error || !data.user) {
    return jsonResponse({ error: 'User not found' }, 404);
  }

  const balance = data.user.user_metadata?.balance ?? 0;
  return jsonResponse({ balance });
}

// GET /api/wallet/transactions
async function getTransactions(request, env, supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('balance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const transactions = (data || []).map(t => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    desc: t.description,
    ts: new Date(t.created_at).getTime(),
    balanceBefore: t.balance_before,
    balanceAfter: t.balance_after
  }));

  return jsonResponse(transactions);
}

// GET /api/profiles
async function getProfiles(request, env, supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (error || !data.user) {
    return jsonResponse({ error: 'User not found' }, 404);
  }

  const profiles = data.user.user_metadata?.destiny_profiles || [];
  return jsonResponse(profiles);
}

// GET /api/memories
async function getMemories(request, env, supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const memories = (data || []).map(m => ({
    id: m.id,
    content: m.content,
    category: m.category,
    timestamp: m.timestamp,
    profileId: m.profile_id,
    confidence: m.confidence
  }));

  return jsonResponse(memories);
}

// POST /api/memories
async function createMemory(request, env, supabaseAdmin, userId) {
  const body = await request.json();
  const { content, category, timestamp, profileId, confidence } = body;

  if (!content) {
    return jsonResponse({ error: 'Content is required' }, 400);
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
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    id: data.id,
    content: data.content,
    category: data.category,
    timestamp: data.timestamp,
    profileId: data.profile_id,
    confidence: data.confidence
  }, 201);
}

// GET /api/reports
async function getReports(request, env, supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
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

  return jsonResponse(reports);
}

// POST /api/chat-logs
async function saveChatLogs(request, env, supabaseAdmin, userId) {
  const body = await request.json();
  const logs = body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return jsonResponse({ error: 'Invalid logs data' }, 400);
  }

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
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ success: true, count: rows.length });
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Get user ID from header
    const userId = request.headers.get('x-user-id');
    if (!userId && path !== '/') {
      return jsonResponse({ error: '未登录' }, 401);
    }

    // Initialize Supabase admin client
    const supabaseAdmin = getSupabaseAdmin(env);

    try {
      // Route handlers
      if (path === '/api/level' && method === 'GET') {
        return await getLevel(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/wallet/balance' && method === 'GET') {
        return await getBalance(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/wallet/transactions' && method === 'GET') {
        return await getTransactions(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/profiles' && method === 'GET') {
        return await getProfiles(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/memories' && method === 'GET') {
        return await getMemories(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/memories' && method === 'POST') {
        return await createMemory(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/reports' && method === 'GET') {
        return await getReports(request, env, supabaseAdmin, userId);
      }
      
      if (path === '/api/chat-logs' && method === 'POST') {
        return await saveChatLogs(request, env, supabaseAdmin, userId);
      }

      // Health check
      if (path === '/') {
        return jsonResponse({ status: 'ok', service: 'destiny-os-api' });
      }

      // 404
      return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('API Error:', error);
      return jsonResponse({ error: error.message || 'Internal server error' }, 500);
    }
  }
};
