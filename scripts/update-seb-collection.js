require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

/**
 * This script updates Seb's collection with cards from the CSV file
 * 1. First, it removes all of Seb's current cards
 * 2. Then, it reads the CSV file and adds the cards to Seb's collection
 */
async function updateSebCollection() {
  console.log('Updating Seb\'s collection...');
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get Seb's user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'Seb')
      .single();
    
    if (userError) {
      throw new Error(`Failed to find Seb's user account: ${userError.message}`);
    }
    
    const sebId = user.id;
    console.log(`Found Seb's ID: ${sebId}`);
    
    // Remove all of Seb's current cards
    console.log('Removing all of Seb\'s current cards...');
    const { data: deleteResult, error: deleteError } = await supabase
      .from('user_pokemon')
      .delete()
      .eq('user_id', sebId)
      .select('id');
    
    if (deleteError) {
      throw new Error(`Failed to delete Seb's cards: ${deleteError.message}`);
    }
    
    console.log(`Deleted ${deleteResult?.length || 0} cards from Seb's collection`);
    
    // Read and parse the CSV file
    console.log('Reading CSV file...');
    const csvFilePath = path.join(__dirname, '../SebPoke.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} cards in the CSV file`);
    
    // Process each card
    let addedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        console.log(`Processing card ${i+1}/${records.length}: ${record['Product Name']} (${record['Card Number']}) from ${record['Set']}...`);
        
        // Create card ID based on set and card number
        const normalizedSet = normalizeSetName(record['Set']);
        const cardId = buildCardId(record['Product Name'], normalizedSet, record['Card Number'], record['Rarity']);
        
        // Check if card exists in database
        let { data: existingCard, error: cardError } = await supabase
          .from('pokemon')
          .select('id')
          .eq('card_id', cardId)
          .single();
        
        let pokemonId;
        
        if (cardError || !existingCard) {
          console.log(`Card ${record['Product Name']} not found in database, fetching from API...`);
          
          // Fetch card from API
          const cardData = await fetchCardFromApi({
            id: cardId,
            name: record['Product Name'],
            number: record['Card Number'],
            set_name: record['Set'],
            rarity: record['Rarity'],
            variance: record['Variance']
          });
          
          if (cardData) {
            // Insert card into database
            const { data: newCard, error: insertError } = await supabase
              .from('pokemon')
              .insert({
                card_id: cardId,
                name: cardData.name,
                image_url: cardData.images.small,
                large_image_url: cardData.images.large,
                set_name: cardData.set.name,
                rarity: cardData.rarity || record['Rarity'],
                types: cardData.types,
                hp: cardData.hp,
                artist: cardData.artist
              })
              .select('id')
              .single();
            
            if (insertError) {
              throw new Error(`Failed to insert card ${record['Product Name']}: ${insertError.message}`);
            }
            
            pokemonId = newCard.id;
            console.log(`Added new card to database with ID: ${pokemonId}`);
          } else {
            throw new Error(`Could not fetch card data for ${record['Product Name']}`);
          }
        } else {
          pokemonId = existingCard.id;
          console.log(`Found existing card in database with ID: ${pokemonId}`);
        }
        
        // Add card to Seb's collection
        const acquiredDate = record['Date Added'] ? new Date(record['Date Added']).toISOString() : new Date().toISOString();
        const { data: userPokemon, error: addError } = await supabase
          .from('user_pokemon')
          .insert({
            user_id: sebId,
            pokemon_id: pokemonId,
            acquired_date: acquiredDate
          })
          .select('id')
          .single();
        
        if (addError) {
          throw new Error(`Failed to add ${record['Product Name']} to Seb's collection: ${addError.message}`);
        }
        
        console.log(`Added ${record['Product Name']} to Seb's collection with relation ID: ${userPokemon.id}`);
        addedCount++;
      } catch (error) {
        console.error(`Error processing card ${record['Product Name']}: ${error.message}`);
        errorCount++;
      }
      
      // Add a small delay to prevent rate limiting
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Processing complete! Added ${addedCount} cards to Seb's collection. Encountered ${errorCount} errors.`);
    
  } catch (error) {
    console.error('Failed to update Seb\'s collection:', error);
  }
}

/**
 * Enhanced function to fetch a Pokemon card using multiple search strategies
 */
async function fetchCardFromApi(card) {
  try {
    console.log(`Fetching card: ${card.name} (${card.id})`);
    
    // Strategy 1: Direct ID lookup (most efficient)
    const directResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log(`✅ Found card directly with ID ${card.id}`);
      return directData.data;
    }
    
    console.log(`❌ Direct lookup failed, trying alternative strategies...`);
    
    // Get the normalized set id
    const setId = getSetId(card.set_name);
    if (setId) {
      // Strategy 2: Search by set ID and card number
      const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${card.number} set.id:${setId}`;
      const numberSearchResponse = await fetch(numberSearchURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (numberSearchResponse.ok) {
        const numberSearchData = await numberSearchResponse.json();
        if (numberSearchData.data && numberSearchData.data.length > 0) {
          console.log(`✅ Found card by number search: ${card.number} in set ${setId}`);
          return numberSearchData.data[0];
        }
      }
      
      // Strategy 3: Search by name and set
      const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${card.name}" set.id:${setId}`;
      const nameSearchResponse = await fetch(nameSearchURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (nameSearchResponse.ok) {
        const nameSearchData = await nameSearchResponse.json();
        if (nameSearchData.data && nameSearchData.data.length > 0) {
          console.log(`✅ Found card by name search: ${card.name} in set ${setId}`);
          return nameSearchData.data[0];
        }
      }
    }
    
    // Strategy 4: Search by just the name
    const generalNameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${card.name}"`;
    const generalNameSearchResponse = await fetch(generalNameSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (generalNameSearchResponse.ok) {
      const generalNameSearchData = await generalNameSearchResponse.json();
      if (generalNameSearchData.data && generalNameSearchData.data.length > 0) {
        // Try to find one that matches the card number
        const matchingCard = generalNameSearchData.data.find(c => c.number === card.number);
        if (matchingCard) {
          console.log(`✅ Found card by general name search with matching number: ${card.name} #${card.number}`);
          return matchingCard;
        }
        
        // Otherwise just return the first one
        console.log(`✅ Found card by general name search (first result): ${card.name}`);
        return generalNameSearchData.data[0];
      }
    }

    // If all strategies failed, create a mock card
    console.log(`❌ Could not find card ${card.id} - creating minimal mock data`);
    return createMockCard(card);
    
  } catch (error) {
    console.error(`Error fetching card: ${error}`);
    return createMockCard(card);
  }
}

/**
 * Create mock card data for cards not found in the API
 */
function createMockCard(card) {
  const setId = getSetId(card.set_name) || 'base1';
  
  return {
    id: card.id,
    name: card.name,
    images: {
      small: `https://images.pokemontcg.io/${setId}/symbol.png`,
      large: `https://images.pokemontcg.io/${setId}/logo.png`
    },
    number: card.number,
    set: {
      id: setId,
      name: card.set_name,
      series: getSeries(card.set_name)
    },
    rarity: card.rarity || "Unknown",
    artist: "Pokemon TCG"
  };
}

/**
 * Get the series from the set name
 */
function getSeries(setName) {
  if (setName.includes('Sword & Shield') || setName.includes('SWSH')) {
    return 'Sword & Shield';
  } else if (setName.includes('Scarlet & Violet') || setName.includes('SV')) {
    return 'Scarlet & Violet';
  } else if (setName.includes('Sun & Moon') || setName.includes('SM')) {
    return 'Sun & Moon';
  } else if (setName.includes('XY')) {
    return 'XY';
  } else if (setName.includes('Black & White') || setName.includes('BW')) {
    return 'Black & White';
  } else if (setName.includes('Diamond & Pearl') || setName.includes('DP')) {
    return 'Diamond & Pearl';
  } else if (setName.includes('EX')) {
    return 'EX';
  } else if (setName.includes('HeartGold & SoulSilver') || setName.includes('HGSS')) {
    return 'HeartGold & SoulSilver';
  } else if (setName.includes('Platinum')) {
    return 'Platinum';
  } else {
    return 'Other';
  }
}

/**
 * Build a card ID based on set and card number
 */
function buildCardId(name, setName, cardNumber, rarity) {
  const setId = getSetId(setName);
  if (setId) {
    return `${setId}-${cardNumber}`;
  }
  
  // Fallback: create a more generic ID
  const normalizedSetName = setName.toLowerCase().replace(/\s+/g, '-');
  return `${normalizedSetName}-${cardNumber}`;
}

/**
 * Get the set ID from the set name
 */
function getSetId(setName) {
  // Map of set names to their IDs
  const setMap = {
    'Diamond and Pearl': 'dp1',
    'Diamond & Pearl': 'dp1',
    'Diamond and Pearl Promos': 'dpp',
    'Great Encounters': 'dp4',
    'Majestic Dawn': 'dp5',
    'Legends Awakened': 'dp6',
    'Mysterious Treasures': 'dp2',
    'Secret Wonders': 'dp3',
    'EX Crystal Guardians': 'ex14',
    'EX Dragon Frontiers': 'ex15',
    'EX Delta Species': 'ex13',
    'EX Power Keepers': 'ex16',
    'EX Team Magma vs Team Aqua': 'ex7',
    'EX Legend Maker': 'ex12',
    'Platinum': 'pl1',
    'Platinum Arceus': 'pl4',
    'Rising Rivals': 'pl2',
    'Supreme Victors': 'pl3',
    'Legendary Collection': 'base6',
    'POP Series 8': 'pop8',
    'Temporal Forces': 'sv5',
    'Twilight Masquerade': 'swsh12tm',
    'Scarlet & Violet Promo': 'svp',
    'Paradox Rift': 'sv4',
    'Prismatic Evolutions': 'sv6',
    'Stellar Crown': 'sv7',
    'Trainer Deck A': 'base1',
    'World Championship Decks': 'base1' // This is a placeholder
  };
  
  return setMap[setName] || null;
}

/**
 * Normalize set names to match the API
 */
function normalizeSetName(setName) {
  return setName;
}

updateSebCollection(); 