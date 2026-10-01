'use strict';
// The standalone HTML is the single model source, including for file:// use.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const htmlPath = path.resolve(__dirname, '../../docs/content-audit/2026-10-01-flowme-folder-writing-lab-ko.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script data-folder-writing-model>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected exactly one inline folder-writing model');
const sandbox = {};
vm.runInNewContext(scripts[0][1], sandbox, { filename: htmlPath, timeout: 1000 });
module.exports = sandbox.FolderWritingModel;
