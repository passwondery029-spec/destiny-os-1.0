const fs = require('fs');
const path = require('path');

const originalLstatSync = fs.lstatSync;
const originalStatSync = fs.statSync;
const originalReaddirSync = fs.readdirSync;

// Fake result for node_modules to stop Node from trying to enter it
fs.lstatSync = function(p, options) {
  if (typeof p === 'string' && p.includes('node_modules')) {
    try {
        return originalLstatSync('/tmp', options);
    } catch(e) {
        return originalLstatSync('.', options);
    }
  }
  return originalLstatSync(p, options);
};

fs.statSync = function(p, options) {
  if (typeof p === 'string' && p.includes('node_modules')) {
    try {
        return originalStatSync('/tmp', options);
    } catch(e) {
        return originalStatSync('.', options);
    }
  }
  return originalStatSync(p, options);
};

console.log('FS Monkeypatch applied to bypass node_modules EPERM');
