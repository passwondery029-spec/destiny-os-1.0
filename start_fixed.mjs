import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const Module = require('node:module');

// Absolute path to vendor directory
const vendorPath = path.resolve('./vendor');

// Inject into CJS search paths
Module.globalPaths.push(vendorPath);

console.log('Injected vendor path:', vendorPath);

// Also try to help ESM resolution by setting up a basic mapping if needed
// but for now, we'll try to just import the server.
// Since the server.ts uses ESM imports, we need Node 24 to handle the TS stripping.

// We will use process.env to pass the vendor path to any child processes if needed
process.env.NODE_PATH = vendorPath;

// Import the server
import('./clean_app/server.ts').catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
