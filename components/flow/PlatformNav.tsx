'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isP35Q3CopyEnabled } from '@/lib/flow/p35-round2-flags';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';

type NavItem = {
  href: string;
  label: string;
  description?: string;
  match: (path: string) => boolean;
};

function useQ3NavigationCopy() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(isP35Q3CopyEnabled(window.location.search));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return { enabled, copy: getQ3UserCopyProfile(enabled) };
}

function getPrimaryNavItems(q3CopyEnabled: boolean): NavItem[] {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  return [
    {
      href: '/flows',
      label: copy.navigation.findPlans,
      match: (path) =>
        path === '/flows' ||
        path.startsWith('/f/') ||
        (path.startsWith('/flow-maps/') && !path.endsWith('/creator')),
    },
    { href: '/calendar', label: '캘린더', match: (path) => path === '/calendar' },
    { href: '/my', label: copy.navigation.myPlans, match: (path) => path === '/my' },
  ];
}

function getSecondaryNavItems(q3CopyEnabled: boolean): NavItem[] {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  return [
    {
      href: '/flows/new',
      label: copy.navigation.createPlan,
      description: q3CopyEnabled
        ? '내 콘텐츠를 실행할 계획으로 정리'
        : '내 콘텐츠를 실행형 Flow로 정리',
      match: (path) => path === '/flows/new',
    },
  ];
}

function primaryLinkClass(active: boolean) {
  return `inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] px-3 text-sm font-semibold transition ${
    active ? 'bg-[var(--flowme-text)] text-white' : 'text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface)] hover:text-[var(--flowme-text)]'
  }`;
}

function mobileTabClass(active: boolean) {
  return `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--flowme-radius-control)] px-2 text-xs font-semibold transition ${
    active ? 'bg-[var(--flowme-text)] text-white' : 'text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)] hover:text-[var(--flowme-text)]'
  }`;
}

export function PlatformMobileTabs() {
  const pathname = usePathname();
  const { enabled: q3CopyEnabled } = useQ3NavigationCopy();
  const primaryNavItems = getPrimaryNavItems(q3CopyEnabled);

  return (
    <nav
      className="fixed inset-x-3 bottom-[var(--flowme-mobile-tabs-offset)] z-40 grid grid-cols-3 gap-1 rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-1 shadow-[0_14px_36px_rgba(23,24,19,0.14)] sm:hidden"
      aria-label="주요 화면"
      data-testid="platform-mobile-tabs"
      data-layer-priority="navigation"
      data-p30-marker="P30-MOBILE-WORKSPACE-FOCUS-ORDER"
      data-p35-marker="P35-ENTRY-ROUTER-3TAB"
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
  );
}

export function PlatformNav({ includeMobileTabs = true }: { includeMobileTabs?: boolean } = {}) {
  const pathname = usePathname();
  const { enabled: q3CopyEnabled } = useQ3NavigationCopy();
  const primaryNavItems = getPrimaryNavItems(q3CopyEnabled);
  const secondaryNavItems = getSecondaryNavItems(q3CopyEnabled);

  return (
    <>
      <nav
        className="sticky top-0 z-30 mb-6 rounded-b-[var(--flowme-radius-card)] border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-1 py-3 sm:static sm:mb-8 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-4 sm:pt-0"
        aria-label="FLOW 서비스 프레임"
        data-testid="platform-nav"
        data-p35-q3-copy={q3CopyEnabled ? 'on' : 'off'}
      >
        <div className="flex items-center justify-between gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] text-lg font-semibold tracking-[-0.02em] text-[var(--flowme-text)]" href="/">
            FLOW
          </Link>

          <div
            className="hidden rounded-[var(--flowme-radius-card)] bg-[var(--flowme-soft)] p-1 sm:flex"
            aria-label="주요 화면"
            data-testid="platform-primary-tabs"
            data-p35-marker="P35-ENTRY-ROUTER-3TAB"
          >
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
              className="flex min-h-11 list-none items-center gap-2 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 text-sm font-semibold text-[var(--flowme-text)] transition hover:border-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)] [&::-webkit-details-marker]:hidden"
              aria-label="보조 메뉴 열기"
            >
              <span className="hidden sm:inline">메뉴</span>
              <span className="text-xl leading-none" aria-hidden="true">≡</span>
            </summary>
            <div className="absolute right-0 mt-2 grid min-w-64 gap-1 rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-2 shadow-[0_14px_36px_rgba(23,24,19,0.12)]">
              <p className="px-2 py-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">보조 기능</p>
              {secondaryNavItems.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    className={`block min-h-11 rounded-[var(--flowme-radius-control)] px-3 py-2 text-sm ${active ? 'bg-[var(--flowme-text)] text-white' : 'text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)] hover:text-[var(--flowme-text)]'}`}
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

      {includeMobileTabs ? <PlatformMobileTabs /> : null}
    </>
  );
}
