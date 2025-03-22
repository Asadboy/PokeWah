'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PokemonCard, fetchRandomCards } from '@/lib/pokemonApi';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";

export default function CardCarousel() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cards when component mounts
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedCards = await fetchRandomCards(12);
        setCards(fetchedCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 h-96 flex items-center justify-center">
        <div className="text-xl text-purple-600">Loading Pokémon cards...</div>
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
        <CarouselContent className="-ml-2 md:-ml-4">
          {cards.map((card) => (
            <CarouselItem key={card.id} className="pl-2 md:pl-4 md:basis-1/3">
              <Link href={`/card/${card.id}`} className="block h-full">
                <Card className="border-0 transition-transform duration-200 hover:scale-105 h-full flex flex-col relative">
                  <CardContent className="relative flex-grow p-0">
                    {/* Main card container that mimics the reference design */}
                    <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col">
                      {/* Card Image Section - Larger and centered */}
                      <div className="relative w-full aspect-[2/3] p-4 flex items-center justify-center">
                        <div className="relative w-5/6 h-5/6">
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
                        {/* Left side - data and id */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">data</span>
                            <div className="code-line truncate max-w-full">
                              {'{'} id: &quot;{card.id}&quot; {'}'}
                            </div>
                          </div>
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">total printed</span>
                            <div className="text-green-400 font-bold">
                              {card.number || "?"}
                            </div>
                          </div>
                        </div>

                        {/* Right side - market and series */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">rarity</span>
                            <div className="text-green-400 font-bold truncate max-w-full">
                              {card.rarity || "Unknown"}
                            </div>
                          </div>
                          <div className="bg-gray-700 rounded-md p-2 flex flex-col items-center justify-center">
                            <span className="text-gray-400">series</span>
                            <div className="text-green-400 font-bold">
                              XY
                            </div>
                          </div>
                        </div>

                        {/* Market price overlay - positioned at the top right */}
                        {card.cardmarket && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-green-400 p-1 rounded-md text-xs">
                            <div className="flex items-center">
                              <span className="mr-1">€</span>
                              <span className="font-bold">{card.cardmarket.prices.averageSellPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* TCG data - invisible but included for the JSON structure */}
                        <div className="hidden">
                          <div>{`"tcgplayer": {`}</div>
                          <div>{`  "url": "https://prices.pokemontcg.io/tcgplayer/${card.id}",`}</div>
                          <div>{`  "updatedAt": "${card.cardmarket?.updatedAt}",`}</div>
                          <div>{`  "prices": {`}</div>
                          <div>{`    "market": ${card.cardmarket?.prices.averageSellPrice.toFixed(2)},`}</div>
                          <div>{`    "directLow": ${card.cardmarket?.prices.lowPrice.toFixed(2)}`}</div>
                          <div>{`  }`}</div>
                          <div>{`}`}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
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