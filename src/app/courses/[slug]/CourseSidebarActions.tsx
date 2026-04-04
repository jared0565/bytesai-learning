'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2, PlayCircle, CheckCircle, RotateCcw } from 'lucide-react';
import SharePanel from '@/components/ui/SharePanel';

interface Props {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  initialStatus: 'saved' | 'started' | 'completed' | null;
  initialProgress: number;
  shareOnly?: boolean;
}

export default function CourseSidebarActions({
  courseId, courseSlug, courseTitle, initialStatus, initialProgress, shareOnly,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [pendingProgress, setPendingProgress] = useState(initialProgress);
  const [saving, setSaving] = useState(false);

  const isSaved = status !== null;

  async function postProgress(newStatus: 'saved' | 'started' | 'completed', newProgress: number) {
    setSaving(true);
    try {
      await fetch('/api/learner/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, status: newStatus, progressPercent: newProgress }),
      });
      setStatus(newStatus);
      setProgress(newProgress);
      setPendingProgress(newProgress);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveToggle() {
    setSaving(true);
    try {
      if (isSaved) {
        await fetch(`/api/learner/progress?courseId=${encodeURIComponent(courseId)}`, { method: 'DELETE' });
        setStatus(null);
        setProgress(0);
        setPendingProgress(0);
      } else {
        await postProgress('saved', 0);
        return; // postProgress handles setSaving
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }


  if (shareOnly) {
    return (
      <SharePanel
        url={`https://learn.bytesai.uk/courses/${courseSlug}`}
        title={courseTitle}
        compact
      />
    );
  }

  return (
    <>
      {/* Save toggle */}
      <button
        className="btn btn-outline"
        onClick={handleSaveToggle}
        disabled={saving}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {saving && !isSaved
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : isSaved
            ? <BookmarkCheck size={16} color="var(--accent)" />
            : <Bookmark size={16} />}
        {isSaved ? 'Saved' : 'Save course'}
      </button>

      {/* Progress tracker — shown when saved or started */}
      {isSaved && status !== 'completed' && (
        <div style={{
          marginTop: '0.875rem', background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '0.875rem',
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Your progress
          </p>

          {status === 'saved' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => postProgress('started', 0)}
              disabled={saving}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <PlayCircle size={14} />}
              Mark as started
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pendingProgress}
                  onChange={e => setPendingProgress(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  aria-label="Progress percentage"
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, minWidth: 38, textAlign: 'right', color: 'var(--accent)' }}>
                  {pendingProgress}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => postProgress('started', pendingProgress)}
                  disabled={saving || pendingProgress === progress}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => postProgress('completed', 100)}
                  disabled={saving}
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <CheckCircle size={13} /> Done
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Completed state */}
      {status === 'completed' && (
        <div style={{
          marginTop: '0.875rem', background: '#10b98115', border: '1px solid var(--emerald)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
            <CheckCircle size={15} /> Completed
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => postProgress('started', 50)}
            disabled={saving}
            style={{ marginTop: '0.375rem', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <RotateCcw size={11} /> Mark as in progress
          </button>
        </div>
      )}

      {/* Share */}
      <div style={{ marginTop: '0.75rem' }}>
        <SharePanel
          url={`https://learn.bytesai.uk/courses/${courseSlug}`}
          title={courseTitle}
        />
      </div>
    </>
  );
}
