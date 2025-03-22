import CardCarousel from '@/components/CardCarousel';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-12">
      <h1 className="text-6xl font-bold text-green-400 mb-16">PokeWah</h1>
      <CardCarousel />
    </main>
  );
}
