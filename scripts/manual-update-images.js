require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// List of cards with manual image URLs
// Format: [pokemon_id, card name, image URL]
const cardsToUpdate = [
  // Example: World Championship Decks
  ['xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', "Aaron's Collection - 2009 (Tsubasa Nakamura)", "https://example.com/image.png"],
  
  // Add more cards here
];

async function updateCardImagesManually() {
  try {
    console.log(`Starting manual update of ${cardsToUpdate.length} card images...`);
    
    // Verify connection to Supabase
    const { data: connectionTest, error: connectionError } = await supabase.from('pokemon').select('id').limit(1);
    if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError.message);
      return;
    }
    console.log('Connected to Supabase successfully');
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each card with its manual image URL
    for (const [pokemonId, cardName, imageUrl] of cardsToUpdate) {
      try {
        // Skip if no image URL is provided
        if (!imageUrl || !pokemonId) {
          console.log(`⚠️ Skipping ${cardName} - Missing ID or image URL`);
          errorCount++;
          continue;
        }
        
        // Update the image URL in the database
        const { data, error } = await supabase
          .from('pokemon')
          .update({ image_url: imageUrl })
          .eq('id', pokemonId)
          .select();
          
        if (error) {
          console.error(`❌ Error updating ${cardName}: ${error.message}`);
          errorCount++;
        } else if (data && data.length > 0) {
          console.log(`✅ Updated ${cardName} with new image URL`);
          updatedCount++;
        } else {
          console.log(`⚠️ No card found with ID ${pokemonId} for ${cardName}`);
          errorCount++;
        }
      } catch (cardError) {
        console.error(`❌ Exception processing ${cardName}: ${cardError.message}`);
        errorCount++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`Total cards processed: ${cardsToUpdate.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed to update: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in manual update process:', error.message);
  }
}

// Run the update function
updateCardImagesManually(); 