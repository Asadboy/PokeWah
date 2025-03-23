require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  console.log('Please make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set in your .env.local file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Try a simple query to get the database version
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error(`Connection error: ${error.message}`);
      throw error;
    }
    
    console.log('✅ Connection successful!');
    
    console.log('\nNow you need to set up your database schema:');
    console.log('1. Go to https://app.supabase.com/project/_/sql');
    console.log('2. Open the file supabase/schema.sql in your project');
    console.log('3. Copy the contents into the Supabase SQL Editor');
    console.log('4. Click "Run" to execute the SQL script');
    console.log('5. After setting up the schema, run:');
    console.log('   npm run init-db');
    console.log('\nThis will create the database tables and populate them with sample data.\n');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
    console.log('\nPlease check your Supabase credentials and make sure:');
    console.log('1. Your project URL and anon key are correct in .env.local');
    console.log('2. Your IP address is allowed in Supabase authentication settings');
  }
}

testConnection(); 