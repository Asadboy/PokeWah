'use client';

import { PokemonCard } from '@/lib/pokemonApi';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface PokeWahCardProps {
  card: PokemonCard;
}

export default function PokeWahCard({ card }: PokeWahCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Card Image */}
        <div className="relative aspect-[2/3] bg-gray-900 rounded-xl p-4 flex items-center justify-center">
          <div className="relative w-5/6 h-5/6">
            <Image
              src={card.images.large}
              alt={card.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right Column - Card Details */}
        <div className="space-y-6 text-black">
          <h2 className="text-2xl font-bold border-b border-gray-200 pb-2">{card.name}</h2>
          
          {/* Key card stats - matching the carousel style */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <p className="text-gray-500 text-sm">Card Number</p>
              <p className="text-lg font-semibold">{card.number}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <p className="text-gray-500 text-sm">Rarity</p>
              <p className="text-lg font-semibold">{card.rarity}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <p className="text-gray-500 text-sm">Series</p>
              <p className="text-lg font-semibold">XY</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <p className="text-gray-500 text-sm">Artist</p>
              <p className="text-lg font-semibold">{card.artist}</p>
            </div>
          </div>

          {/* Release Date */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Release Date:</span> {formatDate(card.releaseDate)}
          </div>

          {/* Market Prices */}
          {card.cardmarket && (
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
              <h3 className="text-lg font-bold mb-3 text-white">Market Prices</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-400">Low:</span>
                  <div className="text-lg">€{card.cardmarket.prices.lowPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-400">Market:</span>
                  <div className="text-lg">€{card.cardmarket.prices.averageSellPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-400">Trend:</span>
                  <div className="text-lg">€{card.cardmarket.prices.trendPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-400">Updated:</span>
                  <div className="text-xs mt-1">{formatDate(card.cardmarket.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}

          {/* National Pokédex Numbers */}
          {card.nationalPokedexNumbers && card.nationalPokedexNumbers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">National Pokédex Numbers</h3>
              <div className="flex flex-wrap gap-2">
                {card.nationalPokedexNumbers.map((num) => (
                  <span key={num} className="px-3 py-1 bg-gray-100 rounded-full text-gray-800 font-medium">
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