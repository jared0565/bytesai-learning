'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import CourseDiscoveryModal from './CourseDiscoveryModal';

interface ProviderSummary {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  course_count: number;
}

export default function ProviderDiscoveryButton({ provider }: { provider: ProviderSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(true)}
        style={{ minHeight: 36, padding: '0.45rem 0.75rem', gap: '0.35rem' }}
      >
        <Search size={13} />
        Discover
      </button>
      <CourseDiscoveryModal provider={provider} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
