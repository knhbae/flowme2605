'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  description?: string;
  match: (path: string) => boolean;
};

const primaryNavItems: NavItem[] = [
  { href: '/', label: '홈', match: (path) => path === '/' },
  {
    href: '/flows',
    label: 'Flow 찾기',
    match: (path) =>
      path === '/flows' ||
      path.startsWith('/f/') ||
      (path.startsWith('/flow-maps/') && !path.endsWith('/creator')),
  },
  { href: '/calendar', label: '캘린더', match: (path) => path === '/calendar' },
  { href: '/my', label: '내 Flow', match: (path) => path === '/my' },
];

const secondaryNavItems: NavItem[] = [
  {
    href: '/flows/new',
    label: 'Flow 만들기',
    description: '내 콘텐츠를 실행형 Flow로 정리',
    match: (path) => path === '/flows/new',
  },
];

function primaryLinkClass(active: boolean) {
  return `inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold transition ${
    active ? 'bg-[#1B1A17] text-white' : 'text-[#6E6B64] hover:bg-[#F3F1EC] hover:text-[#1B1A17]'
  }`;
}

function mobileTabClass(active: boolean) {
  return `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-xs font-semibold transition ${
    active ? 'bg-[#1B1A17] text-white' : 'text-[#6E6B64] hover:bg-[#F3F1EC] hover:text-[#1B1A17]'
  }`;
}

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="sticky top-0 z-30 mb-6 rounded-b-lg border-b border-[#E7E4DD] bg-white/95 px-1 py-3 backdrop-blur sm:static sm:mb-8 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-4 sm:pt-0 sm:backdrop-blur-0"
        aria-label="FLOW 서비스 프레임"
        data-testid="platform-nav"
      >
        <div className="flex items-center justify-between gap-3">
          <Link className="inline-flex min-h-10 items-center text-lg font-semibold text-[#1B1A17]" href="/">
            FLOW
          </Link>

          <div className="hidden rounded-lg bg-[#F3F1EC] p-1 sm:flex" aria-label="주요 화면" data-testid="platform-primary-tabs">
            {primaryNavItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  className={primaryLinkClass(active)}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <details className="relative">
            <summary
              className="flex min-h-11 list-none items-center gap-2 rounded-md border border-[#E7E4DD] bg-white px-3 text-sm font-semibold text-[#1B1A17] shadow-[0_1px_0_rgba(27,26,23,0.03)] [&::-webkit-details-marker]:hidden"
              aria-label="보조 메뉴 열기"
            >
              <span className="hidden sm:inline">메뉴</span>
              <span className="text-xl leading-none" aria-hidden="true">≡</span>
            </summary>
            <div className="absolute right-0 mt-2 grid min-w-64 gap-1 rounded-lg border border-[#E7E4DD] bg-white p-2 shadow-[0_14px_36px_rgba(27,26,23,0.12)]">
              <p className="px-2 py-1 text-xs font-semibold text-[#6E6B64]">보조 기능</p>
              {secondaryNavItems.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-[#1B1A17] text-white' : 'text-[#6E6B64] hover:bg-[#F3F1EC] hover:text-[#1B1A17]'}`}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="block font-semibold">{item.label}</span>
                    {item.description ? <span className="mt-0.5 block text-xs opacity-75">{item.description}</span> : null}
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </nav>

      <nav
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 gap-1 rounded-lg border border-[#E7E4DD] bg-white/95 p-1 shadow-[0_14px_36px_rgba(27,26,23,0.14)] backdrop-blur sm:hidden"
        aria-label="주요 화면"
        data-testid="platform-mobile-tabs"
      >
        {primaryNavItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              className={mobileTabClass(active)}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
