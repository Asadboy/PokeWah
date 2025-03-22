'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PokemonCard, fetchCardByName } from '@/lib/pokemonApi';

interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text?: string;
}

export default function CardDisplay() {
  // State to store the card data and loading state
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch the Drowzee card
    const loadCard = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch the Drowzee card
        const drowzeeCard = await fetchCardByName('Drowzee');
        setCard(drowzeeCard);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };

    // Call the function when component mounts
    loadCard();
  }, []);

  // Show loading state
  if (loading) {
    return <div className="text-center text-xl text-black">Loading Drowzee card...</div>;
  }

  // Show error state
  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  // Show card data
  if (!card) {
    return <div className="text-center text-black">No card found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto">
      {/* Card Image */}
      <div className="relative aspect-[2/3] mb-4">
        <Image
          src={card?.images.large || ''}
          alt={card?.name || 'Pokemon Card'}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>

      {/* Card Details */}
      <div className="space-y-2 text-black">
        <h2 className="text-2xl font-bold">{card?.name}</h2>
        
        {/* Types */}
        {card?.types && card.types.length > 0 && (
          <div className="flex gap-2">
            {card.types.map((type: string) => (
              <span
                key={type}
                className="px-3 py-1 rounded-full bg-gray-200 text-black"
              >
                {type}
              </span>
            ))}
          </div>
        )}

        {/* HP */}
        {card?.hp && (
          <div className="text-lg">
            HP: <span className="font-bold">{card.hp}</span>
          </div>
        )}

        {/* Attacks */}
        {card?.attacks && card.attacks.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Attacks:</h3>
            {card.attacks.map((attack: Attack, index: number) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{attack.name}</span>
                  <span className="font-bold">{attack.damage}</span>
                </div>
                <div className="flex gap-1">
                  {attack.cost.map((cost: string, costIndex: number) => (
                    <span
                      key={costIndex}
                      className="text-sm text-black"
                    >
                      {cost}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 