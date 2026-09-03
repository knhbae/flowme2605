const fs = require('node:fs');
const path = require('node:path');
const losslessRuntime = require('./lossless-authoring-runtime.cjs');

const paths = Object.freeze({
  shell: path.join(__dirname, 'standalone-shell.html'),
  style: path.join(__dirname, 'style.css'),
  losslessAuthoring: losslessRuntime.canonicalEntry,
  model: path.join(__dirname, 'model.js'),
  app: path.join(__dirname, 'app.js'),
  output: path.join(__dirname, '..', '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html'),
  androidOutput: path.join(__dirname, '..', '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html')
});

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').trimEnd();
}

function scriptSafe(source) {
  return source.replace(/<\/script/giu, '<\\/script');
}

function styleSafe(source) {
  return source.replace(/<\/style/giu, '<\\/style');
}

function replaceExactlyOnce(source, marker, value) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) throw new Error('Expected one marker: ' + marker);
  return source.slice(0, first) + value + source.slice(first + marker.length);
}

function buildText() {
  let output = read(paths.shell);
  output = replaceExactlyOnce(output, '/*__FLOWME_INLINE_STYLE__*/', styleSafe(read(paths.style)));
  output = replaceExactlyOnce(
    output,
    '/*__FLOWME_INLINE_LOSSLESS_AUTHORING__*/',
    scriptSafe(losslessRuntime.buildBrowserText()),
  );
  output = replaceExactlyOnce(output, '/*__FLOWME_INLINE_MODEL__*/', scriptSafe(read(paths.model)));
  output = replaceExactlyOnce(output, '/*__FLOWME_INLINE_APP__*/', scriptSafe(read(paths.app)));
  return output + '\n';
}

function build() {
  const output = buildText();
  fs.writeFileSync(paths.output, output, 'utf8');
  fs.writeFileSync(paths.androidOutput, output, 'utf8');
  return {
    outputPaths: [paths.output, paths.androidOutput],
    bytes: Buffer.byteLength(output, 'utf8')
  };
}

if (require.main === module) {
  const result = build();
  result.outputPaths.forEach(outputPath => {
    process.stdout.write('Built ' + outputPath + ' (' + result.bytes + ' bytes)\n');
  });
}

module.exports = Object.freeze({ paths, buildText, build });
