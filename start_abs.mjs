import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const Module = require('node:module');

const VENDOR_ABS = '/Users/dd/Fangtang_Workspace/destiny-os/vendor';
const SERVER_ABS = '/Users/dd/Fangtang_Workspace/destiny-os/clean_app/server.ts';

// Inject into CJS search paths
Module.globalPaths.push(VENDOR_ABS);

console.log('Injected absolute vendor path:', VENDOR_ABS);
process.env.NODE_PATH = VENDOR_ABS;

// Import the server using absolute URL
import(pathToFileURL(SERVER_ABS).href).catch(err => {
    console.error('Failed to start server from absolute path:', err);
    process.exit(1);
});
