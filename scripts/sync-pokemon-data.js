require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// API base URL for Pokémon TCG API
const API_BASE_URL = 'https://api.pokemontcg.io/v2';

async function syncPokemonData() {
  try {
    console.log('Starting Pokémon TCG data sync with Supabase...');
    
    // 1. Get all pokemon from our database
    const { data: dbPokemon, error: dbError } = await supabase
      .from('pokemon')
      .select('*');
    
    if (dbError) throw dbError;
    console.log(`Found ${dbPokemon.length} Pokémon cards in database`);
    
    // 2. For each Pokémon, fetch complete data from TCG API and update the database
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const pokemon of dbPokemon) {
      try {
        console.log(`Processing ${pokemon.name} (${pokemon.card_id})...`);
        
        // Fetch card data from API
        const response = await fetch(`${API_BASE_URL}/cards/${pokemon.card_id}`);
        
        if (!response.ok) {
          console.error(`Error fetching card ${pokemon.card_id}: ${response.statusText}`);
          errorCount++;
          continue;
        }
        
        const cardData = await response.json();
        const card = cardData.data;
        
        if (!card) {
          console.error(`No data found for card ${pokemon.card_id}`);
          errorCount++;
          continue;
        }
        
        // Create enhanced Pokemon object with more details
        const enhancedPokemon = {
          name: card.name,
          card_id: card.id,
          image_url: card.images.small,
          large_image_url: card.images.large,
          set_name: card.set?.name || null,
          rarity: card.rarity || null,
          types: card.types || null,
          hp: card.hp || null,
          artist: card.artist || null,
          updated_at: new Date().toISOString()
        };
        
        // Update the pokemon in the database
        const { error: updateError } = await supabase
          .from('pokemon')
          .update(enhancedPokemon)
          .eq('id', pokemon.id);
        
        if (updateError) {
          console.error(`Error updating ${pokemon.name}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Updated ${pokemon.name}`);
          updatedCount++;
        }
        
        // Small delay to avoid API rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (cardError) {
        console.error(`Error processing ${pokemon.name}: ${cardError.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=== Sync Complete ===');
    console.log(`Total Pokémon: ${dbPokemon.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

syncPokemonData(); 