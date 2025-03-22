'use client';

import { PokemonCard } from '@/lib/pokemonApi';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface PokeWahCardProps {
  card: PokemonCard;
}

export default function PokeWahCard({ card }: PokeWahCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl shadow-lg p-6 max-w-3xl mx-auto text-white border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Card Image with 5% margin */}
        <div className="relative aspect-[2/3] bg-gray-800 rounded-xl p-[5%] flex items-center justify-center border border-gray-700">
          <div className="relative w-full h-full">
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
        <div className="space-y-6">
          <h2 className="text-2xl font-bold border-b border-gray-700 pb-2">{card.name}</h2>
          
          {/* Key card stats - matching the carousel style */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">Card Number</p>
              <p className="text-lg font-semibold">{card.number}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">Rarity</p>
              <p className="text-lg font-semibold">{card.rarity}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">Series</p>
              <p className="text-lg font-semibold">XY</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">Artist</p>
              <p className="text-lg font-semibold">{card.artist}</p>
            </div>
          </div>

          {/* Release Date */}
          <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700">
            <span className="font-medium">Release Date:</span> {formatDate(card.releaseDate)}
          </div>

          {/* Market Prices */}
          {card.cardmarket && (
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm border border-gray-700">
              <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">Market Prices</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="text-gray-400">Low:</span>
                  <div className="text-2xl text-green-400 font-bold">€{card.cardmarket.prices.lowPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="text-gray-400">Market:</span>
                  <div className="text-2xl text-green-400 font-bold">€{card.cardmarket.prices.averageSellPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="text-gray-400">Trend:</span>
                  <div className="text-2xl text-green-400 font-bold">€{card.cardmarket.prices.trendPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="text-gray-400">Updated:</span>
                  <div className="text-sm mt-1">{formatDate(card.cardmarket.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}

          {/* National Pokédex Numbers */}
          {card.nationalPokedexNumbers && card.nationalPokedexNumbers.length > 0 && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 border-b border-gray-700 pb-2">National Pokédex Numbers</h3>
              <div className="flex flex-wrap gap-2">
                {card.nationalPokedexNumbers.map((num) => (
                  <span key={num} className="px-3 py-1 bg-gray-900 rounded-lg text-green-400 font-medium border border-gray-700">
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