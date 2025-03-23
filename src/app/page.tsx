import CardCarousel from '@/components/CardCarousel';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-12">
      <h1 className="text-6xl font-bold text-green-400 mb-8">PokeWah</h1>
      
      <div className="flex gap-4 mb-16">
        <Link 
          href="/collections" 
          className="px-6 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 transition"
        >
          View Collections
        </Link>
      </div>
      
      <CardCarousel />
    </main>
  );
}
