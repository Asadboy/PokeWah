import CardCarousel from '@/components/CardCarousel';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-12">
      <h1 className="text-6xl font-bold text-purple-600 mb-16">PokeWah</h1>
      <CardCarousel />
    </main>
  );
}
