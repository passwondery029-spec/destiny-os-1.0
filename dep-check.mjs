const deps = [
  'express', 'cors', 'vite', 'openai', 'dotenv', 'node-cron',
  '@supabase/supabase-js', '@google/genai', '@heroicons/react',
  'framer-motion', 'html-to-image', 'mermaid', 'react', 'react-dom',
  'react-markdown', 'recharts', 'rehype-raw', 'remark-gfm', 'uuid'
];

async function run() {
  console.log('--- ESM Dependency Audit ---');
  for (const dep of deps) {
    try {
      const start = Date.now();
      await import(dep);
      console.log(`[OK] ${dep} (imported in ${Date.now() - start}ms)`);
    } catch (e) {
      console.log(`[FAIL] ${dep}: ${e.message}`);
    }
  }
}

run();
