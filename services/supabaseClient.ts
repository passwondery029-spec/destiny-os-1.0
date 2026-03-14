import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and Node (process.env)
const getEnv = (key: string) => {
  const viteKey = `VITE_${key}`;
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[viteKey] || import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[viteKey] || process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://kvqqrlmapsfmskhhyyvm.supabase.co';
const supabaseKey = getEnv('SUPABASE_ANON_KEY') || 'sb_publishable_sLVq9h405OsSTcKUpLKjyQ_n6xItw7h';

if (!supabaseUrl || !supabaseKey || supabaseKey.includes('placeholder')) {
  console.warn('Supabase credentials missing or invalid. Database features may not work.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
