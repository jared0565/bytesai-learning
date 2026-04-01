import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'AI Lectures & Talks — BytesAI Learning',
  description: 'Free AI lectures, conference talks, and academic presentations. Curated from top universities and researchers.',
};

export default function LecturesPage() {
  redirect('/courses?category=Other+Sources+%2F+Lectures');
}
