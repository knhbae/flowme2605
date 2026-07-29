'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasSavedFlowEntry } from '@/lib/flow/storage';

export function EntryRouter() {
  const router = useRouter();

  useEffect(() => {
    let destination = '/flows';
    try {
      destination = hasSavedFlowEntry(window.localStorage) ? '/my' : '/flows';
    } catch {
      destination = '/flows';
    }
    router.replace(destination);
  }, [router]);

  return (
    <main
      className="min-h-screen bg-[#FAFAF8]"
      data-testid="entry-router"
      data-p35-marker="P35-ENTRY-ROUTER-3TAB"
      aria-busy="true"
    />
  );
}
