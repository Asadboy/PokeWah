const fetch = require('node-fetch');

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

async function findBiancasDevotionCard() {
  console.log('Attempting to find Bianca\'s Devotion card using multiple approaches...');
  
  try {
    // First approach: Search by card name and set
    console.log('\n1. Searching by card name and set...');
    const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"Bianca's Devotion" set.name:"Temporal Forces"`;
    
    const nameSearchResponse = await fetch(nameSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (nameSearchResponse.ok) {
      const nameSearchData = await nameSearchResponse.json();
      if (nameSearchData.data && nameSearchData.data.length > 0) {
        console.log(`✅ Found ${nameSearchData.data.length} cards by name search`);
        nameSearchData.data.forEach(card => {
          console.log(`ID: ${card.id}, Name: ${card.name}, Number: ${card.number}, Set: ${card.set.name}`);
          console.log(`Image URL: ${card.images.small}`);
        });
      } else {
        console.log('❌ No cards found with name search');
      }
    } else {
      console.log(`❌ Name search failed: ${nameSearchResponse.statusText}`);
    }
    
    // Second approach: Try alternative ID formats
    console.log('\n2. Trying different ID formats...');
    const idFormats = [
      'sv5-197', // Standard format without the full number
      'sv5-tg31', // Trainer Gallery numbering
      'sv5-197-162', // First attempt format
      'sv5-TG31', // Uppercase TG
      'sv5-197/162' // With slash instead of dash
    ];
    
    for (const idFormat of idFormats) {
      console.log(`Trying ID format: ${idFormat}...`);
      const idResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${idFormat}`, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (idResponse.ok) {
        const idData = await idResponse.json();
        console.log(`✅ Found card with ID ${idFormat}:`);
        console.log(`ID: ${idData.data.id}, Name: ${idData.data.name}, Number: ${idData.data.number}`);
        console.log(`Image URL: ${idData.data.images.small}`);
        console.log(`Set: ${idData.data.set.name} (${idData.data.set.id})`);
        break;
      } else {
        console.log(`❌ ID format ${idFormat} failed: ${idResponse.statusText}`);
      }
    }
    
    // Third approach: Scan all cards in Temporal Forces set
    console.log('\n3. Scanning all cards in the Temporal Forces set...');
    const setCardsURL = `https://api.pokemontcg.io/v2/cards?q=set.id:sv5&pageSize=250`;
    
    const setCardsResponse = await fetch(setCardsURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (setCardsResponse.ok) {
      const setCardsData = await setCardsResponse.json();
      console.log(`Found ${setCardsData.data.length} cards in Temporal Forces set`);
      
      // Look for cards with number greater than the set's printed total
      const secretRares = setCardsData.data.filter(card => {
        const cardNumber = parseInt(card.number, 10);
        const printedTotal = parseInt(card.set.printedTotal, 10);
        return !isNaN(cardNumber) && !isNaN(printedTotal) && cardNumber > printedTotal;
      });
      
      if (secretRares.length > 0) {
        console.log(`✅ Found ${secretRares.length} secret rares (cards numbered above the set's printed total):`);
        secretRares.forEach(card => {
          console.log(`ID: ${card.id}, Name: ${card.name}, Number: ${card.number}/${card.set.printedTotal}`);
        });
      } else {
        console.log('❌ No secret rares found');
      }
      
      // Look for Trainer Gallery cards
      const trainerGallery = setCardsData.data.filter(card => 
        card.number.toLowerCase().includes('tg') || 
        card.id.toLowerCase().includes('tg')
      );
      
      if (trainerGallery.length > 0) {
        console.log(`\n✅ Found ${trainerGallery.length} Trainer Gallery cards:`);
        trainerGallery.forEach(card => {
          console.log(`ID: ${card.id}, Name: ${card.name}, Number: ${card.number}`);
        });
      } else {
        console.log('\n❌ No Trainer Gallery cards found');
      }
      
      // Check for any supporter cards like Bianca's Devotion
      const supporterCards = setCardsData.data.filter(card => 
        card.name.includes("'s") || 
        card.supertype === "Trainer" && card.subtypes.includes("Supporter")
      );
      
      if (supporterCards.length > 0) {
        console.log(`\n✅ Found ${supporterCards.length} supporter cards:`);
        supporterCards.forEach(card => {
          console.log(`ID: ${card.id}, Name: ${card.name}, Number: ${card.number}`);
          if (card.name.toLowerCase().includes("bianca")) {
            console.log(`✅✅✅ FOUND BIANCA'S CARD! ID: ${card.id}`);
          }
        });
      } else {
        console.log('\n❌ No supporter cards found');
      }
    } else {
      console.log(`❌ Set scan failed: ${setCardsResponse.statusText}`);
    }
    
    // Fourth approach: Try searching for other character names
    console.log('\n4. Searching for cards by character names...');
    const characterNames = ["Bianca", "Morty", "Iron", "Farigiraf"];
    
    for (const name of characterNames) {
      console.log(`Searching for cards with name containing "${name}"...`);
      const nameQueryURL = `https://api.pokemontcg.io/v2/cards?q=name:"${name}" set.id:sv5`;
      
      const nameQueryResponse = await fetch(nameQueryURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (nameQueryResponse.ok) {
        const nameQueryData = await nameQueryResponse.json();
        if (nameQueryData.data && nameQueryData.data.length > 0) {
          console.log(`✅ Found ${nameQueryData.data.length} cards containing "${name}":`);
          nameQueryData.data.forEach(card => {
            console.log(`ID: ${card.id}, Name: ${card.name}, Number: ${card.number}`);
          });
        } else {
          console.log(`❌ No cards found containing "${name}"`);
        }
      } else {
        console.log(`❌ Character search failed: ${nameQueryResponse.statusText}`);
      }
    }
    
    console.log('\nSearch completed. If no cards were found, they may not be available in the API yet.');
  } catch (error) {
    console.error('Error searching for cards:', error);
  }
}

findBiancasDevotionCard(); 