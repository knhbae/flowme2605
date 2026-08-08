import type { MyFlowLibraryFilter } from '@/lib/flow/my-flow-local-ia';

export type MyFlowExperienceNavigationPort = Readonly<{
  openFlow: (savedFlowSlug: string) => void;
  returnToLibrary: () => void;
  replaceLibraryControls: (input: Readonly<{
    query: string;
    filter: MyFlowLibraryFilter;
  }>) => void;
  showArchived: () => void;
  expandMobileInventory: () => void;
}>;
