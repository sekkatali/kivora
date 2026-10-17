'use client';
import { useEffect } from 'react';
import { captureAttribution } from '@/lib/track';

export default function Attribution() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
