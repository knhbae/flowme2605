import React from 'react';
import type { Metadata, Viewport } from 'next';
import { AlphaAuthPanel } from '@/components/flow/integrated-poc/AlphaAuthPanel';
import { readAlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';

export const dynamic = 'force-dynamic';
// N9: Android Chrome's 홈 화면에 추가 opens /alpha as an app. Manifest and icons only; no service worker.
export const metadata: Metadata = { title: 'FlowMe 개발계 로그인', robots: { index: false, follow: false },
  manifest: '/alpha/manifest.webmanifest' };
export const viewport: Viewport = { themeColor: '#3654ff' };
export default function AlphaPage() { return <AlphaAuthPanel config={readAlphaAuthConfig(process.env)} appWriting nativeAuthoringEnabled={process.env.FLOWME_ALPHA_NATIVE_AUTHORING_UI==='enabled'} readProbe={process.env.FLOWME_ALPHA_READ_PROBE==='v2'} privacyContact={process.env.FLOWME_ALPHA_PRIVACY_CONTACT} />; }
