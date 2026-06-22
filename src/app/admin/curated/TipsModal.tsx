'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Sparkles, CheckCircle2, Save } from 'lucide-react';
import InlineCrossPostComposer from '@/components/ui/InlineCrossPostComposer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  what_changed: string | null;
  executive_implications: string | null;
  primary_course_rationale: string | null;
  primary_course_slug: string | null;
  categories_json: string | null;
  related_course_slugs_json: string | null;
  source_references_json: string | null;
  meta_title: string | null;
  meta_description: string | null;
  editorial_review_status: string;
  published_status: string;
}

interface Tip {
  level: 'error' | 'warn' | 'info';
  text: string;
}

interface TipConfig {
  field: keyof PageData | 'editorial_review_status';
  label: string;
  instruction: string;
  rows: number;
  placeholder: string;
}

interface Props {
  pageId: string;
  onClose: () => void;
  onSaved: (id: string, updates: Record<string, string | null>) => void;
}

// ── Tip computation (mirrors logic in page.tsx) ─────────────────────────────────

function getTips(p: PageData): Tip[] {
  const tips: Tip[] = [];

  if (!p.why_it_matters) tips.push({ level: 'error', text: '"Why it matters" is empty — readers need this section most.' });
  if (!p.what_changed) tips.push({ level: 'error', text: '"What changed" is empty — the key facts are missing.' });
  if (!p.executive_implications) tips.push({ level: 'error', text: '"Key implications" is empty — no actionable takeaway for readers.' });

  if (!p.primary_course_slug) tips.push({ level: 'warn', text: 'No course linked — add a primary course slug to monetise this article.' });
  if (!p.meta_description) tips.push({ level: 'warn', text: 'No meta description — add one to improve search ranking.' });
  if (p.summary && p.summary.length > 400) tips.push({ level: 'warn', text: 'Summary is too long — aim for 2–3 sentences max.' });
  if (p.meta_description && p.meta_description.length > 155) tips.push({ level: 'warn', text: `Meta description is ${p.meta_description.length} chars — trim to under 155.` });
  if (p.published_status === 'published' && p.editorial_review_status !== 'approved') {
    tips.push({ level: 'warn', text: 'Published but not approved — set editorial status to "approved".' });
  }

  if (p.published_status === 'published') {
    tips.push({ level: 'info', text: 'Article is live — cross-post to social platforms for reach.' });
  }

  if (p.published_status === 'draft' && p.editorial_review_status === 'approved') {
    tips.push({ level: 'info', text: 'Approved but still draft — ready to publish!' });
  }

  return tips;
}

// ── Map a tip to an editable field + AI instruction ───────────────────────────

function getTipConfig(tip: Tip): TipConfig | null {
  const text = tip.text;

  if (text.includes('Summary is too long')) {
    return {
      field: 'summary',
      label: 'Summary',
      instruction: 'Make this article summary concise: 2–3 sentences, under 400 characters, keep the key hook and remove filler.',
      rows: 3,
      placeholder: 'Short TL;DR for the article lead.',
    };
  }

  if (text.includes('No meta description')) {
    return {
      field: 'meta_description',
      label: 'Meta description',
      instruction: 'Write an SEO meta description under 155 characters for this article. Factual, keyword-rich, no fluff.',
      rows: 2,
      placeholder: 'Search result snippet (under 155 chars).',
    };
  }

  if (text.includes('Meta description is')) {
    return {
      field: 'meta_description',
      label: 'Meta description',
      instruction: 'Trim this meta description to under 155 characters while keeping it compelling and factual.',
      rows: 2,
      placeholder: 'Search result snippet (under 155 chars).',
    };
  }

  if (text.includes('"Why it matters" is empty')) {
    return {
      field: 'why_it_matters',
      label: 'Why it matters',
      instruction: 'Write a 3–5 sentence "Why it matters" section. Frame risk + opportunity, include one specific use-case, the mechanism, and one honest limitation.',
      rows: 5,
      placeholder: 'Explain real-world significance.',
    };
  }

  if (text.includes('"What changed" is empty')) {
    return {
      field: 'what_changed',
      label: 'What changed',
      instruction: 'Write a 3–5 sentence "What changed" section. Quantify the development, explain how it works, what specifically changed, and include one current limitation.',
      rows: 5,
      placeholder: 'Describe the development or breakthrough.',
    };
  }

  if (text.includes('"Key implications" is empty')) {
    return {
      field: 'executive_implications',
      label: 'Key implications',
      instruction: 'Write a time-boxed action playbook using exact headings: **This week**, **This quarter**, **This year**. Provide 2–3 specific bullet actions under each.',
      rows: 6,
      placeholder: 'This week / This quarter / This year actions.',
    };
  }

  if (text.includes('Published but not approved')) {
    return {
      field: 'editorial_review_status',
      label: 'Editorial status',
      instruction: '',
      rows: 1,
      placeholder: '',
    };
  }

  // Generic fallback for unrecognised tips
  return {
    field: 'summary',
    label: 'Summary',
    instruction: `Fix the following issue for this article: ${text}`,
    rows: 4,
    placeholder: 'Edit the article summary to address this tip.',
  };
}

// ── Components ────────────────────────────────────────────────────────────────

export default function TipsModal({ pageId, onClose, onSaved }: Props) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Draft values for each field we may edit
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string | null>>({});
  const [rewritingField, setRewritingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load page data
  useEffect(() => {
    fetch(`/api/admin/curated?id=${pageId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadError(d.error); return; }
        const p: PageData = d.page;
        setPage(p);
        setDrafts({
          summary: p.summary ?? '',
          why_it_matters: p.why_it_matters ?? '',
          what_changed: p.what_changed ?? '',
          executive_implications: p.executive_implications ?? '',
          meta_description: p.meta_description ?? '',
        });
      })
      .catch(() => setLoadError('Failed to load article.'))
      .finally(() => setLoading(false));
  }, [pageId]);

  if (loading) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div className="card" style={{ ...modalStyle, textAlign: 'center', padding: '3rem' }} onClick={e => e.stopPropagation()}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading article tips…</p>
        </div>
      </div>
    );
  }

  if (loadError || !page) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div className="card" style={{ ...modalStyle, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--rose)', marginBottom: '1rem' }}>
            <AlertCircle size={18} /> <span>{loadError || 'Article not found.'}</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const tips = getTips(page);

  if (tips.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div className="card" style={{ ...modalStyle, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--emerald)', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} /> <span style={{ fontWeight: 700 }}>No tips</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            This article looks good. No improvement suggestions right now.
          </p>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const errorTips = tips.filter(t => t.level === 'error');
  const warnTips = tips.filter(t => t.level === 'warn');
  const infoTips = tips.filter(t => t.level === 'info');

  function updateDraft(field: string, value: string) {
    setDrafts(prev => ({ ...prev, [field]: value }));
  }

  async function suggestFix(field: string, instruction: string, currentText: string) {
    if (!currentText.trim() && field !== 'meta_description') return;
    setRewritingField(field);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/article-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText || '',
          instruction,
          context: page?.title || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'AI suggestion failed.');
        return;
      }
      setAiSuggestions(prev => ({ ...prev, [field]: data.rewritten }));
      updateDraft(field, data.rewritten);
    } catch {
      setSaveError('Network error — could not reach AI rewrite service.');
    } finally {
      setRewritingField(null);
    }
  }

  async function applyField(field: keyof PageData, value: string) {
    setSavingField(field);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {};
      if (field === 'editorial_review_status') {
        body.editorial_review_status = value;
      } else {
        body[field] = value.trim() || null;
      }

      const res = await fetch(`/api/admin/curated?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Save failed.');
        return;
      }
      onSaved(pageId, { [field]: value.trim() || null });
      setAiSuggestions(prev => ({ ...prev, [field]: null }));
    } catch {
      setSaveError('Network error — could not save changes.');
    } finally {
      setSavingField(null);
    }
  }

  function approveArticle() {
    applyField('editorial_review_status', 'approved');
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="card" style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Improvement tips</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              {page.title}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {saveError && (
            <div style={{
              marginBottom: '1rem', padding: '0.625rem 0.875rem',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius)', color: 'var(--rose)', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <AlertCircle size={14} /> {saveError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {errorTips.length > 0 && (
              <TipGroup title="Errors" tips={errorTips} color="var(--rose)" icon="⚠" page={page} drafts={drafts} aiSuggestions={aiSuggestions} rewritingField={rewritingField} savingField={savingField} onDraftChange={updateDraft} onSuggest={suggestFix} onApply={applyField} onApprove={approveArticle} />
            )}
            {warnTips.length > 0 && (
              <TipGroup title="Warnings" tips={warnTips} color="var(--amber)" icon="💡" page={page} drafts={drafts} aiSuggestions={aiSuggestions} rewritingField={rewritingField} savingField={savingField} onDraftChange={updateDraft} onSuggest={suggestFix} onApply={applyField} onApprove={approveArticle} />
            )}
            {infoTips.length > 0 && (
              <TipGroup title="Suggestions" tips={infoTips} color="var(--teal)" icon="✓" page={page} drafts={drafts} aiSuggestions={aiSuggestions} rewritingField={rewritingField} savingField={savingField} onDraftChange={updateDraft} onSuggest={suggestFix} onApply={applyField} onApprove={approveArticle} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
        }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── TipGroup sub-component ────────────────────────────────────────────────────

interface TipGroupProps {
  title: string;
  tips: Tip[];
  color: string;
  icon: string;
  page: PageData;
  drafts: Record<string, string>;
  aiSuggestions: Record<string, string | null>;
  rewritingField: string | null;
  savingField: string | null;
  onDraftChange: (field: string, value: string) => void;
  onSuggest: (field: string, instruction: string, currentText: string) => void;
  onApply: (field: keyof PageData, value: string) => void;
  onApprove: () => void;
}

function TipGroup({ title, tips, color, icon, page, drafts, aiSuggestions, rewritingField, savingField, onDraftChange, onSuggest, onApply, onApprove }: TipGroupProps) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: '0.75rem' }}>
        {icon} {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {tips.map((tip, idx) => (
          <TipEditor
            key={`${tip.level}-${idx}`}
            tip={tip}
            page={page}
            draftValue={drafts}
            aiSuggestion={aiSuggestions}
            rewritingField={rewritingField}
            savingField={savingField}
            onDraftChange={onDraftChange}
            onSuggest={onSuggest}
            onApply={onApply}
            onApprove={onApprove}
          />
        ))}
      </div>
    </div>
  );
}

// ── Individual tip editor ───────────────────────────────────────────────────────

interface TipEditorProps {
  tip: Tip;
  page: PageData;
  draftValue: Record<string, string>;
  aiSuggestion: Record<string, string | null>;
  rewritingField: string | null;
  savingField: string | null;
  onDraftChange: (field: string, value: string) => void;
  onSuggest: (field: string, instruction: string, currentText: string) => void;
  onApply: (field: keyof PageData, value: string) => void;
  onApprove: () => void;
}

function TipEditor({ tip, page, draftValue, aiSuggestion, rewritingField, savingField, onDraftChange, onSuggest, onApply, onApprove }: TipEditorProps) {
  const isCrossPostTip = tip.text.includes('cross-post to social platforms');

  return (
    <div style={{
      padding: '1rem',
      background: tip.level === 'error' ? 'rgba(239,68,68,0.04)'
        : tip.level === 'warn' ? 'rgba(245,158,11,0.04)'
        : 'rgba(20,184,166,0.04)',
      border: `1px solid ${tip.level === 'error' ? 'rgba(239,68,68,0.15)'
        : tip.level === 'warn' ? 'rgba(245,158,11,0.15)'
        : 'rgba(20,184,166,0.15)'}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <p style={{
        fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5,
        color: tip.level === 'error' ? 'var(--rose)' : tip.level === 'warn' ? 'var(--amber)' : 'var(--teal)',
        marginBottom: '0.75rem',
      }}>
        {tip.text}
      </p>

      {isCrossPostTip ? (
        <InlineCrossPostComposer slug={page.slug} title={page.title} />
      ) : (
        <StandardTipEditor
          tip={tip}
          page={page}
          draftValue={draftValue}
          aiSuggestion={aiSuggestion}
          rewritingField={rewritingField}
          savingField={savingField}
          onDraftChange={onDraftChange}
          onSuggest={onSuggest}
          onApply={onApply}
          onApprove={onApprove}
        />
      )}
    </div>
  );
}

function StandardTipEditor({ tip, page, draftValue, aiSuggestion, rewritingField, savingField, onDraftChange, onSuggest, onApply, onApprove }: TipEditorProps) {
  const config = getTipConfig(tip);
  if (!config) return null;

  const isStatusTip = config.field === 'editorial_review_status';
  const fieldKey = config.field as string;
  const currentValue = isStatusTip
    ? page.editorial_review_status
    : draftValue[fieldKey] ?? (page[config.field as keyof PageData] as string | null) ?? '';
  const hasSuggestion = !!aiSuggestion[fieldKey];
  const isRewriting = rewritingField === fieldKey;
  const isSaving = savingField === fieldKey;

  return (
    <>
      {isStatusTip ? (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Current status: <strong>{page.editorial_review_status}</strong>
          </span>
          <button
            className="btn btn-sm"
            onClick={onApprove}
            disabled={isSaving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--emerald)', color: '#fff', border: 'none' }}
          >
            {isSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />}
            Set to approved
          </button>
        </div>
      ) : (
        <>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
            {config.label}
          </label>
          <textarea
            className="input"
            rows={config.rows}
            value={currentValue}
            onChange={e => onDraftChange(fieldKey, e.target.value)}
            placeholder={config.placeholder}
            style={{ width: '100%', resize: 'vertical', marginBottom: '0.5rem' }}
          />
          {hasSuggestion && (
            <p style={{ fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
              ✨ AI suggestion loaded. Edit above before applying.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onSuggest(fieldKey, config.instruction, currentValue)}
              disabled={isRewriting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)', borderColor: 'rgba(79,110,247,0.35)' }}
            >
              {isRewriting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
              {isRewriting ? 'Suggesting…' : 'AI suggest fix'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onApply(config.field as keyof PageData, draftValue[fieldKey] ?? currentValue)}
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isSaving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
              {isSaving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  width: '100%', maxWidth: 720,
  maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
  padding: 0,
};
