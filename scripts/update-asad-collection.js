require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

// Cards from Asad's collection (Scarlet & Violet Temporal Forces)
const asadsCards = [
  { id: "sv5-197", name: "Bianca's Devotion" },     // 197/162
  { id: "sv5-168", name: "Snom" },                  // 168/162
  { id: "sv5-211", name: "Morty's Conviction" },    // 211/162
  { id: "sv5-179", name: "Meltan" },                // 179/162
  { id: "sv5-191", name: "Iron Crown ex" },         // 191/162
  { id: "sv5-186", name: "Iron Leaves ex" },        // 186/162
  { id: "sv5-194", name: "Farigiraf ex" }           // 194/162
];

async function updateAsadsCollection() {
  console.log('Updating Asad\'s Temporal Forces collection...');
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get Asad's user ID
    console.log('Fetching Asad\'s user ID...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Asad')
      .single();
    
    if (userError) {
      throw new Error(`Error fetching user: ${userError.message}`);
    }
    
    if (!userData) {
      throw new Error('User Asad not found in the database');
    }
    
    const asadId = userData.id;
    console.log(`Found Asad with ID: ${asadId}`);
    
    // Process each card
    for (const card of asadsCards) {
      console.log(`Processing card: ${card.name} (${card.id})`);
      
      // Check if card already exists in the pokemon table
      const { data: existingCard, error: cardError } = await supabase
        .from('pokemon')
        .select('*')
        .eq('card_id', card.id)
        .maybeSingle();
      
      if (cardError) {
        console.error(`Error checking if card exists: ${cardError.message}`);
        continue;
      }
      
      let pokemonId;
      
      if (!existingCard) {
        console.log(`Card ${card.id} not found in database, fetching from Pokémon TCG API...`);
        
        try {
          // Fetch card data from Pokémon TCG API with the API key
          const response = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`, {
            headers: {
              'X-Api-Key': POKEMON_TCG_API_KEY
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch card ${card.id}: ${response.statusText}`);
            continue;
          }
          
          const cardData = await response.json();
          
          // Extract the card data
          const cardInfo = cardData.data;
          
          // Insert card into pokemon table
          const { data: insertedCard, error: insertError } = await supabase
            .from('pokemon')
            .insert({
              card_id: card.id,
              name: cardInfo.name,
              image_url: cardInfo.images.small,
              large_image_url: cardInfo.images.large,
              set_name: cardInfo.set.name,
              rarity: cardInfo.rarity || "Secret Rare",
              types: cardInfo.types,
              hp: cardInfo.hp,
              artist: cardInfo.artist
            })
            .select()
            .single();
          
          if (insertError) {
            console.error(`Error inserting card: ${insertError.message}`);
            continue;
          }
          
          pokemonId = insertedCard.id;
          console.log(`Added new card ${card.id} to database with ID: ${pokemonId}`);
          
        } catch (error) {
          console.error(`Error processing card ${card.id}: ${error.message}`);
          continue;
        }
      } else {
        pokemonId = existingCard.id;
        console.log(`Card ${card.id} already exists in database with ID: ${pokemonId}`);
        
        // Update the card info with the latest from the API
        try {
          const response = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`, {
            headers: {
              'X-Api-Key': POKEMON_TCG_API_KEY
            }
          });
          
          if (response.ok) {
            const cardData = await response.json();
            const cardInfo = cardData.data;
            
            // Update card in pokemon table
            const { error: updateError } = await supabase
              .from('pokemon')
              .update({
                name: cardInfo.name,
                image_url: cardInfo.images.small,
                large_image_url: cardInfo.images.large,
                set_name: cardInfo.set.name,
                rarity: cardInfo.rarity || "Secret Rare",
                types: cardInfo.types,
                hp: cardInfo.hp,
                artist: cardInfo.artist,
                updated_at: new Date().toISOString()
              })
              .eq('id', pokemonId);
            
            if (updateError) {
              console.error(`Error updating card: ${updateError.message}`);
            } else {
              console.log(`Updated card ${card.id} with latest data`);
            }
          }
        } catch (error) {
          console.error(`Error updating card ${card.id}: ${error.message}`);
        }
      }
      
      // Check if this card is already in Asad's collection
      const { data: existingRelation, error: relationError } = await supabase
        .from('user_pokemon')
        .select('*')
        .eq('user_id', asadId)
        .eq('pokemon_id', pokemonId)
        .maybeSingle();
      
      if (relationError) {
        console.error(`Error checking if card is in Asad's collection: ${relationError.message}`);
        continue;
      }
      
      if (!existingRelation) {
        // Add card to Asad's collection if not already there
        const { error: addError } = await supabase
          .from('user_pokemon')
          .insert({
            user_id: asadId,
            pokemon_id: pokemonId,
            acquired_date: new Date().toISOString()
          });
        
        if (addError) {
          console.error(`Error adding card to Asad's collection: ${addError.message}`);
          continue;
        }
        
        console.log(`Added ${card.name} to Asad's collection`);
      } else {
        console.log(`${card.name} is already in Asad's collection`);
      }
    }
    
    console.log('✅ Successfully updated Asad\'s collection with Temporal Forces cards!');
  } catch (error) {
    console.error('Failed to update collection:', error);
  }
}

updateAsadsCollection(); 