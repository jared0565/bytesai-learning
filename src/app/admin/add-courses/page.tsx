import type { Metadata } from 'next';
import AddCoursesClient from './AddCoursesClient';

export const metadata: Metadata = {
  title: 'Add Courses — Admin',
  robots: { index: false, follow: false },
};

export default function AddCoursesPage() {
  return <AddCoursesClient />;
}
