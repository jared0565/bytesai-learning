'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

interface FeaturedCourse {
  id: string;
  slug: string;
  title: string;
  featured_priority: number;
  is_alison: number;
}

interface Props {
  initialCourses: FeaturedCourse[];
}

export default function FeaturedEditor({ initialCourses }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [slug, setSlug] = useState('');
  const [priority, setPriority] = useState('1');
  const [saving, setSaving] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  async function updatePriority(courseId: string, newPriority: number) {
    setSaving(courseId);
    try {
      const res = await fetch(`/api/admin/courses?id=${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_priority: newPriority }),
      });
      if (res.ok) {
        if (newPriority === 0) {
          setCourses(prev => prev.filter(c => c.id !== courseId));
        } else {
          setCourses(prev => prev.map(c => c.id === courseId ? { ...c, featured_priority: newPriority } : c)
            .sort((a, b) => b.featured_priority - a.featured_priority));
        }
      }
    } finally {
      setSaving(null);
    }
  }

  async function addBySlug() {
    if (!slug.trim()) return;
    setAddError(null);
    setSaving('add');

    // First look up course by slug via the courses API
    try {
      const searchRes = await fetch(`/api/admin/courses`);
      const data: { courses: FeaturedCourse[] } = await searchRes.json();
      const found = data.courses.find(c => c.slug === slug.trim());
      if (!found) {
        setAddError(`No course found with slug "${slug.trim()}"`);
        setSaving(null);
        return;
      }

      const res = await fetch(`/api/admin/courses?id=${found.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_priority: parseInt(priority) || 1 }),
      });

      if (res.ok) {
        setCourses(prev => {
          const existing = prev.find(c => c.id === found.id);
          const updated = existing
            ? prev.map(c => c.id === found.id ? { ...c, featured_priority: parseInt(priority) || 1 } : c)
            : [...prev, { ...found, featured_priority: parseInt(priority) || 1 }];
          return updated.sort((a, b) => b.featured_priority - a.featured_priority);
        });
        setSlug('');
        setPriority('1');
      } else {
        setAddError('Failed to update course.');
      }
    } catch {
      setAddError('Network error.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Add by slug */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Add course to featured</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2, minWidth: 200, margin: 0 }}>
            <label className="label">Course slug</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. intro-to-generative-ai"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBySlug()}
            />
          </div>
          <div className="form-group" style={{ width: 100, margin: 0 }}>
            <label className="label">Priority</label>
            <input
              type="number"
              className="input"
              min={1}
              max={100}
              value={priority}
              onChange={e => setPriority(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={addBySlug}
            disabled={saving === 'add' || !slug.trim()}
            className="btn btn-primary"
          >
            {saving === 'add' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Add'}
          </button>
        </div>
        {addError && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--rose)' }}>{addError}</p>
        )}
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Higher priority = appears first. The homepage shows the top 2 Alison courses + top 2 non-Alison courses.
        </p>
      </div>

      {/* Current featured */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem' }}>
          Current featured courses ({courses.length})
        </div>
        {courses.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No featured courses. Add one above.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Course', 'Type', 'Priority', ''].map(h => (
                  <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < courses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.625rem 1rem', maxWidth: 280 }}>
                    <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.slug}</p>
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    {c.is_alison ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>Alison</span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Standard</span>
                    )}
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={100}
                      defaultValue={c.featured_priority}
                      disabled={saving === c.id}
                      style={{ width: 70, padding: '0.25rem 0.5rem', fontSize: '0.875rem', height: 'auto' }}
                      onBlur={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val !== c.featured_priority) updatePriority(c.id, val);
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <button
                      type="button"
                      onClick={() => updatePriority(c.id, 0)}
                      disabled={saving === c.id}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--rose)', padding: '0.25rem 0.5rem' }}
                      title="Remove from featured"
                    >
                      {saving === c.id
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
