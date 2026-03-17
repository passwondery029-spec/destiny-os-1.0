const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 找到并替换整个天命报告 API 部分
const oldPattern = `// ============== 天命报告 API (使用数据库表) ============== (存储在 user_metadata 中) ==============
app.get('/api/reports', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const reports = user.user_metadata?.destiny_reports || [];
    res.json(reports);
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

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const existingReports = user.user_metadata?.destiny_reports || [];
    const newReport = {
      ...report,
      id: report.id || Date.now().toString(),
      created_at: new Date().toISOString()
    };

    const newReports = [newReport, ...existingReports];

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, destiny_reports: newReports }
    });

    res.json(newReport);
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

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const existingReports = user.user_metadata?.destiny_reports || [];
    const newReports = existingReports.filter((r: any) => r.id !== id);

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, destiny_reports: newReports }
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[API] delete report error:', e);
    res.status(500).json({ error: e.message });
  }
});`;

const newCode = `// ============== 天命报告 API (使用数据库表) ==============
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

content = content.replace(oldPattern, newCode);
fs.writeFileSync('server.ts', content);
console.log('Fixed');
