'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PokemonCard, fetchCardWithMetrics } from '@/lib/pokemonApi';
import { Pokemon, supabase, fetchEnhancedPokemonCard } from '@/lib/supabase';
import Link from 'next/link';

export default function CardDetailPage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [dbCard, setDbCard] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try to get the card from our database
        const { data: dbPokemon, error: dbError } = await supabase
          .from('pokemon')
          .select('*')
          .eq('card_id', params.id)
          .single();
        
        if (dbError && dbError.code !== 'PGRST116') {
          console.error('Database error:', dbError);
        } else if (dbPokemon) {
          setDbCard(dbPokemon as Pokemon);
        }
        
        // Try to get card using enhanced fetching methods that use multiple strategies
        try {
          // First try the enhanced approach from supabase.ts
          console.log(`Attempting to fetch card ${params.id} with enhanced method first`);
          const enhancedCard = await fetchEnhancedPokemonCard(params.id);
          
          if (enhancedCard) {
            console.log(`Successfully found card ${params.id} using enhanced method`);
            setCard(enhancedCard as PokemonCard);
            return;
          }
        } catch (enhancedError) {
          console.log(`Enhanced card fetch failed, falling back to API method:`, enhancedError);
        }
        
        // Fall back to the regular API method
        console.log(`Falling back to regular API method for card ${params.id}`);
        const apiCard = await fetchCardWithMetrics(params.id);
        
        if (apiCard) {
          setCard(apiCard);
        } else {
          throw new Error(`Could not find card with ID: ${params.id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card');
        console.error('Error loading card:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadCard();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-xl text-green-400">Loading card details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-xl text-red-500">Error: {error}</div>
          <Link href="/" className="mt-4 inline-block text-white underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-xl text-white">No card found with ID: {params.id}</div>
          <Link href="/" className="mt-4 inline-block text-white underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Card Image */}
          <div className="md:w-1/2">
            <div className="relative aspect-[2/3] w-full mb-4">
              <Image
                src={card.images.large}
                alt={card.name}
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>
          </div>
          
          {/* Card Details */}
          <div className="md:w-1/2 space-y-4">
            <h1 className="text-3xl font-bold text-green-400">{card.name}</h1>
            
            {/* Card Set */}
            {dbCard?.set_name && (
              <div>
                <span className="text-gray-400">Set:</span>
                <span className="ml-2 text-white">{dbCard.set_name}</span>
              </div>
            )}
            
            {/* Card Rarity */}
            {dbCard?.rarity && (
              <div>
                <span className="text-gray-400">Rarity:</span>
                <span className="ml-2 text-white">{dbCard.rarity}</span>
              </div>
            )}
            
            {/* Card Types */}
            {dbCard?.types && dbCard.types.length > 0 && (
              <div>
                <span className="text-gray-400">Types:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dbCard.types.map((type) => (
                    <span 
                      key={type} 
                      className="px-3 py-1 bg-gray-800 text-white rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Card HP */}
            {dbCard?.hp && (
              <div>
                <span className="text-gray-400">HP:</span>
                <span className="ml-2 text-white font-bold">{dbCard.hp}</span>
              </div>
            )}

            {/* Artist */}
            {dbCard?.artist && (
              <div>
                <span className="text-gray-400">Artist:</span>
                <span className="ml-2 text-white">{dbCard.artist}</span>
              </div>
            )}
            
            {/* Market Data if available */}
            {card.cardmarket && (
              <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-green-400 mb-2">Market Data</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400">Avg. Price:</span>
                    <span className="ml-2 text-white">
                      €{card.cardmarket.prices.averageSellPrice?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Low Price:</span>
                    <span className="ml-2 text-white">
                      €{card.cardmarket.prices.lowPrice?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Trend:</span>
                    <span className="ml-2 text-white">
                      €{card.cardmarket.prices.trendPrice?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Updated:</span>
                    <span className="ml-2 text-white">
                      {new Date(card.cardmarket.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={card.cardmarket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    View on Cardmarket
                  </a>
                </div>
              </div>
            )}
            
            <div className="pt-4">
              <Link 
                href="/collections" 
                className="text-green-400 hover:text-green-300 flex items-center"
              >
                ← Back to collections
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 