'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, User, UserPokemon, POKEMON_TCG_API_KEY } from '@/lib/supabase';

type UserWithPokemon = User & {
  user_pokemon: UserPokemon[];
};

// Type for card image cache
type CardImageCache = Record<string, string>;

export default function PreloadedCacheUserCollection() {
  const [users, setUsers] = useState<UserWithPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState<CardImageCache>({});
  const [missingCardImages, setMissingCardImages] = useState<string[]>([]);

  // Function to fetch images from API for cards with missing images
  const fetchMissingImages = async (cardIds: string[]) => {
    if (cardIds.length === 0) return {};
    
    setLoadingImages(true);
    const newImages: CardImageCache = {};
    
    // Group cards by set to minimize API calls
    const cardsBySet: Record<string, string[]> = {};
    
    cardIds.forEach(cardId => {
      const [setId] = cardId.split('-');
      if (!setId) return;
      
      if (!cardsBySet[setId]) {
        cardsBySet[setId] = [];
      }
      
      cardsBySet[setId].push(cardId);
    });
    
    // Process each set in batches
    for (const [setId, setCardIds] of Object.entries(cardsBySet)) {
      try {
        // Try batch API call for the set
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data && Array.isArray(data.data)) {
            // Process each card in the API response
            data.data.forEach((card: any) => {
              // Match by card ID
              if (card.id && setCardIds.includes(card.id) && card.images?.small) {
                newImages[card.id] = card.images.small;
              }
              
              // Also match by set ID and number format
              if (card.set?.id && card.number) {
                const formattedId = `${card.set.id}-${card.number}`;
                if (setCardIds.includes(formattedId) && card.images?.small) {
                  newImages[formattedId] = card.images.small;
                }
              }
            });
          }
        }
        
        // For any cards not found in the batch, try individual lookups
        const remainingCardIds = setCardIds.filter(cardId => !newImages[cardId]);
        
        for (const cardId of remainingCardIds) {
          // Try individual direct API approach
          const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
            headers: {
              'X-Api-Key': POKEMON_TCG_API_KEY
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data?.images?.small) {
              newImages[cardId] = data.data.images.small;
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching images for set ${setId}:`, error);
      }
    }
    
    setLoadingImages(false);
    return newImages;
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // STEP 1: Preload all card images from the database
        const { data: allCards, error: cardsError } = await supabase
          .from('pokemon')
          .select('card_id, image_url');
        
        if (cardsError) throw cardsError;
        
        // Create the initial image cache from database
        const initialImageCache: CardImageCache = {};
        allCards.forEach(card => {
          if (card.card_id && card.image_url && !card.image_url.includes('placeholder')) {
            initialImageCache[card.card_id] = card.image_url;
          }
        });
        
        setImageCache(initialImageCache);
        
        // STEP 2: Load all users with their collections
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            user_pokemon(
              *,
              pokemon:pokemon_id(*)
            )
          `);
        
        if (error) throw error;
        
        setUsers(data as UserWithPokemon[]);
        
        // STEP 3: Identify cards with missing images
        const missingImageCardIds: string[] = [];
        data.forEach(user => {
          user.user_pokemon.forEach((item: UserPokemon) => {
            if (
              item.pokemon?.card_id && 
              !initialImageCache[item.pokemon.card_id] &&
              !missingImageCardIds.includes(item.pokemon.card_id)
            ) {
              missingImageCardIds.push(item.pokemon.card_id);
            }
          });
        });
        
        setMissingCardImages(missingImageCardIds);
        
        // STEP 4: If there are missing images, fetch them from the API
        if (missingImageCardIds.length > 0) {
          console.log(`Fetching ${missingImageCardIds.length} missing card images from API`);
          const newImages = await fetchMissingImages(missingImageCardIds);
          
          // Update the image cache with the new images
          setImageCache(prev => ({
            ...prev,
            ...newImages
          }));
        }
      } catch (err) {
        setError('Failed to load user collections');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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
      
      {loadingImages && (
        <div className="bg-gray-800 text-green-400 p-2 mb-4 rounded text-sm">
          Loading {missingCardImages.length} missing card images...
        </div>
      )}
      
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
                          (item.pokemon?.card_id && imageCache[item.pokemon.card_id]) || 
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