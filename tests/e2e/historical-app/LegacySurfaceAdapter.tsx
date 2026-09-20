'use client';
import type { ReactNode } from 'react';

// Only historical-app/next.config.ts resolves the Program import to this adapter.
// Reuse the real Route boot and the real legacy Surface, never a simplified model.
export function ProgramApp({ legacy }: { legacy: ReactNode }) {
  return <div data-historical-test-harness="legacy-surface">{legacy}</div>;
}
