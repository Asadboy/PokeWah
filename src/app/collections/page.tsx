import PreloadedCacheUserCollection from '@/components/PreloadedCacheUserCollection';

export default function CollectionsPage() {
  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-green-400 text-center mb-8">
          Pokémon Collections
        </h1>
        <PreloadedCacheUserCollection />
      </div>
    </main>
  );
} 