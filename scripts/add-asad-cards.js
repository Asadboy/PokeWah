require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

/**
 * This script adds Asad's Temporal Forces SIR cards to his collection
 * using the correct SIR numbering format (number/totalInSet)
 */
async function addAsadCards() {
  console.log('Adding Asad\'s Temporal Forces cards to collection...');
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get Asad's user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'Asad')
      .single();
    
    if (userError) {
      throw new Error(`Failed to find Asad's user account: ${userError.message}`);
    }
    
    const asadId = user.id;
    console.log(`Found Asad's ID: ${asadId}`);
    
    // List of cards to add
    const cardsToAdd = [
      { id: "sv5-197", name: "Bianca's Devotion", number: "197/162" },
      { id: "sv5-168", name: "Snom", number: "168/162" },
      { id: "sv5-211", name: "Morty's Conviction", number: "211/162" },
      { id: "sv5-179", name: "Meltan", number: "179/162" },
      { id: "sv5-191", name: "Iron Crown EX", number: "191/162" },
      { id: "sv5-186", name: "Iron Leaves", number: "186/162" },
      { id: "sv5-194", name: "Farigiraf EX", number: "194/162" },
    ];
    
    // Process each card
    for (const card of cardsToAdd) {
      try {
        console.log(`Processing ${card.name} (${card.id})...`);
        
        // Check if card exists in database
        let { data: existingCard, error: cardError } = await supabase
          .from('pokemon')
          .select('id')
          .eq('card_id', card.id)
          .single();
        
        let pokemonId;
        
        if (cardError || !existingCard) {
          console.log(`Card ${card.name} not found in database, fetching from API...`);
          
          // Fetch card from API
          const cardData = await fetchCardFromApi(card.id);
          
          if (cardData) {
            // Insert card into database
            const { data: newCard, error: insertError } = await supabase
              .from('pokemon')
              .insert({
                card_id: card.id,
                name: cardData.name,
                image_url: cardData.images.small,
                large_image_url: cardData.images.large,
                set_name: cardData.set.name,
                rarity: cardData.rarity,
                types: cardData.types,
                hp: cardData.hp,
                artist: cardData.artist
              })
              .select('id')
              .single();
            
            if (insertError) {
              throw new Error(`Failed to insert card ${card.name}: ${insertError.message}`);
            }
            
            pokemonId = newCard.id;
            console.log(`Added new card to database with ID: ${pokemonId}`);
          } else {
            throw new Error(`Could not fetch card data for ${card.id}`);
          }
        } else {
          pokemonId = existingCard.id;
          console.log(`Found existing card in database with ID: ${pokemonId}`);
        }
        
        // Check if Asad already has this card
        const { data: existingUserPokemon, error: userPokemonError } = await supabase
          .from('user_pokemon')
          .select('id')
          .eq('user_id', asadId)
          .eq('pokemon_id', pokemonId)
          .single();
        
        if (!existingUserPokemon) {
          // Add card to Asad's collection
          const { data: userPokemon, error: addError } = await supabase
            .from('user_pokemon')
            .insert({
              user_id: asadId,
              pokemon_id: pokemonId,
              acquired_date: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (addError) {
            throw new Error(`Failed to add ${card.name} to Asad's collection: ${addError.message}`);
          }
          
          console.log(`Added ${card.name} to Asad's collection with relation ID: ${userPokemon.id}`);
        } else {
          console.log(`Asad already has ${card.name} in his collection`);
        }
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error.message}`);
      }
    }
    
    console.log('All cards processed!');
    
  } catch (error) {
    console.error('Failed to add cards:', error);
  }
}

/**
 * Enhanced function to fetch a Pokemon card using multiple search strategies
 */
async function fetchCardFromApi(cardId) {
  try {
    console.log(`Fetching card with ID: ${cardId}`);
    
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
    
    console.log(`❌ Could not find card ${cardId} - creating minimal mock data`);
    
    // Create mock data for cards that don't exist in the API yet
    return {
      id: cardId,
      name: cardId.split('-')[1].toUpperCase(),
      images: {
        small: "https://images.pokemontcg.io/sv5/symbol.png",
        large: "https://images.pokemontcg.io/sv5/logo.png"
      },
      number: cardNumber,
      set: {
        id: setId,
        name: "Temporal Forces",
        series: "Scarlet & Violet"
      },
      rarity: "Secret Rare",
      artist: "Pokemon TCG"
    };
    
  } catch (error) {
    console.error(`Error fetching card: ${error}`);
    return null;
  }
}

addAsadCards(); 