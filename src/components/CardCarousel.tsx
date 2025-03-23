'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PokemonCard } from '@/lib/pokemonApi';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';

// Extended card interface to include owner information
interface ExtendedPokemonCard extends PokemonCard {
  owner?: string;
  acquired?: string;
}

// Type definition for the joined user_pokemon data from Supabase
interface UserPokemonRelation {
  id: string;
  acquired_date: string;
  users: {
    id: string;
    username: string;
  };
  pokemon: {
    id: string;
    card_id: string;
    name: string;
  };
}

export default function CardCarousel() {
  const [cards, setCards] = useState<ExtendedPokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch most expensive cards from the database when component mounts
  useEffect(() => {
    /**
     * This function fetches the 12 most expensive Pokémon cards from our database
     * based on the cardmarket price data. For cards that don't have price data,
     * they are ranked lower than those with price data.
     * 
     * The steps are:
     * 1. Query the user_pokemon join table with related user and pokemon data
     * 2. Fetch detailed card information from the Pokémon TCG API
     * 3. Sort cards by price (highest to lowest)
     * 4. Take the top 12 most expensive cards
     */
    const loadMostExpensiveCards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use a proper join query to get all relationship data in one request
        const { data: userPokemonData, error: joinError } = await supabase
          .from('user_pokemon')
          .select(`
            id,
            acquired_date,
            users (
              id,
              username
            ),
            pokemon (
              id,
              card_id,
              name
            )
          `)
          .limit(50);
        
        if (joinError) {
          throw new Error(`Error fetching user-pokemon data: ${joinError.message}`);
        }
        
        if (!userPokemonData || userPokemonData.length === 0) {
          throw new Error('No user-pokemon relationships found');
        }
        
        console.log('User Pokemon data:', userPokemonData);
        
        // Fetch detailed card data from API for each card in our database
        const cardDetails: ExtendedPokemonCard[] = [];
        for (const relation of userPokemonData as unknown as UserPokemonRelation[]) {
          try {
            const cardId = relation.pokemon.card_id;
            const username = relation.users.username;
            const acquiredDate = relation.acquired_date;
            
            if (!cardId) {
              console.error(`No card_id found for relation:`, relation);
              continue;
            }
            
            const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
            if (response.ok) {
              const data = await response.json();
              if (data && data.data) {
                // Add owner information to the card data
                cardDetails.push({
                  ...data.data,
                  owner: username || "Unknown",
                  acquired: new Date(acquiredDate).toLocaleDateString()
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching details for card:`, error);
          }
        }
        
        // Sort cards by price (highest to lowest)
        const sortedCards = cardDetails.sort((a, b) => {
          const priceA = a.cardmarket?.prices?.averageSellPrice || 0;
          const priceB = b.cardmarket?.prices?.averageSellPrice || 0;
          return priceB - priceA;
        });
        
        // Take the top 12 most expensive cards
        const topCards = sortedCards.slice(0, 12);
        
        // If we didn't get enough cards, fall back to random ones from the API
        if (topCards.length === 0) {
          // Fallback for demo - create mock data with owners
          const mockOwners = ["Asad", "Karwah", "Zen", "Frankie", "Seb"];
          const mockCards = cards.map((card, index) => ({
            ...card,
            owner: mockOwners[index % mockOwners.length],
            acquired: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toLocaleDateString()
          }));
          setCards(mockCards);
        } else {
          setCards(topCards);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
        console.error('Error loading expensive cards:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMostExpensiveCards();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 h-96 flex items-center justify-center">
        <div className="text-xl text-green-400">Loading most expensive Pokémon cards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 h-96 flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
          skipSnaps: false,
          slidesToScroll: 1
        }}
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4 bg-transparent">
          {cards.map((card) => (
            <CarouselItem key={card.id} className="pl-2 md:pl-4 md:basis-1/3">
              <Link href={`/card/${card.id}`} className="block h-full">
                <Card className="border-0 transition-transform duration-200 hover:scale-105 h-full flex flex-col relative bg-transparent">
                  <CardContent className="relative flex-grow p-0 bg-transparent">
                    {/* Main card container that mimics the reference design */}
                    <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col">
                      {/* Username badge - positioned at the top left */}
                      <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-90 text-green-400 px-3 py-1 rounded-md z-10">
                        <span className="text-sm font-bold">{card.owner || "Unknown"}</span>
                      </div>
                      
                      {/* Card Image Section - with 5% margin */}
                      <div className="relative w-full aspect-[2/3] p-[5%] flex items-center justify-center">
                        <div className="relative w-full h-full">
                          <Image
                            src={card.images.small}
                            alt={card.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>

                      {/* Interactive elements area in bottom section */}
                      <div className="bg-gray-800 p-3 text-xs text-green-400 font-mono">
                        {/* Top row - artist and total printed */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">artist</span>
                            <div className="code-line truncate max-w-full">
                              {card.artist || "Unknown"}
                            </div>
                          </div>
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">total printed</span>
                            <div className="text-green-400 font-bold">
                              {card.number || "?"}
                            </div>
                          </div>
                        </div>

                        {/* Middle row - rarity and series */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">rarity</span>
                            <div className="text-green-400 font-bold truncate max-w-full">
                              {card.rarity || "Unknown"}
                            </div>
                          </div>
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">series</span>
                            <div className="text-green-400 font-bold">
                              {card.set?.name?.split(' ')[0] || "Unknown"}
                            </div>
                          </div>
                        </div>

                        {/* Bottom row - date acquired */}
                        <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                          <span className="text-gray-400">date acquired</span>
                          <div className="text-green-400 font-bold">
                            {card.acquired || "Unknown"}
                          </div>
                        </div>

                        {/* Market price overlay - positioned at the top right */}
                        {card.cardmarket && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-green-400 p-2 rounded-md">
                            <div className="flex items-center font-bold text-xl">
                              <span className="mr-1">£</span>
                              <span>{(card.cardmarket.prices.averageSellPrice * 0.85).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:text-green-400" />
        <CarouselNext className="hidden md:flex bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:text-green-400" />
      </Carousel>
      
      {/* Add custom styles for the code-like formatting */}
      <style jsx global>{`
        .code-block {
          font-family: 'Consolas', 'Monaco', monospace;
        }
        .code-line {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
} 