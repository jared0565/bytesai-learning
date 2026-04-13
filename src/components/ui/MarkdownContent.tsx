import React from 'react';

// Minimal markdown renderer — server-safe, zero dependencies, webpack-compatible.
// Supports: ## headings, GFM tables, **bold**, *italic*, - bullet lists, 1. ordered lists, paragraphs.
// Intentionally limited to what insight content sections need.

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = '';

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      if (buf) { parts.push(buf); buf = ''; }
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        parts.push(
          <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {text.slice(i + 2, end)}
          </strong>
        );
        i = end + 2;
      } else {
        buf += text[i++];
      }
    } else if (text[i] === '*' && text[i + 1] !== '*') {
      if (buf) { parts.push(buf); buf = ''; }
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        parts.push(<em key={i}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
      } else {
        buf += text[i++];
      }
    } else {
      buf += text[i++];
    }
  }
  if (buf) parts.push(buf);

  return parts.length === 0 ? null : parts.length === 1 && typeof parts[0] === 'string'
    ? parts[0]
    : <>{parts}</>;
}

function parseTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'h4'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function tokenise(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    if (!t) { i++; continue; }

    // Headings
    if (t.startsWith('#### ')) { blocks.push({ kind: 'h4', text: t.slice(5) }); i++; continue; }
    if (t.startsWith('### ')) { blocks.push({ kind: 'h3', text: t.slice(4) }); i++; continue; }
    if (t.startsWith('## ')) { blocks.push({ kind: 'h2', text: t.slice(3) }); i++; continue; }

    // GFM table (header | separator | rows)
    if (isTableRow(t) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = parseTableRow(t);
      const rows: string[][] = [];
      i += 2; // skip header + separator
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // Unordered list
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph — merge consecutive non-empty non-special lines
    let text = t;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ') &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !isTableRow(lines[i].trim())
    ) {
      text += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ kind: 'para', text });
  }

  return blocks;
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', lineHeight: 1.55,
};
const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700,
  background: 'var(--bg)', color: 'var(--text-primary)',
  borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border)', verticalAlign: 'top',
};

function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.kind) {
    case 'h2':
      return <h3 key={idx} style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '1.25rem 0 0.375rem' }}>{renderInline(block.text)}</h3>;
    case 'h3':
      return <h4 key={idx} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '1rem 0 0.25rem' }}>{renderInline(block.text)}</h4>;
    case 'h4':
      return <h5 key={idx} style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0.875rem 0 0.25rem' }}>{renderInline(block.text)}</h5>;
    case 'para':
      return <p key={idx} style={{ marginBottom: '0.625rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>{renderInline(block.text)}</p>;
    case 'table':
      return (
        <div key={idx} style={{ overflowX: 'auto', margin: '0.75rem 0 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <table style={tableStyle}>
            <thead>
              <tr>{block.headers.map((h, j) => <th key={j} style={thStyle}>{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => <td key={k} style={{ ...tdStyle, borderBottom: j < block.rows.length - 1 ? '1px solid var(--border)' : 'none' }}>{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'ul':
      return (
        <ul key={idx} style={{ paddingLeft: '1.25rem', margin: '0.25rem 0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {block.items.map((item, j) => <li key={j} style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{renderInline(item)}</li>)}
        </ul>
      );
    case 'ol':
      return (
        <ol key={idx} style={{ paddingLeft: '1.25rem', margin: '0.25rem 0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {block.items.map((item, j) => <li key={j} style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{renderInline(item)}</li>)}
        </ol>
      );
  }
}

interface Props {
  children: string;
}

export default function MarkdownContent({ children }: Props) {
  const blocks = tokenise(children);
  return (
    <div style={{ fontSize: '0.9375rem' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
