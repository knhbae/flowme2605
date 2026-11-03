import { ALPHA_LIMITS } from './contract';
import { canonicalJson, parseAlphaJson } from './json';

/** Storage representation only. Expanded values still pass their original validators. */
export const RECOVERY_CODEC_SCHEMA = 'flowme-alpha-local-recovery-dag/1';
const MAX_NODES = 250_000;
type Node = ['v', null | boolean | number | string] | ['a', number[]] | ['o', [string, number][]];
const bytes = (value: string) => new TextEncoder().encode(value).length;
const fail = (): never => { throw Error('invalid-recovery-codec'); };
const unsafe = (key: string) => ['__proto__', 'prototype', 'constructor'].includes(key);

export function encodeRecoveryStorage(value: unknown): string {
  const plain = canonicalJson(value), nodes: Node[] = [], known = new Map<string, number>();
  function visit(part: any): number {
    const node: Node = part === null || typeof part !== 'object' ? ['v', part]
      : Array.isArray(part) ? ['a', part.map(visit)]
        : ['o', Object.keys(part).sort().map((key): [string, number] => [key, visit(part[key])])];
    const signature = JSON.stringify(node), old = known.get(signature);
    if (old !== undefined) return old;
    if (nodes.length >= MAX_NODES) throw Error('recovery-codec-node-limit');
    const index = nodes.length; nodes.push(node); known.set(signature, index); return index;
  }
  try {
    const root = visit(JSON.parse(plain));
    const compact = canonicalJson({ schema: RECOVERY_CODEC_SCHEMA, nodes, root });
    return compact.length < plain.length ? compact : plain;
  } catch { return plain; } // Valid data remains eligible for the original storage path.
}

export function decodeRecoveryStorage(raw: string): unknown {
  const value = parseAlphaJson(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('schema' in value)
    || value.schema !== RECOVERY_CODEC_SCHEMA) return value;
  if (Object.keys(value).sort().join(',') !== 'nodes,root,schema') return fail();
  const { nodes, root } = value as unknown as { nodes: Node[]; root: number };
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > MAX_NODES || root !== nodes.length - 1) return fail();
  const sizes: number[] = [], depths: number[] = [];
  function ref(id: unknown, index: number): number {
    if (!Number.isSafeInteger(id) || Number(id) < 0 || Number(id) >= index) return fail();
    return id as number;
  }
  for (const [index, node] of nodes.entries()) {
    if (!Array.isArray(node) || node.length !== 2) return fail();
    let size = 0, depth = 0;
    if (node[0] === 'v') {
      const part = node[1];
      if (part !== null && !['boolean', 'string', 'number'].includes(typeof part)) return fail();
      size = bytes(canonicalJson(part));
    } else if (node[0] === 'a' || node[0] === 'o') {
      if (!Array.isArray(node[1])) return fail();
      size = 2 + Math.max(0, node[1].length - 1);
      const keys = new Set<string>();
      for (const child of node[1]) {
        let id: number;
        if (node[0] === 'o') {
          if (!Array.isArray(child) || child.length !== 2 || typeof child[0] !== 'string' || unsafe(child[0]) || keys.has(child[0])) return fail();
          keys.add(child[0]); size += bytes(JSON.stringify(child[0])) + 1; id = ref(child[1], index);
        } else id = ref(child, index);
        size += sizes[id]; depth = Math.max(depth, depths[id] + 1);
        if (size > ALPHA_LIMITS.bytes || depth > ALPHA_LIMITS.depth) return fail();
      }
    } else return fail();
    if (size > ALPHA_LIMITS.bytes) return fail();
    sizes.push(size); depths.push(depth);
  }
  // Recreate each occurrence, never share mutable object identity between paths.
  function expand(index: number): unknown {
    const node = nodes[index];
    if (node[0] === 'v') return node[1];
    if (node[0] === 'a') return node[1].map(expand);
    return Object.fromEntries(node[1].map(([key, id]) => [key, expand(id)]));
  }
  const expanded = expand(root); canonicalJson(expanded); return expanded;
}
