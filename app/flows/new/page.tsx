import { NewFlow } from "@/components/flow/AppClient";
import { TextAuthoringWorkspace } from "@/components/flow/text-authoring";
import { TextAuthoringServiceRoute } from "@/components/flow/text-authoring/TextAuthoringServiceRoute";
import { NON_INDEXABLE_ROUTE_ROBOTS } from "@/lib/flow/route-indexing-policy";

export const metadata = {
  title: "콘텐츠 제작",
  robots: NON_INDEXABLE_ROUTE_ROBOTS,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ legacy?: string; authoringQa?: string }>;
}) {
  const params = await searchParams;
  const authoringDisabled =
    process.env.FLOWME_TEXT_AUTHORING_ENABLED === "0" || params.legacy === "1";

  if (authoringDisabled) return <NewFlow />;
  if (params.authoringQa === "1") {
    return <TextAuthoringWorkspace showQaCatalog />;
  }
  if (params.authoringQa === "0") {
    return <TextAuthoringWorkspace />;
  }
  return <TextAuthoringServiceRoute initialView="editor" />;
}
