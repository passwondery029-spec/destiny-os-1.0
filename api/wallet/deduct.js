// Vercel Serverless Function: POST /api/wallet/deduct
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

  const { amount, description = '消费' } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get current balance
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const oldBalance = userData.user.user_metadata?.balance ?? 0;
  
  if (oldBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  const newBalance = oldBalance - amount;

  // Update balance
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        ...userData.user.user_metadata,
        balance: newBalance
      }
    }
  );

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  // Record transaction
  await supabaseAdmin.from('balance_transactions').insert({
    user_id: userId,
    type: 'DEDUCT',
    amount: amount,
    balance_before: oldBalance,
    balance_after: newBalance,
    description: description
  });

  return res.json({ success: true, balance: newBalance, deducted: amount });
}
