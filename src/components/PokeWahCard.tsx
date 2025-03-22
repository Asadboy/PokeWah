'use client';

import { PokemonCard } from '@/lib/pokemonApi';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';

interface PokeWahCardProps {
  card: PokemonCard;
}

export default function PokeWahCard({ card }: PokeWahCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto text-black">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card Image */}
        <div className="relative aspect-[2/3]">
          <Image
            src={card.images.large}
            alt={card.name}
            fill
            className="object-contain rounded-lg"
            priority
          />
        </div>

        {/* Card Details */}
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <p className="text-black font-semibold">Card Number: <span className="font-normal">{card.number}</span></p>
            <p className="text-black font-semibold">Artist: <span className="font-normal">{card.artist}</span></p>
            <p className="text-black font-semibold">Rarity: <span className="font-normal">{card.rarity}</span></p>
            <p className="text-black font-semibold">Release Date: <span className="font-normal">{formatDate(card.releaseDate)}</span></p>
          </div>

          {/* Market Prices */}
          {card.cardmarket && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-lg font-bold text-black mb-2">Market Prices</h3>
              <p className="text-black">Low: <span className="font-semibold">€{card.cardmarket.prices.lowPrice.toFixed(2)}</span></p>
              <p className="text-black">Market: <span className="font-semibold">€{card.cardmarket.prices.averageSellPrice.toFixed(2)}</span></p>
              <p className="text-black">Trend: <span className="font-semibold">€{card.cardmarket.prices.trendPrice.toFixed(2)}</span></p>
              <p className="text-xs text-black mt-1">Last Updated: {formatDate(card.cardmarket.updatedAt)}</p>
            </div>
          )}

          {/* National Pokédex Numbers */}
          {card.nationalPokedexNumbers && card.nationalPokedexNumbers.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-bold text-black mb-2">National Pokédex Numbers</h3>
              <div className="flex flex-wrap gap-2">
                {card.nationalPokedexNumbers.map((num) => (
                  <span key={num} className="px-2 py-1 bg-gray-100 rounded text-black">
                    #{num}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 