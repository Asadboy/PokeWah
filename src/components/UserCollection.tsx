'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getAllUsersWithPokemon, User, UserPokemon, POKEMON_TCG_API_KEY } from '@/lib/supabase';

type UserWithPokemon = User & {
  user_pokemon: UserPokemon[];
};

export default function UserCollection() {
  const [users, setUsers] = useState<UserWithPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardImages, setCardImages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const data = await getAllUsersWithPokemon();
        setUsers(data as UserWithPokemon[]);

        // Extract all unique card IDs
        const cardIds = new Set<string>();
        data.forEach(user => {
          user.user_pokemon.forEach((item: UserPokemon) => {
            if (item.pokemon?.card_id) {
              cardIds.add(item.pokemon.card_id);
            }
          });
        });

        // Fetch enhanced card images for each card
        const images: Record<string, string> = {};
        
        for (const cardId of Array.from(cardIds)) {
          try {
            // First try direct API approach
            const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
              headers: {
                'X-Api-Key': POKEMON_TCG_API_KEY
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.data?.images?.small) {
                images[cardId] = data.data.images.small;
                continue;
              }
            }
            
            // If direct approach fails, try extracting set ID and number
            const [setId, cardNumber] = cardId.split('-');
            if (setId && cardNumber) {
              // Try searching by number and set
              const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${cardNumber} set.id:${setId}`;
              const numberSearchResponse = await fetch(numberSearchURL, {
                headers: {
                  'X-Api-Key': POKEMON_TCG_API_KEY
                }
              });
              
              if (numberSearchResponse.ok) {
                const numberSearchData = await numberSearchResponse.json();
                if (numberSearchData.data && numberSearchData.data.length > 0) {
                  images[cardId] = numberSearchData.data[0].images.small;
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching card image for ${cardId}:`, error);
          }
        }
        
        setCardImages(images);
      } catch (err) {
        setError('Failed to load user collections');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="text-center text-green-400 text-xl">Loading collections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="text-center text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Trainer Collections</h2>
      
      <div className="space-y-8">
        {users.map((user) => (
          <div key={user.id} className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-green-400 mb-4">{user.username}'s Collection</h3>
            
            {user.user_pokemon.length === 0 ? (
              <p className="text-gray-400">No Pokémon in collection yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {user.user_pokemon.map((item) => (
                  <Link 
                    href={`/card/${item.pokemon?.card_id}`}
                    key={item.id} 
                    className="bg-gray-800 rounded-lg p-3 border border-gray-700 transition hover:border-green-400"
                  >
                    <div className="aspect-square relative mb-2">
                      <Image
                        src={
                          (item.pokemon?.card_id && cardImages[item.pokemon.card_id]) || 
                          item.pokemon?.image_url || 
                          '/placeholder-pokemon.png'
                        }
                        alt={item.pokemon?.name || 'Unknown Pokémon'}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-white text-center">{item.pokemon?.name}</p>
                    <p className="text-xs text-gray-400 text-center">
                      Acquired: {new Date(item.acquired_date).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 