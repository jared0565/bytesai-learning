export const runtime = 'edge';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'AI Books & Reading — BytesAI Learning',
  description: 'Free AI books, textbooks, and reading sources. From deep learning fundamentals to multi-agent systems.',
};

export default function BooksPage() {
  redirect('/courses?category=Books+%2F+Reading+Sources');
}
