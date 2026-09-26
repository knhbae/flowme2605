import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const forbidden = [
  'lib/flow/integrated-poc/catalog-library-pack.v1.json',
  'lib/flow/integrated-poc/catalog-library-source.ts',
  'lib/flow/integrated-poc/catalog-content-source.ts',
  'lib/flow/integrated-poc/alpha-creator/dispatch-source.ts',
];
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() && /\.[cm]?[jt]sx?$/u.test(entry.name) ? [path] : [];
  });
}
function imports(source) {
  const found = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) found.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source); return found;
}
export function inspectPrivateCatalogClientImports(root = process.cwd()) {
  const base = resolve(root), config = ts.readConfigFile(join(base, 'tsconfig.next.json'), ts.sys.readFile);
  if (config.error) throw Error('Cannot read app TypeScript config');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, base);
  const roots = [...files(join(base, 'app')), ...files(join(base, 'components'))].filter(path => {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    return source.statements.some(statement => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
  });
  const seen = new Set(), paths = [];
  function walk(path, chain) {
    path = resolve(path);
    if (seen.has(path)) return;
    seen.add(path);
    const relativePath = relative(base, path).replaceAll('\\', '/');
    if (forbidden.includes(relativePath)) paths.push([...chain, relativePath]);
    if (extname(path) === '.json') return;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const specifier of imports(source)) {
      const resolved = ts.resolveModuleName(specifier, path, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
      if (resolved) {
        const child = relative(base, resolve(resolved));
        if (child && !isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`)
          && !child.split(sep).includes('node_modules')) walk(resolved, [...chain, relativePath]);
      }
    }
  }
  for (const path of roots) walk(path, []);
  return { clientRoots: roots.length, sourceFiles: seen.size, forbiddenPaths: paths };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = inspectPrivateCatalogClientImports();
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.forbiddenPaths.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Client import check failed'}\n`);
    process.exitCode = 2;
  }
}
