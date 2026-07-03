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
  {
    href: '/creators',
    label: '크리에이터 보기',
    description: '공개된 콘텐츠 제작자 둘러보기',
    match: (path) => path === '/creators' || path.startsWith('/u/'),
  },
];

function primaryLinkClass(active: boolean) {
  return `inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold ${
    active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;
}

function mobileTabClass(active: boolean) {
  return `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-xs font-semibold ${
    active ? 'bg-slate-950 text-white' : 'text-slate-600'
  }`;
}

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="sticky top-0 z-30 mb-6 rounded-b-lg border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:static sm:mb-8 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-4 sm:pt-0 sm:backdrop-blur-0"
        aria-label="FLOW 서비스 프레임"
        data-testid="platform-nav"
      >
        <div className="flex items-center justify-between gap-3">
          <Link className="inline-flex min-h-10 items-center text-lg font-semibold tracking-tight text-gray-950" href="/">
            FLOW
          </Link>

          <div className="hidden rounded-md bg-slate-100 p-1 sm:flex" aria-label="주요 화면" data-testid="platform-primary-tabs">
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
              className="flex min-h-10 list-none items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm [&::-webkit-details-marker]:hidden"
              aria-label="보조 메뉴 열기"
            >
              <span className="hidden sm:inline">메뉴</span>
              <span className="grid gap-1" aria-hidden="true">
                <span className="block h-0.5 w-5 rounded bg-slate-900" />
                <span className="block h-0.5 w-5 rounded bg-slate-900" />
                <span className="block h-0.5 w-5 rounded bg-slate-900" />
              </span>
            </summary>
            <div className="absolute right-0 mt-2 grid min-w-64 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <p className="px-2 py-1 text-xs font-semibold text-slate-500">보조 기능</p>
              {secondaryNavItems.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
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
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur sm:hidden"
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
