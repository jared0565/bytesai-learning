import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.role !== 'admin') redirect('/auth/login');

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)' }}>
      <AdminSidebar email={session.email} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
