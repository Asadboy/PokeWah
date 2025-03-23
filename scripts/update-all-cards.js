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
 * This script updates all cards in the database with the most up-to-date information
 * using the enhanced fetching approach that can find special cards, secret rares, etc.
 * It's similar to the approach used in the find-biancas-devotion.js script.
 */
async function updateAllCards() {
  console.log('Starting card database update with enhanced fetching...');
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get all cards from our database
    console.log('Fetching all cards from database...');
    const { data: dbCards, error: cardsError } = await supabase
      .from('pokemon')
      .select('*');
    
    if (cardsError) {
      throw new Error(`Error fetching cards: ${cardsError.message}`);
    }
    
    console.log(`Found ${dbCards.length} cards in database`);
    
    // Process each card
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const dbCard of dbCards) {
      console.log(`Processing card: ${dbCard.name} (${dbCard.card_id})`);
      
      try {
        // Apply the enhanced card fetching approach
        const cardData = await fetchEnhancedPokemonCard(dbCard.card_id, dbCard);
        
        if (cardData) {
          console.log(`✅ Successfully fetched updated data for ${dbCard.card_id}`);
          
          // Update card in database
          const { error: updateError } = await supabase
            .from('pokemon')
            .update({
              name: cardData.name,
              image_url: cardData.images.small,
              large_image_url: cardData.images.large,
              set_name: cardData.set.name,
              rarity: cardData.rarity,
              types: cardData.types,
              hp: cardData.hp,
              artist: cardData.artist,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbCard.id);
          
          if (updateError) {
            console.error(`Error updating card in database: ${updateError.message}`);
            failedCount++;
          } else {
            console.log(`Updated ${dbCard.name} in database`);
            updatedCount++;
          }
        } else {
          console.log(`❌ Could not find updated data for ${dbCard.card_id}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing card ${dbCard.card_id}: ${error.message}`);
        failedCount++;
      }
      
      // Brief pause to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\nUpdate complete! Updated ${updatedCount} cards. Failed to update ${failedCount} cards.`);
  } catch (error) {
    console.error('Failed to update cards:', error);
  }
}

/**
 * Enhanced function to fetch a Pokemon card using multiple search strategies.
 * This is the same approach used in the find-biancas-devotion.js script.
 */
async function fetchEnhancedPokemonCard(cardId, dbCard) {
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
    
    // Strategy 3: Scan all cards in the set (last resort - more expensive operation)
    console.log(`❌ Number search failed, scanning entire set ${setId}...`);
    const setCardsURL = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`;
    
    const setCardsResponse = await fetch(setCardsURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (setCardsResponse.ok) {
      const setCardsData = await setCardsResponse.json();
      
      // First try exact number match
      let foundCard = setCardsData.data.find(card => card.number === cardNumber);
      if (foundCard) {
        console.log(`✅ Found card in set scan by exact number match: ${cardNumber}`);
        return foundCard;
      }
      
      // Look for any card that might have this number in some form
      const possibleMatches = setCardsData.data.filter(card => 
        card.number.includes(cardNumber) || 
        card.id.includes(cardId)
      );
      
      if (possibleMatches.length > 0) {
        console.log(`✅ Found similar card by number pattern: ${possibleMatches[0].number}`);
        return possibleMatches[0]; 
      }
      
      // If we have the card name from our database, try to match by name
      if (dbCard && dbCard.name) {
        const cardName = dbCard.name;
        
        // Try exact name match
        foundCard = setCardsData.data.find(card => 
          card.name.toLowerCase() === cardName.toLowerCase()
        );
        
        if (foundCard) {
          console.log(`✅ Found card in set scan by name match: ${cardName}`);
          return foundCard;
        }
        
        // Try partial name match
        foundCard = setCardsData.data.find(card => 
          card.name.toLowerCase().includes(cardName.toLowerCase()) || 
          cardName.toLowerCase().includes(card.name.toLowerCase())
        );
        
        if (foundCard) {
          console.log(`✅ Found card in set scan by partial name match`);
          return foundCard;
        }
      }
    }
    
    console.log(`❌ Could not find card ${cardId} using any method`);
    return null;
    
  } catch (error) {
    console.error(`Error fetching enhanced Pokemon card: ${error}`);
    return null;
  }
}

updateAllCards(); 