require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Adding new users with Pokemon collections...');
console.log(`Using Supabase URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  console.log('Please make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// New users to add
const newUsers = [
  { username: 'Zen' },
  { username: 'Frankie' },
  { username: 'Seb' }
];

// Pokémon card IDs for new users - mixture of Base Set, Jungle, Fossil, and modern sets
const pokemonCardIds = [
  // Zen's Pokemon preferences (Dragon and Psychic types)
  'base1-4',    // Charizard
  'base1-10',   // Mewtwo
  'base2-3',    // Dragonite
  'base3-4',    // Gengar
  'swsh35-140', // Dragapult VMAX
  'swsh45-74',  // Hisuian Zoroark
  
  // Frankie's Pokemon preferences (Water and Electric types)
  'base1-2',    // Blastoise
  'base1-14',   // Raichu
  'base2-8',    // Vaporeon
  'base3-2',    // Articuno
  'swsh10-84',  // Suicune V
  'swsh9-51',   // Pikachu VMAX
  
  // Seb's Pokemon preferences (Fire and Fighting types)
  'base1-15',   // Venusaur
  'base1-8',    // Machamp
  'base2-4',    // Flareon
  'base3-6',    // Hitmonlee
  'swsh12-115', // Cinderace VMAX
  'swsh45sv-53' // Hisuian Arcanine
];

async function addNewUsers() {
  try {
    // Verify connection
    console.log('Verifying connection...');
    const { error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Connection error: ${sessionError.message}`);
    }

    // Insert new users
    console.log('Adding new users:', newUsers.map(u => u.username).join(', '));
    const { data: insertedUsers, error: userError } = await supabase
      .from('users')
      .upsert(newUsers)
      .select();
    
    if (userError) {
      throw new Error(`Error inserting users: ${userError.message}`);
    }
    
    console.log(`Added ${insertedUsers.length} new users successfully`);
    
    // Fetch card data from Pokemon TCG API
    console.log('Fetching Pokémon card data from API...');
    
    const pokemonToInsert = [];
    for (const cardId of pokemonCardIds) {
      console.log(`Fetching data for card ${cardId}...`);
      try {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch card ${cardId}: ${response.statusText}`);
          continue;
        }
        
        const cardData = await response.json();
        const card = cardData.data;
        
        if (!card) {
          console.error(`No data found for card ${cardId}`);
          continue;
        }
        
        pokemonToInsert.push({
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
        });
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (cardError) {
        console.error(`Error fetching card ${cardId}:`, cardError.message);
      }
    }
    
    if (pokemonToInsert.length === 0) {
      throw new Error('No Pokémon data was fetched from the API');
    }
    
    // Insert the Pokémon cards
    console.log(`Inserting ${pokemonToInsert.length} Pokémon cards...`);
    
    const { data: insertedPokemon, error: pokemonError } = await supabase
      .from('pokemon')
      .upsert(pokemonToInsert, { onConflict: 'card_id' })
      .select();
    
    if (pokemonError) {
      throw new Error(`Error inserting Pokémon: ${pokemonError.message}`);
    }
    
    console.log(`Inserted ${insertedPokemon.length} Pokémon cards`);
    
    // Create user-Pokémon relationships
    // Each user gets 6 specific Pokémon assigned to them based on their preferences
    const userPokemonRelations = [];
    
    // Helper function to get Pokémon IDs by card IDs
    const getPokemonId = (cardId) => {
      const pokemon = insertedPokemon.find(p => p.card_id === cardId);
      return pokemon ? pokemon.id : null;
    };
    
    // Assign Pokémon to Zen (index 0)
    if (insertedUsers[0]) {
      const zenId = insertedUsers[0].id;
      for (let i = 0; i < 6; i++) {
        const pokemonId = getPokemonId(pokemonCardIds[i]);
        if (pokemonId) {
          userPokemonRelations.push({
            user_id: zenId,
            pokemon_id: pokemonId,
            acquired_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    // Assign Pokémon to Frankie (index 1)
    if (insertedUsers[1]) {
      const frankieId = insertedUsers[1].id;
      for (let i = 6; i < 12; i++) {
        const pokemonId = getPokemonId(pokemonCardIds[i]);
        if (pokemonId) {
          userPokemonRelations.push({
            user_id: frankieId,
            pokemon_id: pokemonId,
            acquired_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    // Assign Pokémon to Seb (index 2)
    if (insertedUsers[2]) {
      const sebId = insertedUsers[2].id;
      for (let i = 12; i < 18; i++) {
        const pokemonId = getPokemonId(pokemonCardIds[i]);
        if (pokemonId) {
          userPokemonRelations.push({
            user_id: sebId,
            pokemon_id: pokemonId,
            acquired_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    console.log(`Creating ${userPokemonRelations.length} user-Pokémon relationships...`);
    
    const { data: insertedRelations, error: relationsError } = await supabase
      .from('user_pokemon')
      .upsert(userPokemonRelations)
      .select();
    
    if (relationsError) {
      throw new Error(`Error creating relationships: ${relationsError.message}`);
    }
    
    console.log(`✅ Successfully assigned ${insertedRelations.length} Pokémon to new users!`);
    console.log('New users created with themed Pokémon collections:');
    console.log('- Zen: Dragon and Psychic type specialist');
    console.log('- Frankie: Water and Electric type specialist');
    console.log('- Seb: Fire and Fighting type specialist');
    
  } catch (error) {
    console.error('❌ Error adding new users and Pokémon:', error.message);
  }
}

// Run the function
addNewUsers(); 