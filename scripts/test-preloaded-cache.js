require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

async function testPreloadedCachePerformance() {
  console.log('Testing preloaded cache implementation performance...');
  console.log('--------------------------------------------------');
  
  const startTime = Date.now();
  let preprocessingTime = 0;
  let userLoadingTime = 0;
  let apiLookupTime = 0;
  
  try {
    // STEP 1: Preload all card images from the database
    console.log('\nStep 1: Preloading card images from database...');
    const preloadStart = Date.now();
    
    const { data: allCards, error: cardsError } = await supabase
      .from('pokemon')
      .select('card_id, image_url');
    
    if (cardsError) throw cardsError;
    
    // Create the initial image cache from database
    const imageCache = {};
    let cardsWithImages = 0;
    let cardsWithoutImages = 0;
    
    allCards.forEach(card => {
      if (card.card_id && card.image_url && !card.image_url.includes('placeholder')) {
        imageCache[card.card_id] = card.image_url;
        cardsWithImages++;
      } else if (card.card_id) {
        cardsWithoutImages++;
      }
    });
    
    const preloadEnd = Date.now();
    preprocessingTime = preloadEnd - preloadStart;
    
    console.log(`Preloaded ${cardsWithImages} cards with images and identified ${cardsWithoutImages} cards without images`);
    console.log(`Preload time: ${preprocessingTime / 1000} seconds`);
    
    // STEP 2: Load all users with their collections
    console.log('\nStep 2: Loading user collections...');
    const userLoadStart = Date.now();
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_pokemon(
          *,
          pokemon:pokemon_id(*)
        )
      `);
    
    if (error) throw error;
    
    const userLoadEnd = Date.now();
    userLoadingTime = userLoadEnd - userLoadStart;
    
    const totalUsers = data.length;
    const totalUserCards = data.reduce((acc, user) => acc + user.user_pokemon.length, 0);
    
    console.log(`Loaded ${totalUsers} users with a total of ${totalUserCards} cards`);
    console.log(`User loading time: ${userLoadingTime / 1000} seconds`);
    
    // STEP 3: Identify cards with missing images
    console.log('\nStep 3: Identifying cards with missing images...');
    const missingCardIds = new Set();
    
    data.forEach(user => {
      user.user_pokemon.forEach(item => {
        if (
          item.pokemon?.card_id && 
          !imageCache[item.pokemon.card_id]
        ) {
          missingCardIds.add(item.pokemon.card_id);
        }
      });
    });
    
    console.log(`Found ${missingCardIds.size} cards with missing images`);
    
    // STEP 4: If there are missing images, fetch them from the API
    if (missingCardIds.size > 0) {
      console.log('\nStep 4: Fetching missing card images from API...');
      const apiLookupStart = Date.now();
      
      // Group cards by set to minimize API calls
      const cardsBySet = {};
      
      Array.from(missingCardIds).forEach(cardId => {
        const [setId] = cardId.split('-');
        if (!setId) return;
        
        if (!cardsBySet[setId]) {
          cardsBySet[setId] = [];
        }
        
        cardsBySet[setId].push(cardId);
      });
      
      // Test API calls for one set only (to avoid hitting rate limits)
      const sampleSetId = Object.keys(cardsBySet)[0];
      const sampleCardIds = cardsBySet[sampleSetId];
      
      if (sampleSetId && sampleCardIds) {
        console.log(`Testing batch API call for set ${sampleSetId} with ${sampleCardIds.length} cards...`);
        
        // Try batch API call for the set
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${sampleSetId}&pageSize=250`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        let foundCount = 0;
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data && Array.isArray(data.data)) {
            console.log(`API returned ${data.data.length} cards for set ${sampleSetId}`);
            
            // Process each card in the API response
            data.data.forEach(card => {
              // Match by card ID
              if (card.id && sampleCardIds.includes(card.id) && card.images?.small) {
                foundCount++;
              }
              
              // Also match by set ID and number format
              if (card.set?.id && card.number) {
                const formattedId = `${card.set.id}-${card.number}`;
                if (sampleCardIds.includes(formattedId) && card.images?.small) {
                  foundCount++;
                }
              }
            });
          }
        }
        
        console.log(`Found images for ${foundCount} out of ${sampleCardIds.length} cards in the sample set`);
      }
      
      const apiLookupEnd = Date.now();
      apiLookupTime = apiLookupEnd - apiLookupStart;
      
      console.log(`API lookup time: ${apiLookupTime / 1000} seconds`);
    } else {
      console.log('\nStep 4: No missing images to fetch from API');
    }
    
    // Summary
    const totalTime = Date.now() - startTime;
    
    console.log('\nPerformance Summary:');
    console.log('------------------');
    console.log(`Total execution time: ${totalTime / 1000} seconds`);
    console.log(`Preprocessing (cache creation): ${preprocessingTime / 1000} seconds (${Math.round(preprocessingTime / totalTime * 100)}%)`);
    console.log(`User data loading: ${userLoadingTime / 1000} seconds (${Math.round(userLoadingTime / totalTime * 100)}%)`);
    
    if (apiLookupTime > 0) {
      console.log(`API lookup for missing images: ${apiLookupTime / 1000} seconds (${Math.round(apiLookupTime / totalTime * 100)}%)`);
    }
    
  } catch (error) {
    console.error('Error testing preloaded cache performance:', error);
  }
}

// Run the test
testPreloadedCachePerformance(); 