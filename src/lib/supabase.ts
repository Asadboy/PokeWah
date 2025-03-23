import { createClient } from '@supabase/supabase-js';
import { PokemonCard } from './pokemonApi';

// Replace these with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Pokemon TCG API Key
export const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define types for our database schema
export type User = {
  id: string;
  username: string;
  created_at: string;
};

export type Pokemon = {
  id: string;
  name: string;
  card_id: string; // Reference to PokemonTCG API card ID
  image_url: string;
  large_image_url?: string;
  set_name?: string;
  rarity?: string;
  types?: string[];
  hp?: string;
  artist?: string;
  created_at: string;
  updated_at?: string;
};

export type UserPokemon = {
  id: string;
  user_id: string;
  pokemon_id: string;
  acquired_date: string;
  pokemon?: Pokemon; // For joins
  user?: User; // For joins
};

// Helper functions for database operations
export async function getUsersByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data;
}

export async function getPokemonByUser(userId: string): Promise<UserPokemon[]> {
  const { data, error } = await supabase
    .from('user_pokemon')
    .select(`
      *,
      pokemon:pokemon_id(*)
    `)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user pokemon:', error);
    return [];
  }
  
  return data;
}

// Function to fetch all users with their Pokémon
export async function getAllUsersWithPokemon() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_pokemon(
        *,
        pokemon:pokemon_id(*)
      )
    `);
  
  if (error) {
    console.error('Error fetching users with pokemon:', error);
    return [];
  }
  
  return data;
}

// Function to search Pokémon by various criteria
export async function searchPokemon(searchParams: {
  name?: string;
  rarity?: string;
  set?: string;
  limit?: number;
}) {
  const { name, rarity, set, limit = 10 } = searchParams;
  
  let query = supabase
    .from('pokemon')
    .select('*');
  
  // Apply filters if provided
  if (name) {
    query = query.ilike('name', `%${name}%`);
  }
  
  if (rarity) {
    query = query.eq('rarity', rarity);
  }
  
  if (set) {
    query = query.eq('set_name', set);
  }
  
  // Apply limit and execute query
  const { data, error } = await query.limit(limit);
  
  if (error) {
    console.error('Error searching pokemon:', error);
    return [];
  }
  
  return data;
}

/**
 * Enhanced function to fetch a Pokemon card from the Pokemon TCG API using multiple search strategies.
 * This implements the same approach used in the Bianca search script to ensure all cards can be found,
 * including special cards, secret rares, and trainer galleries.
 * 
 * @param cardId Pokemon card ID (e.g., 'sv5-197')
 * @returns The card data if found, null otherwise
 */
export async function fetchEnhancedPokemonCard(cardId: string) {
  try {
    console.log(`Attempting to fetch card with ID: ${cardId}`);
    
    // Strategy 1: Direct ID lookup (most efficient)
    const directResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log(`✅ Found card directly with ID ${cardId}`);
      return directData.data;
    }
    
    console.log(`❌ Direct lookup failed, trying alternative strategies...`);
    
    // Extract set ID from the card_id (e.g., "sv5" from "sv5-197")
    const [setId, cardNumber] = cardId.split('-');
    
    if (!setId || !cardNumber) {
      console.error(`Invalid card ID format: ${cardId}`);
      return null;
    }
    
    // Strategy 2: Search by set ID and card number
    const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${cardNumber} set.id:${setId}`;
    const numberSearchResponse = await fetch(numberSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (numberSearchResponse.ok) {
      const numberSearchData = await numberSearchResponse.json();
      if (numberSearchData.data && numberSearchData.data.length > 0) {
        console.log(`✅ Found card by number search: ${cardNumber} in set ${setId}`);
        return numberSearchData.data[0];
      }
    }
    
    // Strategy 3: Fetch card from database and use name search
    const { data: dbCard, error: dbError } = await supabase
      .from('pokemon')
      .select('*')
      .eq('card_id', cardId)
      .single();
    
    if (dbError || !dbCard || !dbCard.name) {
      console.error(`Cannot find card in database: ${cardId}`);
      return null;
    }
    
    // Strategy 4: Search by card name and set
    const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${dbCard.name}" set.id:${setId}`;
    const nameSearchResponse = await fetch(nameSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (nameSearchResponse.ok) {
      const nameSearchData = await nameSearchResponse.json();
      if (nameSearchData.data && nameSearchData.data.length > 0) {
        console.log(`✅ Found card by name search: ${dbCard.name}`);
        return nameSearchData.data[0];
      }
    }
    
    // Strategy 5: Scan all cards in the set (last resort - more expensive operation)
    console.log(`❌ All targeted searches failed, scanning entire set ${setId}...`);
    const setCardsURL = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`;
    
    const setCardsResponse = await fetch(setCardsURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (setCardsResponse.ok) {
      const setCardsData = await setCardsResponse.json();
      
      // First try exact number match
      let foundCard = setCardsData.data.find((card: PokemonCard) => card.number === cardNumber);
      if (foundCard) {
        console.log(`✅ Found card in set scan by exact number match: ${cardNumber}`);
        return foundCard;
      }
      
      // Then try name match
      foundCard = setCardsData.data.find((card: PokemonCard) => 
        card.name.toLowerCase() === dbCard.name.toLowerCase()
      );
      
      if (foundCard) {
        console.log(`✅ Found card in set scan by name match: ${dbCard.name}`);
        return foundCard;
      }
      
      // Then try partial name match (for cards like "Bianca's Devotion")
      foundCard = setCardsData.data.find((card: PokemonCard) => 
        card.name.toLowerCase().includes(dbCard.name.toLowerCase()) || 
        dbCard.name.toLowerCase().includes(card.name.toLowerCase())
      );
      
      if (foundCard) {
        console.log(`✅ Found card in set scan by partial name match`);
        return foundCard;
      }
    }
    
    console.log(`❌ Could not find card ${cardId} using any method`);
    return null;
    
  } catch (error) {
    console.error(`Error fetching enhanced Pokemon card: ${error}`);
    return null;
  }
} 