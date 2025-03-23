const fetch = require('node-fetch');

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

async function checkTemporalForcesSet() {
  console.log('Checking for Temporal Forces set in Pokemon TCG API...');
  
  try {
    // 1. Check all sets to find the proper ID for Temporal Forces
    console.log('Fetching all sets...');
    const setsResponse = await fetch('https://api.pokemontcg.io/v2/sets', {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (!setsResponse.ok) {
      throw new Error(`Failed to fetch sets: ${setsResponse.statusText}`);
    }
    
    const setsData = await setsResponse.json();
    console.log(`Found ${setsData.data.length} sets in the API`);
    
    // Look for Temporal Forces
    const temporalForcesSets = setsData.data.filter(set => 
      set.name.toLowerCase().includes('temporal forces') ||
      set.id.toLowerCase().includes('sv4')
    );
    
    if (temporalForcesSets.length > 0) {
      console.log('✅ Found Temporal Forces set(s):');
      temporalForcesSets.forEach(set => {
        console.log(`ID: ${set.id}, Name: ${set.name}, Released: ${set.releaseDate}`);
      });
      
      // If we found the set, try to query some cards from it
      if (temporalForcesSets.length > 0) {
        const setId = temporalForcesSets[0].id;
        console.log(`\nFetching cards from set ${setId}...`);
        
        const cardsResponse = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=10`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (!cardsResponse.ok) {
          throw new Error(`Failed to fetch cards: ${cardsResponse.statusText}`);
        }
        
        const cardsData = await cardsResponse.json();
        console.log(`Found ${cardsData.data.length} cards from ${setId}`);
        
        if (cardsData.data.length > 0) {
          console.log('\nExample cards:');
          cardsData.data.slice(0, 5).forEach(card => {
            console.log(`- ${card.number}/${card.set.printedTotal}: ${card.name} (ID: ${card.id})`);
          });
        }
      }
    } else {
      console.log('❌ Temporal Forces set not found in the API');
      
      // Let's try searching for other recent Scarlet & Violet sets
      console.log('\nRecent Scarlet & Violet sets:');
      const svSets = setsData.data
        .filter(set => set.id.toLowerCase().includes('sv'))
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      
      svSets.slice(0, 5).forEach(set => {
        console.log(`ID: ${set.id}, Name: ${set.name}, Released: ${set.releaseDate}`);
      });
    }

    // Let's also try to directly query one of our problematic cards
    console.log('\nTrying direct card queries for Temporal Forces cards:');
    const testCards = [
      "sv4tf-197-162", // Bianca's Devotion
      "sv4tf-168-162"  // Snom
    ];
    
    for (const cardId of testCards) {
      console.log(`\nQuerying card ${cardId}...`);
      const cardResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (cardResponse.ok) {
        const cardData = await cardResponse.json();
        console.log(`✅ Success! Found ${cardData.data.name}`);
      } else {
        console.log(`❌ Card not found: ${cardResponse.statusText}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking Temporal Forces set:', error);
  }
}

checkTemporalForcesSet(); 