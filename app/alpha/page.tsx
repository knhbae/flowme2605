import React from 'react';
import type { Metadata } from 'next';
import { AlphaAuthPanel } from '@/components/flow/integrated-poc/AlphaAuthPanel';
import { readAlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'FlowMe 개발계 로그인', robots: { index: false, follow: false } };
export default function AlphaPage() { return <AlphaAuthPanel config={readAlphaAuthConfig(process.env)} />; }
