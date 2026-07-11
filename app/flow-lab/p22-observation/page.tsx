import type { Metadata } from 'next';
import { P22ObservationSetup } from '@/components/flow/P22ObservationSetup';

export const metadata: Metadata = {
  title: 'P22 관찰 준비 | FlowMe',
};

export default function Page() {
  return <P22ObservationSetup />;
}
