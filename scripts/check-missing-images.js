require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

async function checkMissingImages() {
  console.log('Checking for cards with missing or placeholder images...');
  
  try {
    // Get all pokemon cards from the database
    const { data: cards, error } = await supabase
      .from('pokemon')
      .select('id, card_id, name, image_url, set_name');
    
    if (error) {
      throw new Error(`Error fetching cards: ${error.message}`);
    }
    
    console.log(`Found ${cards.length} total cards in the database`);
    
    // Identify cards with missing or placeholder images
    const missingImageCards = cards.filter(card => {
      // Check if image_url is null, undefined, or contains placeholder text
      return !card.image_url || 
        card.image_url.includes('placeholder') || 
        card.image_url.includes('symbol.png') || 
        card.image_url.includes('logo.png');
    });
    
    console.log(`Found ${missingImageCards.length} cards with missing or placeholder images`);
    
    // Group cards by set for analysis
    const cardsBySet = {};
    missingImageCards.forEach(card => {
      const setName = card.set_name || 'Unknown Set';
      if (!cardsBySet[setName]) {
        cardsBySet[setName] = [];
      }
      cardsBySet[setName].push(card);
    });
    
    console.log('\nMissing images by set:');
    for (const [setName, cardsInSet] of Object.entries(cardsBySet)) {
      console.log(`- ${setName}: ${cardsInSet.length} cards`);
    }
    
    // Test batch API call for one set with missing images
    if (Object.keys(cardsBySet).length > 0) {
      const setToTest = Object.keys(cardsBySet)[0];
      const setId = cardsBySet[setToTest][0].card_id?.split('-')[0];
      
      if (setId) {
        console.log(`\nTesting batch API call for set: ${setToTest} (ID: ${setId})`);
        
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`API returned ${data.data?.length || 0} cards for this set`);
          
          // Count how many missing cards we could potentially update
          const apiCardIds = new Set();
          if (data.data && Array.isArray(data.data)) {
            data.data.forEach(apiCard => {
              if (apiCard.id) {
                apiCardIds.add(apiCard.id);
              }
              if (apiCard.set?.id && apiCard.number) {
                apiCardIds.add(`${apiCard.set.id}-${apiCard.number}`);
              }
            });
          }
          
          const matchableCards = cardsBySet[setToTest].filter(card => 
            card.card_id && apiCardIds.has(card.card_id)
          );
          
          console.log(`We could update ${matchableCards.length} of ${cardsBySet[setToTest].length} cards with this batch API call`);
        } else {
          console.log(`API call failed for set ${setId}: ${response.status} ${response.statusText}`);
        }
      }
    }
    
    // Check how many cards are in collections (to prioritize updates)
    const { data: userCards, error: userCardsError } = await supabase
      .from('user_pokemon')
      .select(`
        id,
        pokemon:pokemon_id(id, card_id, name, image_url)
      `);
    
    if (userCardsError) {
      throw new Error(`Error fetching user cards: ${userCardsError.message}`);
    }
    
    const collectionCardIds = new Set();
    userCards.forEach(item => {
      if (item.pokemon?.id) {
        collectionCardIds.add(item.pokemon.id);
      }
    });
    
    const missingCollectionCards = missingImageCards.filter(card => 
      collectionCardIds.has(card.id)
    );
    
    console.log(`\nPriority: ${missingCollectionCards.length} cards with missing images are in user collections`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMissingImages(); 