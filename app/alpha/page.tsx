import React from 'react';
import type { Metadata } from 'next';
import { AlphaAuthPanel } from '@/components/flow/integrated-poc/AlphaAuthPanel';
import { readAlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'FlowMe 개발계 로그인', robots: { index: false, follow: false } };
export default function AlphaPage() { return <AlphaAuthPanel config={readAlphaAuthConfig(process.env)} appWriting nativeAuthoringEnabled={process.env.FLOWME_ALPHA_NATIVE_AUTHORING_UI==='enabled'} readProbe={process.env.FLOWME_ALPHA_READ_PROBE==='v2'} privacyContact={process.env.FLOWME_ALPHA_PRIVACY_CONTACT} />; }
