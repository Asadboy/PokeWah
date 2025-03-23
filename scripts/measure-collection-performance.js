require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

async function measurePerformance() {
  console.log('Testing collection loading performance...');
  console.log('----------------------------------------');
  
  // Test 1: Current approach (baseline)
  console.log('\nTest 1: Current approach (baseline)');
  await testCurrentImplementation();
  
  // Test 2: Optimized query (reduce joins)
  console.log('\nTest 2: Optimized query (reduce joins)');
  await testOptimizedQuery();
  
  // Test 3: Pagination
  console.log('\nTest 3: Pagination approach');
  await testPagination();
  
  // Test 4: Batch API calls
  console.log('\nTest 4: Batched API calls');
  await testBatchedApiCalls();
  
  // Test 5: Preloaded cache
  console.log('\nTest 5: Preloaded cache approach');
  await testPreloadedCache();
}

// Test 1: Current implementation
async function testCurrentImplementation() {
  const start = Date.now();
  
  try {
    // This mimics the current implementation in UserCollection.tsx
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        user_pokemon(
          *,
          pokemon:pokemon_id(*)
        )
      `);
    
    if (error) throw error;
    
    // Extract all unique card IDs
    const cardIds = new Set();
    users.forEach(user => {
      user.user_pokemon.forEach(item => {
        if (item.pokemon?.card_id) {
          cardIds.add(item.pokemon.card_id);
        }
      });
    });
    
    // Fetch enhanced card images for each card
    for (const cardId of Array.from(cardIds)) {
      try {
        // First try direct API approach
        const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (!response.ok) {
          // If direct approach fails, try extracting set ID and number
          const [setId, cardNumber] = cardId.split('-');
          if (setId && cardNumber) {
            // Try searching by number and set
            const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${cardNumber} set.id:${setId}`;
            await fetch(numberSearchURL, {
              headers: {
                'X-Api-Key': POKEMON_TCG_API_KEY
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching card image for ${cardId}:`, error);
      }
    }
    
    const end = Date.now();
    const totalCards = cardIds.size;
    const totalUsers = users.length;
    const totalItems = users.reduce((acc, user) => acc + user.user_pokemon.length, 0);
    
    console.log(`Duration: ${(end - start) / 1000} seconds`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Total unique cards: ${totalCards}`);
    console.log(`Total collection items: ${totalItems}`);
  } catch (error) {
    console.error('Error in current implementation test:', error);
  }
}

// Test 2: Optimized query approach
async function testOptimizedQuery() {
  const start = Date.now();
  
  try {
    // Simplified query - skip the extra joins and perform them client-side
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');
    
    if (usersError) throw usersError;
    
    // Get all user_pokemon entries in a single query
    const { data: userPokemon, error: collectionError } = await supabase
      .from('user_pokemon')
      .select(`
        id, 
        user_id, 
        pokemon_id, 
        acquired_date
      `);
    
    if (collectionError) throw collectionError;
    
    // Get unique pokemon IDs
    const pokemonIds = new Set(userPokemon.map(item => item.pokemon_id));
    
    // Get all pokemon data in a single query
    const { data: pokemon, error: pokemonError } = await supabase
      .from('pokemon')
      .select('*')
      .in('id', Array.from(pokemonIds));
    
    if (pokemonError) throw pokemonError;
    
    // Create a lookup map for pokemon by ID
    const pokemonMap = pokemon.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
    
    // Extract unique card IDs
    const cardIds = new Set(pokemon.map(p => p.card_id).filter(Boolean));
    
    // Fetch first 10 card images as a sample (to measure API performance)
    const cardIdSample = Array.from(cardIds).slice(0, 10);
    for (const cardId of cardIdSample) {
      await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
    }
    
    const end = Date.now();
    console.log(`Duration: ${(end - start) / 1000} seconds`);
    console.log(`Total users: ${users.length}`);
    console.log(`Total unique cards: ${cardIds.size}`);
    console.log(`Total collection items: ${userPokemon.length}`);
  } catch (error) {
    console.error('Error in optimized query test:', error);
  }
}

// Test 3: Pagination approach
async function testPagination() {
  const start = Date.now();
  const pageSize = 20;
  
  try {
    // Get users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');
    
    if (usersError) throw usersError;
    
    // For each user, get their first page of cards (paginated)
    let totalItems = 0;
    const cardIds = new Set();
    
    for (const user of users) {
      const { data: userPokemon, error: pokemonError } = await supabase
        .from('user_pokemon')
        .select(`
          id,
          acquired_date,
          pokemon:pokemon_id(*)
        `)
        .eq('user_id', user.id)
        .order('acquired_date', { ascending: false })
        .range(0, pageSize - 1);
      
      if (pokemonError) throw pokemonError;
      
      userPokemon.forEach(item => {
        if (item.pokemon?.card_id) {
          cardIds.add(item.pokemon.card_id);
        }
      });
      
      totalItems += userPokemon.length;
    }
    
    // Sample a few card API calls (just to simulate the real behavior)
    const cardIdSample = Array.from(cardIds).slice(0, 5);
    for (const cardId of cardIdSample) {
      await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
    }
    
    const end = Date.now();
    console.log(`Duration: ${(end - start) / 1000} seconds`);
    console.log(`Total users: ${users.length}`);
    console.log(`Total unique cards (in first page): ${cardIds.size}`);
    console.log(`Total collection items (in first page): ${totalItems}`);
    console.log(`Page size: ${pageSize}`);
  } catch (error) {
    console.error('Error in pagination test:', error);
  }
}

// Test 4: Batched API calls
async function testBatchedApiCalls() {
  const start = Date.now();
  
  try {
    // Get basic collection data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        user_pokemon(
          *,
          pokemon:pokemon_id(*)
        )
      `);
    
    if (usersError) throw usersError;
    
    // Extract all unique card IDs
    const cardIds = new Set();
    users.forEach(user => {
      user.user_pokemon.forEach(item => {
        if (item.pokemon?.card_id) {
          cardIds.add(item.pokemon.card_id);
        }
      });
    });
    
    // Group cards by set to make bulk API calls
    const cardsBySet = {};
    Array.from(cardIds).forEach(cardId => {
      const [setId] = cardId.split('-');
      if (!cardsBySet[setId]) {
        cardsBySet[setId] = [];
      }
      cardsBySet[setId].push(cardId);
    });
    
    // Make bulk API calls by set
    for (const [setId, cards] of Object.entries(cardsBySet)) {
      // Limit to max 250 cards per API call
      if (cards.length > 0) {
        // Just make one call per set as a sample
        await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
      }
    }
    
    const end = Date.now();
    const totalCards = cardIds.size;
    const totalUsers = users.length;
    const totalItems = users.reduce((acc, user) => acc + user.user_pokemon.length, 0);
    
    console.log(`Duration: ${(end - start) / 1000} seconds`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Total unique cards: ${totalCards}`);
    console.log(`Total collection items: ${totalItems}`);
    console.log(`Total set batches: ${Object.keys(cardsBySet).length}`);
  } catch (error) {
    console.error('Error in batched API calls test:', error);
  }
}

// Test 5: Preloaded cache approach
async function testPreloadedCache() {
  const start = Date.now();
  
  try {
    // First, check what cards we have in our database
    const { data: allCards, error: cardsError } = await supabase
      .from('pokemon')
      .select('card_id, image_url');
    
    if (cardsError) throw cardsError;
    
    // Create a map of card_id to image_url
    const cardImageMap = allCards.reduce((acc, card) => {
      if (card.card_id && card.image_url) {
        acc[card.card_id] = card.image_url;
      }
      return acc;
    }, {});
    
    // Now get the users with their collections
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        user_pokemon(
          *,
          pokemon:pokemon_id(*)
        )
      `);
    
    if (usersError) throw usersError;
    
    // Extract card IDs that don't have images in our database
    const missingCardIds = new Set();
    users.forEach(user => {
      user.user_pokemon.forEach(item => {
        if (item.pokemon?.card_id && !cardImageMap[item.pokemon.card_id]) {
          missingCardIds.add(item.pokemon.card_id);
        }
      });
    });
    
    // Only fetch images for cards that don't have them
    if (missingCardIds.size > 0) {
      // Just sample a few cards to test API performance
      const cardIdSample = Array.from(missingCardIds).slice(0, 5);
      for (const cardId of cardIdSample) {
        await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
      }
    }
    
    const end = Date.now();
    const totalCards = allCards.length;
    const totalUsers = users.length;
    const totalItems = users.reduce((acc, user) => acc + user.user_pokemon.length, 0);
    
    console.log(`Duration: ${(end - start) / 1000} seconds`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Total cards in database: ${totalCards}`);
    console.log(`Total collection items: ${totalItems}`);
    console.log(`Missing card images: ${missingCardIds.size}`);
  } catch (error) {
    console.error('Error in preloaded cache test:', error);
  }
}

measurePerformance(); 