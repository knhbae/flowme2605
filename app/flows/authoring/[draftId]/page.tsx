import { TextAuthoringServiceRoute } from "@/components/flow/text-authoring/TextAuthoringServiceRoute";
import { NON_INDEXABLE_ROUTE_ROBOTS } from "@/lib/flow/route-indexing-policy";

export const metadata = {
  title: "콘텐츠 제작",
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default async function Page({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  return <TextAuthoringServiceRoute draftId={draftId} />;
}
