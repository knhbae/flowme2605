import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonalWorkspacePocSurface.tsx', import.meta.url), 'utf8');

test('K2C native drag captures only the visible exact status box before changing move state', () => {
  const capture = source.match(/const preserveNativeStatusBox = \(\) => \{([\s\S]*?)\n  \};/u)?.[1] ?? '';
  assert.match(capture, /element\.getAttribute\('aria-hidden'\) === 'true' \|\| element\.dataset\.status === 'ready'/u);
  assert.match(capture, /rect\.width <= 1 \|\| rect\.height <= 1/u);
  assert.match(capture, /width: rect\.width, height: rect\.height, minHeight: rect\.height, maxHeight: rect\.height/u);
  for (const margin of ['marginTop', 'marginBottom', 'marginLeft', 'marginRight']) assert.ok(capture.includes(`${margin}: computed.${margin}`));
  assert.equal((source.match(/onDragStart=\{\(event\) => \{\s+preserveNativeStatusBox\(\);/gu) ?? []).length, 2);
  assert.doesNotMatch(capture, /60|localStorage|commitTransition|\.focus\(/u);
});

test('K2C native drag spacer is inaccessible and unclickable without creating another live announcer', () => {
  const status = source.match(/<div\s+ref=\{transactionStatusRef\}([\s\S]*?)>\{status\.message\}<\/div>/u)?.[1] ?? '';
  assert.match(status, /data-native-status-box=\{nativeStatusBox \? 'preserved' : undefined\}/u);
  assert.match(status, /inert=\{nativeStatusBox \? true : undefined\}/u);
  assert.match(status, /style=\{nativeStatusBox\}/u);
  assert.match(status, /aria-live=\{nativeStatusBox \|\| resultOwnsTransactionStatus \? 'off'/u);
  assert.match(status, /aria-hidden=\{nativeStatusBox \|\| resultOwnsTransactionStatus \? true : undefined\}/u);
  assert.match(source, /visibility: 'hidden', pointerEvents: 'none'/u);
  assert.equal((source.match(/^\s+data-testid="personal-workspace-transaction-status"/gmu) ?? []).length, 1);
});

test('K2C native box cleanup shares cancellation, Escape, drop completion and unmount ownership', () => {
  assert.match(source, /const resetMoveInteraction = useCallback\(\(\) => \{[\s\S]*?setNativeStatusBox\(undefined\)/u);
  assert.match(source, /const cancelMove = useCallback\([\s\S]*?resetMoveInteraction\(\)/u);
  assert.match(source, /const onEscape = \(event: globalThis\.KeyboardEvent\) => \{[\s\S]*?cancelMove\(/u);
  assert.match(source, /const finishActiveMove = async \([\s\S]*?activeMoveSession\.current = undefined;\s+setNativeStatusBox\(undefined\)/u);
  assert.equal((source.match(/onDragEnd=\{\(\) => \{[\s\S]*?resetMoveInteraction\(\)/gu) ?? []).length, 2);
  assert.match(source, /const \[nativeStatusBox, setNativeStatusBox\] = useState<CSSProperties \| undefined>\(undefined\)/u);
  assert.doesNotMatch(source, /document\.(?:body|head)\.appendChild.*spacer/u);
});
