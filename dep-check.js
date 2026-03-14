const deps = [
  'express', 'cors', 'vite', 'openai', 'dotenv', 'node-cron',
  '@supabase/supabase-js', '@google/genai', '@heroicons/react',
  'framer-motion', 'html-to-image', 'mermaid', 'react', 'react-dom',
  'react-markdown', 'recharts', 'rehype-raw', 'remark-gfm', 'uuid'
];

console.log('--- Dependency Audit ---');
for (const dep of deps) {
  try {
    const start = Date.now();
    // Using import() since we are in ESM context often, but for node we can try require
    // Actually, for a quick check, let's just see if we can resolve the path
    require.resolve(dep);
    console.log(`[OK] ${dep} (resolved in ${Date.now() - start}ms)`);
  } catch (e) {
    console.log(`[FAIL] ${dep}: ${e.message}`);
  }
}
