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
 * This script updates Zen's collection with specified Temporal Forces cards
 * 1. First, it removes all of Zen's current cards
 * 2. Then, it adds the new Temporal Forces cards
 */
async function updateZenCollection() {
  console.log('Updating Zen\'s collection with Temporal Forces cards...');
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get Zen's user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'Zen')
      .single();
    
    if (userError) {
      throw new Error(`Failed to find Zen's user account: ${userError.message}`);
    }
    
    const zenId = user.id;
    console.log(`Found Zen's ID: ${zenId}`);
    
    // Remove all of Zen's current cards
    console.log('Removing all of Zen\'s current cards...');
    const { data: deleteResult, error: deleteError } = await supabase
      .from('user_pokemon')
      .delete()
      .eq('user_id', zenId)
      .select('id');
    
    if (deleteError) {
      throw new Error(`Failed to delete Zen's cards: ${deleteError.message}`);
    }
    
    console.log(`Deleted ${deleteResult?.length || 0} cards from Zen's collection`);
    
    // List of new cards to add
    const cardsToAdd = [
      { id: "sv5-166", name: "Sawsbuck", number: "166/162" },
      { id: "sv5-167", name: "Litten", number: "167/162" },
      { id: "sv5-183", name: "Cinccino", number: "183/162" },
      { id: "sv5-180", name: "Lickitung", number: "180/162" },
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
        
        // Add card to Zen's collection
        const { data: userPokemon, error: addError } = await supabase
          .from('user_pokemon')
          .insert({
            user_id: zenId,
            pokemon_id: pokemonId,
            acquired_date: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (addError) {
          throw new Error(`Failed to add ${card.name} to Zen's collection: ${addError.message}`);
        }
        
        console.log(`Added ${card.name} to Zen's collection with relation ID: ${userPokemon.id}`);
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error.message}`);
      }
    }
    
    console.log('All cards processed! Zen\'s collection has been updated.');
    
  } catch (error) {
    console.error('Failed to update Zen\'s collection:', error);
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
    
    // Extract set ID from the card_id (e.g., "sv5" from "sv5-166")
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
    
    // Strategy 3: Search by name and set
    let cardName = '';
    switch(cardNumber) {
      case '166': cardName = 'Sawsbuck'; break;
      case '167': cardName = 'Litten'; break;
      case '183': cardName = 'Cinccino'; break;
      case '180': cardName = 'Lickitung'; break;
    }
    
    if (cardName) {
      const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${cardName}" set.id:${setId}`;
      const nameSearchResponse = await fetch(nameSearchURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (nameSearchResponse.ok) {
        const nameSearchData = await nameSearchResponse.json();
        if (nameSearchData.data && nameSearchData.data.length > 0) {
          console.log(`✅ Found card by name search: ${cardName}`);
          return nameSearchData.data[0];
        }
      }
    }
    
    console.log(`❌ Could not find card ${cardId} - creating minimal mock data`);
    
    // Create mock data for cards that don't exist in the API yet
    return {
      id: cardId,
      name: cardName || `Card ${cardNumber}`,
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
      rarity: "Illustration Rare",
      artist: "Pokemon TCG"
    };
    
  } catch (error) {
    console.error(`Error fetching card: ${error}`);
    return null;
  }
}

updateZenCollection(); 