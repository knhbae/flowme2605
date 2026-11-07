import React from 'react';
import type { Metadata, Viewport } from 'next';
import { AlphaAuthPanel } from '@/components/flow/integrated-poc/AlphaAuthPanel';
import { readAlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';

export const dynamic = 'force-dynamic';
// N9: Android Chrome's 홈 화면에 추가 opens /alpha as an app. Manifest and icons only; no service worker.
// UX C8 (11/6): the tab and home screen say FlowMe and what it is; iPhone's 홈 화면에 추가 gets a 180px icon.
export const metadata: Metadata = { title: 'FlowMe', description: '할 일과 메모를 한곳에 쓰고, 다른 사람의 Flow를 내 계획으로 가져옵니다.',
  robots: { index: false, follow: false }, manifest: '/alpha/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: { url: '/alpha/apple-touch-icon.png', sizes: '180x180' } }, appleWebApp: { title: 'FlowMe' } };
// Write polish G (11/7): white, so the status bar runs into the white title row (Android draws its icons dark on it).
export const viewport: Viewport = { themeColor: '#ffffff' };
export default function AlphaPage() { return <AlphaAuthPanel config={readAlphaAuthConfig(process.env)} appWriting nativeAuthoringEnabled={process.env.FLOWME_ALPHA_NATIVE_AUTHORING_UI==='enabled'} readProbe={process.env.FLOWME_ALPHA_READ_PROBE==='v2'} privacyContact={process.env.FLOWME_ALPHA_PRIVACY_CONTACT} />; }
