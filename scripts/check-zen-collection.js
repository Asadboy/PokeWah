require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkZenCollection() {
  // Connect to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Get Zen's user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'Zen')
    .single();
  
  if (!user) {
    console.error('User Zen not found');
    return;
  }
  
  console.log(`Zen's user ID: ${user.id}`);
  
  // Get Zen's cards
  const { data: collection, error } = await supabase
    .from('user_pokemon')
    .select(`
      id,
      acquired_date,
      pokemon:pokemon_id (
        id,
        name,
        card_id,
        image_url,
        rarity
      )
    `)
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error fetching collection:', error);
    return;
  }
  
  console.log(`Zen has ${collection.length} cards in his collection:`);
  
  // Display all cards
  collection.forEach((item, index) => {
    console.log(`${index + 1}. ${item.pokemon.name} (${item.pokemon.card_id}) - ${item.pokemon.rarity || 'Unknown'}`);
    console.log(`   Acquired: ${new Date(item.acquired_date).toLocaleDateString()}`);
    console.log(`   Image: ${item.pokemon.image_url}`);
    console.log('---');
  });
  
  // Check for the specific Temporal Forces cards
  const temporalForces = collection.filter(item => 
    item.pokemon.card_id.startsWith('sv5-') && 
    ['166', '167', '183', '180'].includes(item.pokemon.card_id.split('-')[1])
  );
  
  console.log('\nTemporal Forces Special Cards:');
  temporalForces.forEach((item, index) => {
    console.log(`${index + 1}. ${item.pokemon.name} (${item.pokemon.card_id})`);
  });
}

checkZenCollection().catch(console.error); 