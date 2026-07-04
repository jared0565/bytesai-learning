'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Link2, Search, PlusCircle, FileUp } from 'lucide-react';
import AlisonPanel from '@/app/admin/alison-import/AlisonPanel';
import AddCourseForm from '@/app/admin/courses/AddCourseForm';
import BatchCourseImport from '@/app/admin/courses/BatchCourseImport';
import DiscoveryPanel from '@/app/admin/courses/DiscoveryPanel';

const SECTIONS = [
  {
    key: 'alison',
    label: 'Alison',
    description: 'Search the Alison catalog and import affiliate courses with full metadata',
    icon: <Download size={16} />,
    defaultOpen: true,
  },
  {
    key: 'manual',
    label: 'Add by URL or Manual Entry',
    description: 'Paste any course URL to auto-fetch metadata, or fill in all fields by hand',
    icon: <Link2 size={16} />,
    defaultOpen: false,
  },
  {
    key: 'batch',
    label: 'Batch Import',
    description: 'Upload a JSON or Markdown file and import multiple courses with required briefs',
    icon: <FileUp size={16} />,
    defaultOpen: false,
  },
  {
    key: 'discovery',
    label: 'Discover via Provider',
    description: 'Scan a provider\'s catalog to surface courses not yet in the database',
    icon: <Search size={16} />,
    defaultOpen: false,
  },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

export default function AddCoursesClient() {
  const [open, setOpen] = useState<Set<SectionKey>>(
    new Set(SECTIONS.filter(s => s.defaultOpen).map(s => s.key))
  );

  function toggle(key: SectionKey) {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <PlusCircle size={22} color="var(--accent)" />
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.1rem' }}>Add Courses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Import from Alison, add by URL, or discover courses from provider catalogs.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Section 1 — Alison */}
        <Section
          sectionKey="alison"
          label="Alison"
          description="Search the Alison catalog and import affiliate courses with full metadata"
          icon={<Download size={16} />}
          isOpen={open.has('alison')}
          onToggle={() => toggle('alison')}
        >
          <AlisonPanel />
        </Section>

        {/* Section 2 — URL / Manual */}
        <Section
          sectionKey="manual"
          label="Add by URL or Manual Entry"
          description="Paste any course URL to auto-fetch metadata, or fill in all fields by hand"
          icon={<Link2 size={16} />}
          isOpen={open.has('manual')}
          onToggle={() => toggle('manual')}
        >
          <div style={{ padding: '1.5rem 2rem' }}>
            <AddCourseForm />
          </div>
        </Section>

        {/* Section 3 — Batch import */}
        <Section
          sectionKey="batch"
          label="Batch Import"
          description="Upload a JSON or Markdown file and import multiple courses with required briefs"
          icon={<FileUp size={16} />}
          isOpen={open.has('batch')}
          onToggle={() => toggle('batch')}
        >
          <div style={{ padding: '1.5rem 2rem' }}>
            <BatchCourseImport />
          </div>
        </Section>

        {/* Section 4 — Discovery */}
        <Section
          sectionKey="discovery"
          label="Discover via Provider"
          description="Scan a provider's catalog to surface courses not yet in the database"
          icon={<Search size={16} />}
          isOpen={open.has('discovery')}
          onToggle={() => toggle('discovery')}
        >
          <div style={{ padding: '1.5rem 2rem' }}>
            <DiscoveryPanel />
          </div>
        </Section>
      </div>
    </div>
  );
}

interface SectionProps {
  sectionKey: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ label, description, icon, isOpen, onToggle, children }: SectionProps) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '1.125rem 1.5rem',
          background: isOpen ? 'var(--bg-card)' : 'transparent',
          border: 'none',
          borderBottom: isOpen ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover, rgba(255,255,255,0.03))';
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{label}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{description}</p>
        </div>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </span>
      </button>

      {isOpen && <div>{children}</div>}
    </div>
  );
}
