import { MyFlows } from '@/components/flow/AppClient';

export const metadata = {
  title: '캘린더',
};

export default function Page() {
  return <MyFlows initialView="calendar" surface="calendar" />;
}
