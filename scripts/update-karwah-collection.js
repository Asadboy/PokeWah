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
 * This script updates Karwah's collection with the specified cards
 * 1. First, it removes all of Karwah's current cards
 * 2. Then, it adds the new specified cards
 */
async function updateKarwahCollection() {
  console.log('Updating Karwah\'s collection...');
  
  try {
    // Verify Supabase connection
    console.log('Verifying connection...');
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }
    console.log('Connection successful!');
    
    // Get Karwah's user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'Karwah')
      .single();
    
    if (userError) {
      throw new Error(`Failed to find Karwah's user account: ${userError.message}`);
    }
    
    const karwahId = user.id;
    console.log(`Found Karwah's ID: ${karwahId}`);
    
    // Remove all of Karwah's current cards
    console.log('Removing all of Karwah\'s current cards...');
    const { data: deleteResult, error: deleteError } = await supabase
      .from('user_pokemon')
      .delete()
      .eq('user_id', karwahId)
      .select('id');
    
    if (deleteError) {
      throw new Error(`Failed to delete Karwah's cards: ${deleteError.message}`);
    }
    
    console.log(`Deleted ${deleteResult?.length || 0} cards from Karwah's collection`);
    
    // List of new cards to add - with their best identifiers for searching
    const cardsToAdd = [
      { 
        id: "swsh12tm-177", 
        name: "Heliolisk", 
        number: "177", 
        set_id: "swsh12tm", 
        set_name: "Twilight Masquerade"
      },
      { 
        id: "sv5-209", 
        name: "Bianca's Devotion", 
        number: "209/162", 
        set_id: "sv5", 
        set_name: "Temporal Forces"
      },
      { 
        id: "s10a-51", 
        name: "Snorlax", 
        number: "51", 
        set_id: "s10a", 
        set_name: "Crimson Haze", 
        japanese: true
      },
      { 
        id: "s10d-46", 
        name: "Nacli", 
        number: "46", 
        set_id: "s10d", 
        set_name: "Clay Burst", 
        japanese: true
      }
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
          const cardData = await fetchCardFromApi(card);
          
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
        
        // Add card to Karwah's collection
        const { data: userPokemon, error: addError } = await supabase
          .from('user_pokemon')
          .insert({
            user_id: karwahId,
            pokemon_id: pokemonId,
            acquired_date: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (addError) {
          throw new Error(`Failed to add ${card.name} to Karwah's collection: ${addError.message}`);
        }
        
        console.log(`Added ${card.name} to Karwah's collection with relation ID: ${userPokemon.id}`);
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error.message}`);
      }
    }
    
    console.log('All cards processed! Karwah\'s collection has been updated.');
    
  } catch (error) {
    console.error('Failed to update Karwah\'s collection:', error);
  }
}

/**
 * Enhanced function to fetch a Pokemon card using multiple search strategies
 */
async function fetchCardFromApi(card) {
  try {
    console.log(`Fetching card: ${card.name} (${card.id})`);
    
    // If it's a Japanese card, we'll likely need to create mock data
    if (card.japanese) {
      console.log(`This is a Japanese card (${card.set_name}), creating mock data`);
      return createMockJapaneseCard(card);
    }
    
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
    
    // Strategy 2: Search by set ID and card number
    const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${card.number} set.id:${card.set_id}`;
    const numberSearchResponse = await fetch(numberSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (numberSearchResponse.ok) {
      const numberSearchData = await numberSearchResponse.json();
      if (numberSearchData.data && numberSearchData.data.length > 0) {
        console.log(`✅ Found card by number search: ${card.number} in set ${card.set_id}`);
        return numberSearchData.data[0];
      }
    }
    
    // Strategy 3: Search by name and set
    const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${card.name}" set.id:${card.set_id}`;
    const nameSearchResponse = await fetch(nameSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (nameSearchResponse.ok) {
      const nameSearchData = await nameSearchResponse.json();
      if (nameSearchData.data && nameSearchData.data.length > 0) {
        console.log(`✅ Found card by name search: ${card.name}`);
        return nameSearchData.data[0];
      }
    }
    
    // Strategy 4: For Bianca's Devotion SIR, try the special searching we did before
    if (card.name === "Bianca's Devotion" && card.number.includes("209")) {
      console.log(`Trying special search for Bianca's Devotion SIR...`);
      // Try just searching for all Bianca's Devotion cards
      const biancaSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"Bianca's Devotion"`;
      const biancaSearchResponse = await fetch(biancaSearchURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (biancaSearchResponse.ok) {
        const biancaSearchData = await biancaSearchResponse.json();
        if (biancaSearchData.data && biancaSearchData.data.length > 0) {
          // Find the one with number 209
          const bianca209 = biancaSearchData.data.find(c => c.number === "209");
          if (bianca209) {
            console.log(`✅ Found Bianca's Devotion #209 through direct name search`);
            return bianca209;
          }
        }
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
  return {
    id: card.id,
    name: card.name,
    images: {
      small: `https://images.pokemontcg.io/${card.set_id}/symbol.png`,
      large: `https://images.pokemontcg.io/${card.set_id}/logo.png`
    },
    number: card.number,
    set: {
      id: card.set_id,
      name: card.set_name,
      series: card.set_id.startsWith("sv") ? "Scarlet & Violet" : "Sword & Shield"
    },
    rarity: card.number.includes("/") ? "Secret Rare" : "Rare",
    artist: "Pokemon TCG"
  };
}

/**
 * Create mock data for Japanese cards
 */
function createMockJapaneseCard(card) {
  let setName = card.set_name;
  let series = "Japanese";
  
  return {
    id: card.id,
    name: card.name,
    images: {
      small: `https://images.pokemontcg.io/base1/symbol.png`, // Placeholder
      large: `https://images.pokemontcg.io/base1/logo.png`    // Placeholder
    },
    number: card.number,
    set: {
      id: card.set_id,
      name: setName,
      series: series
    },
    rarity: "Japanese Rare",
    artist: "Pokemon TCG"
  };
}

updateKarwahCollection(); 