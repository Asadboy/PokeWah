import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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