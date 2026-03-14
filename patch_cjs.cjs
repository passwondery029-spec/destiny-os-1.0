const Module = require('module');
const path = require('path');
const fs = require('fs');

const VENDOR_DIR = '/Users/dd/Fangtang_Workspace/destiny-os/vendor';
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  // If it's a bare specifier, try to find it in VENDOR_DIR
  if (!request.startsWith('.') && !request.startsWith('/') && !request.includes(':')) {
    const parts = request.split('/');
    const pkgName = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    const vendorPkgPath = path.resolve(VENDOR_DIR, pkgName);
    
    if (fs.existsSync(vendorPkgPath) && fs.statSync(vendorPkgPath).isDirectory()) {
        try {
            const pkgFile = path.join(vendorPkgPath, 'package.json');
            let target = null;
            if (fs.existsSync(pkgFile)) {
                const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
                const main = pkg.main || 'index.js';
                target = path.resolve(vendorPkgPath, main);
                if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
                    const index = path.join(target, 'index.js');
                    if (fs.existsSync(index)) target = index;
                }
            } else {
                const index = path.join(vendorPkgPath, 'index.js');
                if (fs.existsSync(index)) target = index;
            }
            
            if (target && fs.existsSync(target) && !fs.statSync(target).isDirectory()) {
                return target;
            }
        } catch (e) {}
    }
    
    // Flat lookup for sub-files within vendor
    const flatPath = path.resolve(VENDOR_DIR, request);
    if (fs.existsSync(flatPath)) {
        if (fs.statSync(flatPath).isDirectory()) {
             const index = path.join(flatPath, 'index.js');
             if (fs.existsSync(index)) return index;
        } else {
            return flatPath;
        }
    }
  }
  
  return originalResolveFilename.apply(this, arguments);
};

console.log('CJS Module Resolver patched for VENDOR_DIR');
