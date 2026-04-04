'use client';

export default function CookieSettingsButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('bytesai:cookie-preferences'))}
      className="footer-link"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        display: 'block',
        width: '100%',
      }}
    >
      Cookie Settings
    </button>
  );
}
