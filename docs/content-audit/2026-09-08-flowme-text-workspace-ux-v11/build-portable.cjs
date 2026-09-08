/* Mechanical bundle of this isolated UX package only. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) => '<style>\n' + read(name) + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, name) => '<script>\n' + read(name).replace(/<\/script/gi, '<\\/script') + '\n</script>');
fs.writeFileSync(path.join(__dirname, 'flowme-text-workspace-v11.html'), html, 'utf8');
console.log('Built flowme-text-workspace-v11.html (' + Buffer.byteLength(html) + ' bytes)');
