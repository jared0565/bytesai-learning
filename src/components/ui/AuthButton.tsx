'use client';

import { useState } from 'react';
import AuthModal from './AuthModal';

interface AuthButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  tab?: 'login' | 'register';
}

export default function AuthButton({ className, style, children, tab = 'register' }: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} style={style} onClick={() => setOpen(true)}>
        {children}
      </button>
      <AuthModal open={open} onClose={() => setOpen(false)} initialTab={tab} />
    </>
  );
}
