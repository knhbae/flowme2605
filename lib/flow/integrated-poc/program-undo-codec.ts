/** Lossless wire-only sharing. Runtime history remains a detached JSON tree. */
export const PROGRAM_UNDO_CODEC = 'flowme-program-undo-shared/1';
export const PROGRAM_UNDO_CODEC_LIMITS = Object.freeze({ maxNodes: 500_000, maxDepth: 128, minimumChars: 8_192 });
type Scalar = null | string | boolean | number;
type Node = [0, Scalar] | [1, number[]] | [2, [string, number][]];
type Wire = { codec: typeof PROGRAM_UNDO_CODEC; nodes: Node[]; root: number };
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const plain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Caller first takes the store's strict JSON snapshot (no getters/coercion). */
export function shareProgramUndo(value: unknown): unknown {
 const original = JSON.stringify(value);
 if (original.length < PROGRAM_UNDO_CODEC_LIMITS.minimumChars) return value;
 const nodes: Node[] = [], indices = new Map<string, number>();
 const visit = (entry: unknown, depth: number): number => {
  if (depth > PROGRAM_UNDO_CODEC_LIMITS.maxDepth) throw Error('undo-depth');
  let node: Node;
  if (entry === null || typeof entry === 'string' || typeof entry === 'boolean' || typeof entry === 'number' && Number.isFinite(entry)) node = [0, entry];
  else if (Array.isArray(entry)) node = [1, entry.map(child => visit(child, depth + 1))];
  else if (plain(entry)) node = [2, Object.keys(entry).sort().map((key): [string, number] => [key, visit(entry[key], depth + 1)])];
  else throw Error('undo-json');
  const key = JSON.stringify(node), known = indices.get(key);
  if (known !== undefined) return known;
  if (nodes.length >= PROGRAM_UNDO_CODEC_LIMITS.maxNodes) throw Error('undo-nodes');
  const index = nodes.length; nodes.push(node); indices.set(key, index); return index;
 };
 const wire: Wire = { codec: PROGRAM_UNDO_CODEC, root: visit(value, 1), nodes };
 return JSON.stringify(wire).length < original.length ? wire : value;
}

/**
 * Validate the complete DAG and its EXPANDED JSON size before creating objects.
 * Backward references rule out cycles; weighted sizes rule out expansion bombs.
 * Do not memoize hydrated objects: different Undo snapshots must not alias.
 */
export function expandProgramUndo(value: unknown, maxExpandedBytes: number): unknown {
 if (!plain(value) || typeof value.codec !== 'string') return value; // Legacy actor/history map.
 if (value.codec !== PROGRAM_UNDO_CODEC || Object.keys(value).sort().join(',') !== 'codec,nodes,root'
  || !Array.isArray(value.nodes) || !value.nodes.length || value.nodes.length > PROGRAM_UNDO_CODEC_LIMITS.maxNodes
  || value.root !== value.nodes.length - 1 || !Number.isSafeInteger(maxExpandedBytes) || maxExpandedBytes < 1) throw Error('undo-codec');
 const nodes = value.nodes, sizes: number[] = [], depths: number[] = [];
 for (let index = 0; index < nodes.length; index++) {
  const node: unknown = nodes[index];
  if (!Array.isArray(node) || node.length !== 2) throw Error('undo-node');
  let size = 2, depth = 1;
  const child = (ref: unknown): number => {
   if (typeof ref !== 'number' || !Number.isSafeInteger(ref) || ref < 0 || ref >= index) throw Error('undo-reference');
   depth = Math.max(depth, depths[ref] + 1); return sizes[ref];
  };
  if (node[0] === 0) {
   const v = node[1];
   if (v !== null && !['string', 'boolean'].includes(typeof v) && !(typeof v === 'number' && Number.isFinite(v))) throw Error('undo-scalar');
   size = bytes(JSON.stringify(v));
  } else if (node[0] === 1 && Array.isArray(node[1])) {
   for (const ref of node[1]) { size += child(ref) + 1; if (size > maxExpandedBytes + 1) throw Error('undo-expanded-size'); }
   if (node[1].length) size--;
  } else if (node[0] === 2 && Array.isArray(node[1])) {
   let previous: string | undefined;
   for (const pair of node[1]) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || previous !== undefined && pair[0] <= previous) throw Error('undo-property');
    previous = pair[0]; size += bytes(JSON.stringify(pair[0])) + 1 + child(pair[1]) + 1;
    if (size > maxExpandedBytes + 1) throw Error('undo-expanded-size');
   }
   if (node[1].length) size--;
  } else throw Error('undo-tag');
  if (!Number.isSafeInteger(size) || size > maxExpandedBytes || depth > PROGRAM_UNDO_CODEC_LIMITS.maxDepth) throw Error('undo-expanded-size');
  sizes.push(size); depths.push(depth);
 }
 const reachable = new Set<number>();
 const mark = (index: number): void => { if (reachable.has(index)) return; reachable.add(index); const node = nodes[index] as Node; if (node[0] === 1) node[1].forEach(mark); if (node[0] === 2) node[1].forEach(([, ref]) => mark(ref)); };
 mark(value.root as number);
 if (reachable.size !== nodes.length) throw Error('undo-unused-nodes');
 const hydrate = (index: number): unknown => {
  const node = nodes[index] as Node;
  if (node[0] === 0) return node[1];
  if (node[0] === 1) return node[1].map(hydrate);
  const result: Record<string, unknown> = {};
  for (const [key, ref] of node[1]) Object.defineProperty(result, key, { value: hydrate(ref), enumerable: true, writable: true, configurable: true });
  return result;
 };
 return hydrate(value.root as number);
}
