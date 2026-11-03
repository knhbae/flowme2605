import React from 'react';
import type { Metadata } from 'next';
import { AlphaAuthPanel } from '@/components/flow/integrated-poc/AlphaAuthPanel';
import { readAlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'FlowMe 로그인 확인', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function CallbackPage() { return <AlphaAuthPanel config={readAlphaAuthConfig(process.env)} callback />; }
