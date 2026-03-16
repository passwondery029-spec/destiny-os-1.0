import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// 动态获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VENDOR_DIR = path.join(__dirname, 'vendor');

export async function resolve(specifier, context, nextResolve) {
  // 0. Aggressively block and redirect any node_modules lookup
  if (specifier.includes('node_modules')) {
    const pkgName = specifier.replace(/.*node_modules\//, '').split('/')[0];
    const redirected = pkgName.startsWith('@') 
      ? specifier.replace(/.*node_modules\//, '').split('/').slice(0, 2).join('/') 
      : pkgName;
    return resolve(redirected, context, nextResolve);
  }

  // 1. Handle bare specifiers (packages) by looking in VENDOR_DIR
  if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:')) {
    const parts = specifier.split('/');
    const pkgName = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    const vendorPkgPath = path.join(VENDOR_DIR, pkgName);
    
    if (fs.existsSync(vendorPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(vendorPkgPath, 'package.json'), 'utf8'));
        let main = pkg.main || 'index.js';
        let target = path.join(vendorPkgPath, main);
        
        // Special handling for common packages and CJS/ESM hybrid
        if (!fs.existsSync(target)) {
          if (fs.existsSync(path.join(vendorPkgPath, 'index.js'))) {
            target = path.join(vendorPkgPath, 'index.js');
          } else if (pkgName === 'vite' && fs.existsSync(path.join(vendorPkgPath, 'index.mjs'))) {
            target = path.join(vendorPkgPath, 'index.mjs');
          } else if (pkgName === 'express' && fs.existsSync(path.join(vendorPkgPath, 'lib/express.js'))) {
            target = path.join(vendorPkgPath, 'lib/express.js');
          }
        }

        return {
          url: pathToFileURL(target).href,
          shortCircuit: true,
          format: target.endsWith('.mjs') || pkg.type === 'module' ? 'module' : 'commonjs'
        };
      } catch (e) {
        console.error(`[ESM] Failed to parse package.json for ${pkgName}`, e);
      }
    }
  }

  // 2. Handle relative specifiers with extension resolution
  if (specifier.startsWith('.') || specifier.startsWith(__dirname)) {
    try {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      const resolvedPath = specifier.startsWith('.') ? path.resolve(parentDir, specifier) : specifier;
      
      let finalPath = resolvedPath;
      if (!fs.existsSync(finalPath)) {
        for (const ext of ['.ts', '.tsx', '.js', '.mjs', '.cjs', '/index.ts', '/index.js']) {
          if (fs.existsSync(resolvedPath + ext)) {
            finalPath = resolvedPath + ext;
            break;
          }
        }
      }

      if (fs.existsSync(finalPath)) {
        return {
          url: pathToFileURL(finalPath).href,
          shortCircuit: true,
          format: finalPath.endsWith('.ts') || finalPath.endsWith('.tsx') ? 'module' : undefined
        };
      }
    } catch (e) {
      console.error(`[ESM] Error resolving relative ${specifier}`, e);
    }
  }

  return nextResolve(specifier, context);
}
