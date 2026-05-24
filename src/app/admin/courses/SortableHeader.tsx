'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Props {
  column: string;   // DB column name or '' for unsortable
  label: string;
  width?: string | number;
}

export default function SortableHeader({ column, label, width }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (!column) {
    return (
      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', width: width ?? undefined }}>
        {label}
      </th>
    );
  }

  const currentSort = params.get('sort');
  const currentDir = params.get('dir') ?? 'asc';

  const isActive = currentSort === column;
  // Cycle: none → asc → desc → none
  let nextSort: string | null = column;
  let nextDir: string | null = 'asc';
  if (isActive && currentDir === 'asc') { nextDir = 'desc'; }
  else if (isActive && currentDir === 'desc') { nextSort = null; nextDir = null; }

  function handleClick() {
    const next = new URLSearchParams(params.toString());
    if (nextSort) {
      next.set('sort', nextSort);
      next.set('dir', nextDir!);
    } else {
      next.delete('sort');
      next.delete('dir');
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const Icon = isActive
    ? currentDir === 'asc' ? ChevronUp : ChevronDown
    : ChevronsUpDown;

  return (
    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', whiteSpace: 'nowrap', width: width ?? undefined }}>
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: '0.875rem', fontWeight: 600,
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color 0.15s',
        }}
      >
        {label}
        <Icon size={13} style={{ opacity: isActive ? 1 : 0.45, flexShrink: 0 }} />
      </button>
    </th>
  );
}
