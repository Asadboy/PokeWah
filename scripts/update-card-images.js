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
 * This script updates card images in the database by fetching them from the Pokemon TCG API
 * It prioritizes cards that are in user collections
 */
async function updateCardImages() {
  console.log('Updating card images...');
  
  try {
    // First, get all cards in collections
    console.log('Fetching cards in user collections...');
    const { data: userCards, error: userCardsError } = await supabase
      .from('user_pokemon')
      .select(`
        id,
        pokemon:pokemon_id(id, card_id, name, image_url, set_name)
      `);
    
    if (userCardsError) {
      throw new Error(`Error fetching user cards: ${userCardsError.message}`);
    }
    
    // Extract unique pokemon IDs and identify cards with missing images
    const collectionCardIds = new Set();
    const cardsWithMissingImages = [];
    
    userCards.forEach(item => {
      if (item.pokemon?.id) {
        collectionCardIds.add(item.pokemon.id);
        
        // Check if image is missing or a placeholder
        if (!item.pokemon.image_url || 
            item.pokemon.image_url.includes('placeholder') || 
            item.pokemon.image_url.includes('symbol.png') || 
            item.pokemon.image_url.includes('logo.png')) {
          cardsWithMissingImages.push(item.pokemon);
        }
      }
    });
    
    console.log(`Found ${cardsWithMissingImages.length} cards with missing images in user collections`);
    
    // Group cards by set for batch processing
    const cardsBySet = {};
    cardsWithMissingImages.forEach(card => {
      const cardId = card.card_id;
      if (!cardId) return;
      
      const [setId] = cardId.split('-');
      if (!setId) return;
      
      if (!cardsBySet[setId]) {
        cardsBySet[setId] = {
          setName: card.set_name || 'Unknown Set',
          cards: []
        };
      }
      
      cardsBySet[setId].cards.push(card);
    });
    
    console.log(`Grouped cards into ${Object.keys(cardsBySet).length} sets for batch processing`);
    
    // Process each set
    let totalUpdatedCards = 0;
    
    for (const [setId, setData] of Object.entries(cardsBySet)) {
      console.log(`\nProcessing set: ${setData.setName} (${setId}) - ${setData.cards.length} cards`);
      
      try {
        // Make a single API call for all cards in this set
        console.log(`  Fetching batch data for set ${setId}...`);
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (!response.ok) {
          console.log(`  ❌ API call failed for set ${setId}: ${response.status} ${response.statusText}`);
          
          // Try traditional approach for each card as fallback
          console.log(`  Falling back to individual API calls for ${setData.cards.length} cards...`);
          for (const card of setData.cards) {
            await updateCardImageSingle(card);
            totalUpdatedCards++;
          }
          continue;
        }
        
        const data = await response.json();
        console.log(`  ✅ API returned ${data.data?.length || 0} cards for set ${setId}`);
        
        // Create maps for easy lookup
        const apiCardMap = {}; // by id
        const apiCardNumberMap = {}; // by number
        const apiCardNameMap = {}; // by name
        
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(apiCard => {
            if (apiCard.id) {
              apiCardMap[apiCard.id] = apiCard;
            }
            
            if (apiCard.number) {
              apiCardNumberMap[apiCard.number] = apiCard;
            }
            
            if (apiCard.name) {
              if (!apiCardNameMap[apiCard.name]) {
                apiCardNameMap[apiCard.name] = [];
              }
              apiCardNameMap[apiCard.name].push(apiCard);
            }
          });
        }
        
        // Update each card in this set
        let setUpdatedCount = 0;
        
        for (const card of setData.cards) {
          try {
            const cardId = card.card_id;
            const [, cardNumber] = cardId.split('-');
            let apiCard = null;
            
            // Try to find the card in the API response
            if (apiCardMap[cardId]) {
              // Direct ID match
              apiCard = apiCardMap[cardId];
            } else if (cardNumber && apiCardNumberMap[cardNumber]) {
              // Match by card number
              apiCard = apiCardNumberMap[cardNumber];
            } else if (card.name && apiCardNameMap[card.name]) {
              // Match by name (use first if multiple)
              apiCard = apiCardNameMap[card.name][0];
            }
            
            if (apiCard && apiCard.images && apiCard.images.small) {
              // Update the card in the database
              const { data: updateResult, error: updateError } = await supabase
                .from('pokemon')
                .update({
                  image_url: apiCard.images.small,
                  large_image_url: apiCard.images.large || apiCard.images.small
                })
                .eq('id', card.id)
                .select('id, name');
              
              if (updateError) {
                console.log(`  ❌ Failed to update ${card.name}: ${updateError.message}`);
              } else {
                console.log(`  ✅ Updated ${card.name} with new image`);
                setUpdatedCount++;
                totalUpdatedCards++;
              }
            } else {
              console.log(`  ⚠️ Could not find matching API data for ${card.name} (${cardId})`);
            }
          } catch (cardError) {
            console.log(`  ❌ Error processing card ${card.name}: ${cardError.message}`);
          }
        }
        
        console.log(`  Updated ${setUpdatedCount} of ${setData.cards.length} cards in set ${setData.setName}`);
      } catch (setError) {
        console.log(`  ❌ Error processing set ${setId}: ${setError.message}`);
      }
    }
    
    console.log(`\nTotal cards updated: ${totalUpdatedCards} of ${cardsWithMissingImages.length}`);
    
    // Check if there are any other cards with missing images not in collections
    console.log('\nChecking for remaining cards with missing images...');
    const { data: remainingCards, error: remainingError } = await supabase
      .from('pokemon')
      .select('id, card_id, name, image_url, set_name')
      .not('id', 'in', `(${Array.from(collectionCardIds).join(',')})`);
    
    if (remainingError) {
      throw new Error(`Error fetching remaining cards: ${remainingError.message}`);
    }
    
    const remainingMissingImages = remainingCards.filter(card => 
      !card.image_url || 
      card.image_url.includes('placeholder') || 
      card.image_url.includes('symbol.png') || 
      card.image_url.includes('logo.png')
    );
    
    console.log(`Found ${remainingMissingImages.length} cards with missing images not in any collection`);
    
  } catch (error) {
    console.error('Error updating card images:', error);
  }
}

// Function to update a single card by making an individual API call
async function updateCardImageSingle(card) {
  try {
    const cardId = card.card_id;
    if (!cardId) {
      console.log(`  ⚠️ Card ${card.name} has no card_id`);
      return false;
    }
    
    // Try direct API lookup
    const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.data && data.data.images && data.data.images.small) {
        // Update the card in the database
        const { error: updateError } = await supabase
          .from('pokemon')
          .update({
            image_url: data.data.images.small,
            large_image_url: data.data.images.large || data.data.images.small
          })
          .eq('id', card.id);
        
        if (updateError) {
          console.log(`  ❌ Failed to update ${card.name}: ${updateError.message}`);
          return false;
        } else {
          console.log(`  ✅ Updated ${card.name} with new image`);
          return true;
        }
      }
    }
    
    // If direct lookup fails, try additional strategies...
    const [setId, cardNumber] = cardId.split('-');
    
    if (setId && cardNumber) {
      // Try searching by number
      const numberSearchURL = `https://api.pokemontcg.io/v2/cards?q=number:${cardNumber} set.id:${setId}`;
      const numberSearchResponse = await fetch(numberSearchURL, {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      });
      
      if (numberSearchResponse.ok) {
        const numberSearchData = await numberSearchResponse.json();
        
        if (numberSearchData.data && numberSearchData.data.length > 0) {
          const apiCard = numberSearchData.data[0];
          
          // Update the card in the database
          const { error: updateError } = await supabase
            .from('pokemon')
            .update({
              image_url: apiCard.images.small,
              large_image_url: apiCard.images.large || apiCard.images.small
            })
            .eq('id', card.id);
          
          if (updateError) {
            console.log(`  ❌ Failed to update ${card.name}: ${updateError.message}`);
            return false;
          } else {
            console.log(`  ✅ Updated ${card.name} with new image`);
            return true;
          }
        }
      }
      
      // Try name search as last resort
      if (card.name) {
        const nameSearchURL = `https://api.pokemontcg.io/v2/cards?q=name:"${card.name}" set.id:${setId}`;
        const nameSearchResponse = await fetch(nameSearchURL, {
          headers: {
            'X-Api-Key': POKEMON_TCG_API_KEY
          }
        });
        
        if (nameSearchResponse.ok) {
          const nameSearchData = await nameSearchResponse.json();
          
          if (nameSearchData.data && nameSearchData.data.length > 0) {
            const apiCard = nameSearchData.data[0];
            
            // Update the card in the database
            const { error: updateError } = await supabase
              .from('pokemon')
              .update({
                image_url: apiCard.images.small,
                large_image_url: apiCard.images.large || apiCard.images.small
              })
              .eq('id', card.id);
            
            if (updateError) {
              console.log(`  ❌ Failed to update ${card.name}: ${updateError.message}`);
              return false;
            } else {
              console.log(`  ✅ Updated ${card.name} with new image`);
              return true;
            }
          }
        }
      }
    }
    
    console.log(`  ⚠️ Could not find API data for ${card.name} (${cardId})`);
    return false;
  } catch (error) {
    console.log(`  ❌ Error updating ${card.name}: ${error.message}`);
    return false;
  }
}

updateCardImages(); 