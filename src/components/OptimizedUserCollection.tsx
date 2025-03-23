'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, User, UserPokemon, POKEMON_TCG_API_KEY } from '@/lib/supabase';

type Card = {
  id: string;
  card_id: string;
  name: string;
  image_url: string;
  set_name?: string;
  rarity?: string;
};

type CollectionItem = {
  id: string;
  acquired_date: string;
  pokemon: Card;
  user_id: string;
};

type UserCollection = {
  id: string;
  username: string;
  items: CollectionItem[];
  totalItems: number;
  currentPage: number;
  hasMore: boolean;
};

export default function OptimizedUserCollection() {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  // Function to fetch a batch of cards from Pokemon TCG API by set ID
  const fetchCardBatchBySet = useCallback(async (setId: string, cardIds: string[]) => {
    try {
      // Make a single API call for all cards in this set
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });

      if (!response.ok) return {};

      const data = await response.json();
      
      // Create a map of card_id -> image URL
      const cardImageMap: Record<string, string> = {};
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((card: any) => {
          // We create keys in both formats: with and without set prefix
          // This makes lookup more flexible
          if (card.id) {
            cardImageMap[card.id] = card.images?.small;
          }
          
          if (card.set?.id && card.number) {
            cardImageMap[`${card.set.id}-${card.number}`] = card.images?.small;
          }
        });
      }
      
      return cardImageMap;
    } catch (error) {
      console.error(`Error fetching batch for set ${setId}:`, error);
      return {};
    }
  }, []);

  // Function to load card images for a specific collection
  const loadCardImages = useCallback(async (cards: Card[]) => {
    try {
      // Group cards by set ID
      const cardsBySet: Record<string, string[]> = {};
      
      cards.forEach(card => {
        if (!card.card_id) return;
        
        const [setId] = card.card_id.split('-');
        if (!setId) return;
        
        if (!cardsBySet[setId]) {
          cardsBySet[setId] = [];
        }
        
        cardsBySet[setId].push(card.card_id);
      });
      
      // Create a map to store image URLs
      const imageMap: Record<string, string> = {};
      
      // Fetch card images in batches, by set
      for (const [setId, cardIdsInSet] of Object.entries(cardsBySet)) {
        const batchImages = await fetchCardBatchBySet(setId, cardIdsInSet);
        Object.assign(imageMap, batchImages);
      }
      
      return imageMap;
    } catch (error) {
      console.error('Error loading card images:', error);
      return {};
    }
  }, [fetchCardBatchBySet]);

  // Function to load more cards for a specific user
  const loadMoreCards = useCallback(async (userId: string, page: number) => {
    try {
      setLoading(true);
      
      // Calculate range for pagination
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      // Fetch paginated cards for this user
      const { data: userPokemon, error: pokemonError, count } = await supabase
        .from('user_pokemon')
        .select(`
          id,
          acquired_date,
          user_id,
          pokemon:pokemon_id(*)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('acquired_date', { ascending: false })
        .range(start, end);
      
      if (pokemonError) throw pokemonError;
      
      if (!userPokemon) {
        return false;
      }
      
      // Get unique cards to fetch images for
      const cardsToFetchImages: Card[] = userPokemon
        .map(item => item.pokemon as unknown as Card)
        .filter(Boolean);
      
      // Fetch images in batch by set
      const cardImages = await loadCardImages(cardsToFetchImages);
      
      // Update the cards with images from API where available
      const enhancedItems: CollectionItem[] = userPokemon.map(item => {
        const pokemon = item.pokemon as unknown as Card;
        return {
          id: item.id,
          acquired_date: item.acquired_date,
          user_id: item.user_id,
          pokemon: {
            ...pokemon,
            image_url: cardImages[pokemon.card_id] || pokemon.image_url
          }
        };
      });
      
      // Update collections
      setCollections(prev => prev.map(collection => {
        if (collection.id === userId) {
          // Check if there are more items to load
          const hasMore = count ? (collection.totalItems > (page + 1) * pageSize) : false;
          
          return {
            ...collection,
            items: page === 0 ? enhancedItems : [...collection.items, ...enhancedItems],
            currentPage: page,
            hasMore
          };
        }
        return collection;
      }));
      
      return true;
    } catch (error) {
      console.error(`Error loading more cards for user ${userId}:`, error);
      setError('Failed to load more cards');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCardImages, pageSize]);

  // Initial data loading
  useEffect(() => {
    async function loadInitialData() {
      try {
        setInitialLoading(true);
        
        // First fetch all users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username');
        
        if (usersError) throw usersError;
        
        if (!users) {
          throw new Error('No users found');
        }
        
        // For each user, get the count of cards they have
        const userCollections: UserCollection[] = [];
        
        for (const user of users) {
          const { count, error: countError } = await supabase
            .from('user_pokemon')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          if (countError) throw countError;
          
          userCollections.push({
            id: user.id,
            username: user.username,
            items: [],
            totalItems: count || 0,
            currentPage: -1,
            hasMore: count ? count > 0 : false
          });
        }
        
        setCollections(userCollections);
        
        // Load first page for each user
        for (const collection of userCollections) {
          if (collection.hasMore) {
            await loadMoreCards(collection.id, 0);
          }
        }
      } catch (err) {
        setError('Failed to load collections');
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialData();
  }, [loadMoreCards]);

  if (initialLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="text-center text-green-400 text-xl">Loading collections...</div>
      </div>
    );
  }

  if (error && collections.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="text-center text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Trainer Collections</h2>
      
      <div className="space-y-10">
        {collections.map((collection) => (
          <div key={collection.id} className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-green-400 mb-4">
              {collection.username}'s Collection
              {collection.totalItems > 0 && (
                <span className="text-sm font-normal ml-2 text-gray-400">
                  ({collection.items.length} of {collection.totalItems} cards)
                </span>
              )}
            </h3>
            
            {collection.totalItems === 0 ? (
              <p className="text-gray-400">No Pokémon in collection yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {collection.items.map((item) => (
                    <Link 
                      href={`/card/${item.pokemon?.card_id}`}
                      key={item.id} 
                      className="bg-gray-800 rounded-lg p-3 border border-gray-700 transition hover:border-green-400"
                    >
                      <div className="aspect-square relative mb-2">
                        <Image
                          src={item.pokemon?.image_url || '/placeholder-pokemon.png'}
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
                
                {collection.hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => loadMoreCards(collection.id, collection.currentPage + 1)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white"
                    >
                      {loading ? 'Loading...' : 'Load More Cards'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 