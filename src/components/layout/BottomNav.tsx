'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, MessageCircle, GraduationCap, User, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BottomNavProps {
  userRole?: 'learner' | 'admin' | null;
}

export default function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Listen for unread count updates from Chatbot
  // Must be before any early returns — React Rules of Hooks
  useEffect(() => {
    function onUnread(e: Event) {
      const count = (e as CustomEvent<number>).detail;
      setUnread(count);
    }
    window.addEventListener('bytesai:unread', onUnread);
    return () => window.removeEventListener('bytesai:unread', onUnread);
  }, []);

  // Hide on admin pages — they have their own sidebar nav
  if (pathname.startsWith('/admin')) return null;
  // Hide on auth pages — cleaner experience
  if (pathname.startsWith('/auth')) return null;

  // Active state: exact for '/', prefix match for others
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function openChat() {
    window.dispatchEvent(new CustomEvent('bytesai:openchat'));
  }

  const learningHref = userRole ? '/my-learning' : '/auth/login';
  const profileHref = userRole === 'admin' ? '/admin' : userRole ? '/profile' : '/auth/login';

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {/* Home */}
      <Link
        href="/"
        className={`bottom-nav-item${isActive('/') ? ' active' : ''}`}
        aria-label="Home"
        aria-current={isActive('/') ? 'page' : undefined}
      >
        <Home />
        <span>Home</span>
      </Link>

      {/* Courses */}
      <Link
        href="/courses"
        className={`bottom-nav-item${isActive('/courses') ? ' active' : ''}`}
        aria-label="Browse Courses"
        aria-current={isActive('/courses') ? 'page' : undefined}
      >
        <BookOpen />
        <span>Courses</span>
      </Link>

      {/* Chat — elevated center button */}
      <button
        className="bottom-nav-chat"
        onClick={openChat}
        aria-label="Open course navigator"
        type="button"
      >
        <span className="bottom-nav-chat-bubble">
          <MessageCircle size={22} strokeWidth={2} />
          {unread > 0 && (
            <span className="bottom-nav-chat-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </span>
        <span className="bottom-nav-chat-label">Chat</span>
      </button>

      {/* My Learning */}
      <Link
        href={learningHref}
        className={`bottom-nav-item${isActive('/my-learning') || isActive('/dashboard') ? ' active' : ''}`}
        aria-label="My Learning"
        aria-current={isActive('/my-learning') || isActive('/dashboard') ? 'page' : undefined}
      >
        <GraduationCap />
        <span>Learning</span>
      </Link>

      {/* Profile / Admin */}
      <Link
        href={profileHref}
        className={`bottom-nav-item${isActive('/profile') || isActive('/admin') ? ' active' : ''}`}
        aria-label={userRole === 'admin' ? 'Admin panel' : 'Profile'}
        aria-current={isActive('/profile') || isActive('/admin') ? 'page' : undefined}
      >
        {userRole === 'admin' ? <ShieldCheck /> : <User />}
        <span>{userRole === 'admin' ? 'Admin' : 'Profile'}</span>
      </Link>
    </nav>
  );
}
