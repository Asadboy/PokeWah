require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkSebCollection() {
  // Connect to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Get Seb's user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'Seb')
    .single();
  
  if (!user) {
    console.error('User Seb not found');
    return;
  }
  
  console.log(`Seb's user ID: ${user.id}`);
  
  // Get Seb's cards
  const { data: collection, error } = await supabase
    .from('user_pokemon')
    .select(`
      id,
      acquired_date,
      quantity,
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
  
  console.log(`Seb has ${collection.length} cards in his collection`);
  
  // Group cards by set for more organized output
  const setGroups = {};
  collection.forEach(item => {
    const setName = item.pokemon.set_name || 'Unknown Set';
    if (!setGroups[setName]) {
      setGroups[setName] = [];
    }
    setGroups[setName].push(item);
  });
  
  // Display cards grouped by set
  console.log('\nCards by Set:');
  for (const [setName, cards] of Object.entries(setGroups)) {
    console.log(`\n== ${setName} (${cards.length} cards) ==`);
    cards.forEach((item, index) => {
      console.log(`${index + 1}. ${item.pokemon.name} (${item.pokemon.card_id}) - ${item.pokemon.rarity || 'Unknown'}`);
      console.log(`   Quantity: ${item.quantity || 1}`);
      console.log(`   Acquired: ${new Date(item.acquired_date).toLocaleDateString()}`);
      console.log(`   Image: ${item.pokemon.image_url}`);
    });
  }
  
  // Show statistics
  console.log('\nCollection Statistics:');
  console.log(`Total Sets: ${Object.keys(setGroups).length}`);
  console.log(`Total Cards: ${collection.length}`);
  
  const rarities = {};
  collection.forEach(item => {
    const rarity = item.pokemon.rarity || 'Unknown';
    rarities[rarity] = (rarities[rarity] || 0) + 1;
  });
  
  console.log('\nRarity Breakdown:');
  for (const [rarity, count] of Object.entries(rarities)) {
    console.log(`${rarity}: ${count} cards`);
  }
}

checkSebCollection().catch(console.error); 