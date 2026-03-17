const fs = require('fs');

const apiCode = `
// ============== 天机币 API ==============
app.get('/api/wallet/balance', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) return res.status(404).json({ error: '用户不存在' });

    const balance = user.user_metadata?.balance || 0;
    res.json({ balance: Number(balance) });
  } catch (e) {
    console.error('[API] get balance error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('balance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      desc: t.description,
      ts: t.ts,
      balanceBefore: t.balance_before,
      balanceAfter: t.balance_after
    })));
  } catch (e) {
    console.error('[API] get transactions error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/wallet/add', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { amount, desc, type } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '无效金额' });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const oldBalance = Number(user.user_metadata?.balance || 0);
    const newBalance = oldBalance + amount;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, balance: newBalance }
    });

    await supabaseAdmin.from('balance_transactions').insert({
      user_id: userId,
      type: type || 'RECHARGE',
      amount,
      balance_before: oldBalance,
      balance_after: newBalance,
      description: desc || '充值'
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    console.error('[API] add balance error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/wallet/deduct', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { amount, desc } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '无效金额' });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const oldBalance = Number(user.user_metadata?.balance || 0);
    if (oldBalance < amount) return res.status(400).json({ error: '余额不足' });

    const newBalance = oldBalance - amount;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, balance: newBalance }
    });

    await supabaseAdmin.from('balance_transactions').insert({
      user_id: userId,
      type: 'DEDUCT',
      amount: -amount,
      balance_before: oldBalance,
      balance_after: newBalance,
      description: desc || '消费'
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    console.error('[API] deduct balance error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============== 用户档案 API ==============
app.get('/api/profiles', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[API] get profiles error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const profile = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const newProfile = { ...profile, user_id: userId };
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[API] add profile error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;
    const updates = req.body;
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[API] update profile error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============== 记忆碎片 API ==============
app.get('/api/memories', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(m => ({
      id: m.id,
      content: m.content,
      category: m.category,
      profileId: m.profile_id,
      createdAt: m.created_at
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

    const { data, error } = await supabaseAdmin
      .from('memories')
      .insert({
        user_id: userId,
        content,
        category,
        profile_id: profileId || 'self'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({
      id: data.id,
      content: data.content,
      category: data.category,
      profileId: data.profile_id,
      createdAt: data.created_at
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
});

// ============== 天命报告 API ==============
app.get('/api/reports', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') return res.status(401).json({ error: '未登录' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Admin missing' });

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
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

    const newReport = { ...report, user_id: userId };
    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(newReport)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
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
});

`;

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace('// Vite middleware for development', apiCode + '\n// Vite middleware for development');
fs.writeFileSync('server.ts', content);
console.log('All APIs injected successfully');
