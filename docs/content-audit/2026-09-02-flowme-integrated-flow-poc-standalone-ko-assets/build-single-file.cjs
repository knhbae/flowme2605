const fs = require('node:fs');
const path = require('node:path');
const losslessRuntime = require('./lossless-authoring-runtime.cjs');
const validationExamplesRuntime = require('./validation-examples-runtime.cjs');
const structureTemplateRuntime = require('./structure-template-runtime.cjs');
const sourceUpdateRuntime = require('./source-update-runtime.cjs');
const contextualResultRuntime = require('../../../scripts/personal-workspace-poc/build-contextual-result-runtime.cjs');
const authoringUiRuntime = require('./authoring-ui-runtime.cjs');
const personalEntryQueryRuntime = require('./personal-entry-query-runtime.cjs');

const paths = Object.freeze({
  shell: path.join(__dirname, 'standalone-shell.html'),
  style: path.join(__dirname, 'style.css'),
  losslessAuthoring: losslessRuntime.canonicalEntry,
  validationExamples: validationExamplesRuntime.canonicalEntry,
  structureTemplate: structureTemplateRuntime.canonicalEntry,
  sourceUpdate: sourceUpdateRuntime.canonicalEntry,
  model: path.join(__dirname, 'model.js'),
  timelineContext: path.join(__dirname, 'timeline-context.js'),
  personalPlanContext: path.join(__dirname, 'personal-plan-context.js'),
  personalPlanControls: path.join(__dirname, 'personal-plan-editor-controls.js'),
  personalPlanDisplay: path.join(__dirname, 'personal-plan-display.js'),
  personalEntryRead: path.join(__dirname, 'personal-entry-read.js'),
  personalEntryQuery: path.join(__dirname, 'personal-entry-query.js'),
  personalEntryAuthoring: path.join(__dirname, 'personal-entry-authoring.js'),
  personalEntryUi: path.join(__dirname, 'personal-entry-ui.js'),
  workspaceCheckpoint: path.join(__dirname, 'workspace-checkpoint.js'),
  workspacePermanentDelete: path.join(__dirname, 'workspace-permanent-delete.js'),
  workspaceStorage: path.join(__dirname, 'workspace-storage.js'),
  timelineResultRank: path.join(__dirname, 'timeline-result-rank.js'),
  planItemSession: path.join(__dirname, 'plan-item-session.js'),
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
  output = replaceExactlyOnce(
    output,
    '/*__FLOWME_INLINE_VALIDATION_EXAMPLES__*/',
    scriptSafe(validationExamplesRuntime.buildBrowserText()),
  );
  output = replaceExactlyOnce(
    output,
    '/*__FLOWME_INLINE_STRUCTURE_TEMPLATE__*/',
    scriptSafe(structureTemplateRuntime.buildBrowserText()),
  );
  output = replaceExactlyOnce(
    output,
    '/*__FLOWME_INLINE_SOURCE_UPDATE__*/',
    scriptSafe(sourceUpdateRuntime.buildBrowserText()),
  );
  const workspaceRuntime = contextualResultRuntime.buildBrowserText() + '\n' + authoringUiRuntime.buildBrowserText() + '\n' + personalEntryQueryRuntime.buildBrowserText() + '\n' + [paths.model, paths.timelineContext, paths.personalPlanContext, paths.personalPlanControls, paths.workspaceCheckpoint, paths.workspacePermanentDelete,
    paths.workspaceStorage, paths.timelineResultRank, paths.planItemSession, paths.personalPlanDisplay, paths.personalEntryRead, paths.personalEntryQuery, paths.personalEntryAuthoring, paths.personalEntryUi].map(read).join('\n');
  output = replaceExactlyOnce(output, '/*__FLOWME_INLINE_MODEL__*/', scriptSafe(workspaceRuntime));
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
