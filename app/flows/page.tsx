import { Suspense } from 'react';
import { FlowList } from '@/components/flow/AppClient';

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-5 py-8">Flow를 불러오는 중입니다.</main>}>
      <FlowList />
    </Suspense>
  );
}
