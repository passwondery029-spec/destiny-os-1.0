const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 替换记忆碎片的 API - 使用表
const memoriesAPI = `// ============== 记忆碎片 API (使用数据库表) ==============
app.get('/api/memories', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data.map(m => ({
      id: m.id,
      content: m.content,
      category: m.category,
      profileId: m.profile_id,
      timestamp: m.timestamp,
      confidence: m.confidence
    })));
  } catch (e) {
    console.error('[API] get memories error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/memories', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { content, category, profileId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const newMemory = {
      user_id: userId,
      profile_id: profileId || 'self',
      content,
      category,
      timestamp: Date.now(),
      confidence: 0.9
    };

    const { data, error } = await supabaseAdmin
      .from('memories')
      .insert(newMemory)
      .select()
      .single();

    if (error) throw error;
    res.json({
      id: data.id,
      content: data.content,
      category: data.category,
      profileId: data.profile_id,
      timestamp: data.timestamp,
      confidence: data.confidence
    });
  } catch (e) {
    console.error('[API] add memory error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { error } = await supabaseAdmin
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[API] delete memory error:', e);
    res.status(500).json({ error: e.message });
  }
});`;

// 替换报告的 API - 使用表
const reportsAPI = `// ============== 天命报告 API (使用数据库表) ==============
app.get('/api/reports', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const profileId = req.query.profileId as string;

    let query = supabaseAdmin
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data.map(r => ({
      id: r.id,
      profileId: r.profile_id,
      title: r.title,
      type: r.type,
      summary: r.summary,
      content: r.content,
      htmlContent: r.html_content,
      date: r.date,
      tags: r.tags,
      cost: r.cost,
      createdAt: r.created_at
    })));
  } catch (e) {
    console.error('[API] get reports error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const report = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const newReport = {
      user_id: userId,
      profile_id: report.profileId || 'self',
      title: report.title,
      type: report.type,
      summary: report.summary,
      content: report.content || '',
      html_content: report.htmlContent || '',
      date: report.date || new Date().toISOString().split('T')[0],
      tags: report.tags || [],
      cost: report.cost || 0
    };

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(newReport)
      .select()
      .single();

    if (error) throw error;
    res.json({
      id: data.id,
      profileId: data.profile_id,
      title: data.title,
      type: data.type,
      summary: data.summary,
      content: data.content,
      htmlContent: data.html_content,
      date: data.date,
      tags: data.tags,
      cost: data.cost,
      createdAt: data.created_at
    });
  } catch (e) {
    console.error('[API] add report error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[API] delete report error:', e);
    res.status(500).json({ error: e.message });
  }
});`;

// 使用正则替换
const oldMemoriesPattern = /\/\/ ============== 记忆碎片 API \(存储在 user_metadata 中\) ==============[\s\S]*?\/\/ ============== 天命报告 API/;
const oldReportsPattern = /\/\/ ============== 天命报告 API \(存储在 user_metadata 中\) ==============[\s\S]*$/;

content = content.replace(oldMemoriesPattern, memoriesAPI + '\n\n// ============== 天命报告 API (使用数据库表) ==============');
content = content.replace(oldReportsPattern, reportsAPI);

fs.writeFileSync('server.ts', content);
console.log('Fixed memories and reports APIs to use tables');
