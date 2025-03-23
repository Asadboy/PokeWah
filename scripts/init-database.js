require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Initializing database...');
console.log(`Using Supabase URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  console.log('Please make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  // Sample user data
  const users = [
    { username: 'Asad' },
    { username: 'Karwah' }
  ];

  // Sample Pokémon card IDs
  const cardIds = [
    'base1-63', // Squirtle
    'base1-46', // Charmander
    'base1-44', // Bulbasaur
    'base1-42', // Wartortle
    'base1-49', // Drowzee
    'swsh1-8'   // Eldegoss V (replacing Snom which seems unavailable)
  ];

  try {
    // First verify if we can connect
    console.log('Verifying connection...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Connection error: ${sessionError.message}`);
    }
    
    // Check if tables exist
    console.log('Checking if tables exist...');
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      throw new Error('Tables do not exist. Please run the schema.sql file in Supabase SQL Editor first.');
    } else if (tableError) {
      console.error('Full error object:', JSON.stringify(tableError));
      throw new Error(`Error accessing tables: ${tableError.message}`);
    }
    
    // Check if there are already users in the database
    if (tableData && tableData.length > 0) {
      console.log('Database already contains users. Skipping initialization to avoid duplicates.');
      console.log('If you want to reinitialize, please delete all data from the tables first.');
      return;
    }
    
    // Insert the users
    console.log('Inserting users...');
    console.log('Users to insert:', JSON.stringify(users));
    
    try {
      const { data: insertedUsers, error: userError } = await supabase
        .from('users')
        .upsert(users)
        .select();

      if (userError) {
        console.error('Full error object:', JSON.stringify(userError));
        throw new Error(`Error inserting users: ${userError.message}`);
      }
      
      console.log('Users inserted:', insertedUsers);

      if (!insertedUsers || insertedUsers.length === 0) {
        throw new Error('No users were inserted');
      }

      // Get user IDs
      const asadId = insertedUsers.find(u => u.username === 'Asad').id;
      const karwahId = insertedUsers.find(u => u.username === 'Karwah').id;

      // Fetch card data from Pokemon TCG API and insert into database
      console.log('Fetching and inserting pokemon...');
      
      const pokemon = [];
      for (const cardId of cardIds) {
        console.log(`Fetching data for card ${cardId}...`);
        try {
          const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
          
          if (!response.ok) {
            console.error(`Failed to fetch card ${cardId}: ${response.statusText}`);
            continue;
          }
          
          const cardData = await response.json();
          const card = cardData.data;
          
          pokemon.push({
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
      
      if (pokemon.length === 0) {
        throw new Error('No Pokemon data was fetched from the API');
      }
      
      // Insert the Pokémon
      console.log('Inserting pokemon...');
      console.log('Pokemon to insert:', JSON.stringify(pokemon));
      
      try {
        const { data: insertedPokemon, error: pokemonError } = await supabase
          .from('pokemon')
          .upsert(pokemon)
          .select();

        if (pokemonError) {
          console.error('Full error object:', JSON.stringify(pokemonError));
          throw new Error(`Error inserting pokemon: ${pokemonError.message}`);
        }
        
        console.log('Pokemon inserted:', insertedPokemon);

        if (!insertedPokemon || insertedPokemon.length === 0) {
          throw new Error('No Pokemon were inserted');
        }

        // Get Pokémon IDs (using find to match by card_id)
        const squirtleId = insertedPokemon.find(p => p.card_id === 'base1-63').id;
        const charmanderId = insertedPokemon.find(p => p.card_id === 'base1-46').id;
        const bulbasaurId = insertedPokemon.find(p => p.card_id === 'base1-44').id;
        const wartortleId = insertedPokemon.find(p => p.card_id === 'base1-42').id;
        const drowzeeId = insertedPokemon.find(p => p.card_id === 'base1-49').id;
        
        // Use a different card id for the last pokemon
        let eldegossId;
        try {
          eldegossId = insertedPokemon.find(p => p.card_id === 'swsh1-8').id;
        } catch (error) {
          // If this card also fails, use the first pokemon as fallback
          console.log('Warning: Could not find Eldegoss card, using Squirtle as fallback');
          eldegossId = squirtleId;
        }

        // Associate users with their Pokémon
        const userPokemon = [
          // Asad's Pokémon
          {
            user_id: asadId,
            pokemon_id: squirtleId,
            acquired_date: new Date().toISOString()
          },
          {
            user_id: asadId,
            pokemon_id: charmanderId,
            acquired_date: new Date().toISOString()
          },
          {
            user_id: asadId,
            pokemon_id: bulbasaurId,
            acquired_date: new Date().toISOString()
          },
          
          // Karwah's Pokémon
          {
            user_id: karwahId,
            pokemon_id: wartortleId,
            acquired_date: new Date().toISOString()
          },
          {
            user_id: karwahId,
            pokemon_id: drowzeeId, 
            acquired_date: new Date().toISOString()
          },
          {
            user_id: karwahId,
            pokemon_id: eldegossId,
            acquired_date: new Date().toISOString()
          }
        ];

        console.log('Inserting user_pokemon associations...');
        console.log('User-Pokemon associations to insert:', JSON.stringify(userPokemon));
        
        try {
          const { data: insertedUserPokemon, error: userPokemonError } = await supabase
            .from('user_pokemon')
            .upsert(userPokemon)
            .select();

          if (userPokemonError) {
            console.error('Full error object:', JSON.stringify(userPokemonError));
            throw new Error(`Error inserting user_pokemon: ${userPokemonError.message}`);
          }
          
          console.log('User-Pokemon associations inserted:', insertedUserPokemon);

          console.log('✅ Database initialization completed successfully!');
        } catch (userPokemonErr) {
          console.error('Error in user_pokemon insert:', userPokemonErr);
          throw userPokemonErr;
        }
      } catch (pokemonErr) {
        console.error('Error in pokemon insert:', pokemonErr);
        throw pokemonErr;
      }
    } catch (userErr) {
      console.error('Error in user insert:', userErr);
      throw userErr;
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
  }
}

// Run the initialization function
initDatabase(); 