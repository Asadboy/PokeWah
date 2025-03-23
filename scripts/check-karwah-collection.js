require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkKarwahCollection() {
  // Connect to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Get Karwah's user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'Karwah')
    .single();
  
  if (!user) {
    console.error('User Karwah not found');
    return;
  }
  
  console.log(`Karwah's user ID: ${user.id}`);
  
  // Get Karwah's cards
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
        rarity,
        set_name
      )
    `)
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error fetching collection:', error);
    return;
  }
  
  console.log(`Karwah has ${collection.length} cards in his collection:`);
  
  // Display all cards
  collection.forEach((item, index) => {
    console.log(`${index + 1}. ${item.pokemon.name} (${item.pokemon.card_id}) - ${item.pokemon.rarity || 'Unknown'}`);
    console.log(`   Set: ${item.pokemon.set_name || 'Unknown'}`);
    console.log(`   Acquired: ${new Date(item.acquired_date).toLocaleDateString()}`);
    console.log(`   Image: ${item.pokemon.image_url}`);
    console.log('---');
  });
}

checkKarwahCollection().catch(console.error); 