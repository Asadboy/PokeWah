require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Adding more Pokemon to the database...');
console.log(`Using Supabase URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  console.log('Please make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Additional Pokémon cards from the Base Set and Sword & Shield
const additionalCards = [
  'base1-4',   // Charizard
  'base1-15',  // Venusaur
  'base1-2',   // Blastoise
  'base1-16',  // Zapdos
  'base1-12',  // Ninetales
  'base1-5',   // Clefairy
  'base1-18',  // Dragonair
  'swsh1-1',   // Celebi V
  'swsh1-4'    // Dhelmise V
];

async function addMorePokemon() {
  try {
    // Verify connection
    console.log('Verifying connection...');
    const { error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Connection error: ${sessionError.message}`);
    }
    
    // Get existing users
    console.log('Fetching existing users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('No users found in the database. Please run init-db first.');
    }
    
    console.log(`Found ${users.length} users: ${users.map(u => u.username).join(', ')}`);
    
    // Fetch card data from Pokemon TCG API
    console.log('Fetching card data from Pokemon TCG API...');
    
    const newPokemon = [];
    for (const cardId of additionalCards) {
      console.log(`Fetching data for card ${cardId}...`);
      try {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch card ${cardId}: ${response.statusText}`);
          continue;
        }
        
        const cardData = await response.json();
        const card = cardData.data;
        
        newPokemon.push({
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
    
    if (newPokemon.length === 0) {
      throw new Error('No Pokémon data was fetched from the API');
    }
    
    // Insert the new Pokémon
    console.log(`Inserting ${newPokemon.length} new pokemon...`);
    
    const { data: insertedPokemon, error: pokemonError } = await supabase
      .from('pokemon')
      .upsert(newPokemon, { onConflict: 'card_id' })
      .select();
    
    if (pokemonError) {
      throw new Error(`Error inserting pokemon: ${pokemonError.message}`);
    }
    
    console.log(`Inserted ${insertedPokemon.length} pokemon`);
    
    // Distribute Pokémon to users
    const userPokemonRelations = [];
    
    // Give each user some new Pokémon
    for (const user of users) {
      // Get random selection of Pokémon for this user (4-6 cards)
      const numCards = Math.floor(Math.random() * 3) + 4; // Random number between 4-6
      const shuffledPokemon = [...insertedPokemon].sort(() => 0.5 - Math.random());
      const userPokemon = shuffledPokemon.slice(0, numCards);
      
      console.log(`Assigning ${numCards} pokemon to ${user.username}...`);
      
      for (const pokemon of userPokemon) {
        userPokemonRelations.push({
          user_id: user.id,
          pokemon_id: pokemon.id,
          acquired_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
        });
      }
    }
    
    // Insert the user-pokemon relations
    console.log(`Creating ${userPokemonRelations.length} user-pokemon relationships...`);
    
    const { data: insertedRelations, error: relationsError } = await supabase
      .from('user_pokemon')
      .upsert(userPokemonRelations, { onConflict: ['user_id', 'pokemon_id'] })
      .select();
    
    if (relationsError) {
      throw new Error(`Error creating relationships: ${relationsError.message}`);
    }
    
    console.log(`✅ Successfully added ${insertedRelations.length} pokemon to user collections!`);
    
  } catch (error) {
    console.error('❌ Error adding pokemon:', error.message);
  }
}

// Run the function
addMorePokemon(); 