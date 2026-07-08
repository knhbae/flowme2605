import { CreatorProfile } from '@/components/flow/AppClient';
import { findVirtualUserBySlug } from '@/lib/flow/users';
import type { Metadata } from 'next';

function decodeCreatorParam(value: string): string {
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function generateMetadata({ params }: { params: Promise<{ creator: string }> }): Promise<Metadata> {
  const { creator } = await params;
  const slug = decodeCreatorParam(creator);
  const profile = findVirtualUserBySlug(slug);
  const isCurrentUserStudio = slug === 'my-flow-studio' || Boolean(profile?.is_current_user);

  return {
    title: `${profile?.name ?? '제작자'} | FlowMe`,
    robots: isCurrentUserStudio
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export default async function Page({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  return <CreatorProfile slug={creator} />;
}
