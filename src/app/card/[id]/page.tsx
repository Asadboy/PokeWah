'use client';
//Commented out for now because it's not needed
import { useEffect, useState } from 'react';
import { PokemonCard, fetchCardWithMetrics } from '@/lib/pokemonApi';
import PokeWahCard from '@/components/PokeWahCard';

export default function CardPage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCard = async () => {
      try {
        setLoading(true);
        setError(null);
        const cardData = await fetchCardWithMetrics(params.id);
        setCard(cardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl font-semibold text-black">Loading card details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl font-semibold text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl font-semibold text-black">Card not found</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-black text-center mb-8">
          {card.name}
        </h1>
        <PokeWahCard card={card} />
      </div>
    </main>
  );
} 