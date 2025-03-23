# Supabase Integration Guide for PokeWah

This guide will walk you through the process of setting up your Supabase database and connecting it to your PokeWah application.

## Prerequisites

- A Supabase account (you can sign up for free at [supabase.com](https://supabase.com))
- Your PokeWah application codebase

## Step 1: Create a Supabase Project

1. Log in to your Supabase account
2. Click "New Project"
3. Enter a name for your project (e.g., "PokeWah")
4. Choose a database password (save this somewhere secure)
5. Select a region closest to your users
6. Click "Create new project"

## Step 2: Set Up Database Schema

1. Once your project is created, go to the SQL Editor in the Supabase dashboard
2. Copy the contents of your `supabase/schema.sql` file
3. Paste it into the SQL editor and run the query
4. This will create the necessary tables, indexes, and security policies

## Step 3: Configure Environment Variables

1. Go to Project Settings > API in your Supabase dashboard
2. Copy the "Project URL" and "anon" (public) key
3. In your PokeWah project, open the `.env.local` file
4. Update the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 4: Test Your Connection

1. Run the following command to test your Supabase connection:

```
npm run test-db
```

2. If successful, you should see a message confirming the connection
3. If there are errors, double-check your environment variables and make sure your Supabase project is properly set up

## Step 5: Initialize Sample Data

1. Run the following command to populate your database with sample data:

```
npm run init-db
```

2. This will create sample users and Pokémon in your database

## Step 6: Verify Data in Supabase

1. Go back to your Supabase dashboard
2. Navigate to the Table Editor
3. You should see data in the `users`, `pokemon`, and `user_pokemon` tables

## Step 7: Run Your Application

1. Start your development server:

```
npm run dev
```

2. Navigate to the collections page at http://localhost:3000/collections
3. You should see user collections loaded from your Supabase database

## Troubleshooting

### Error: The connection timed out
- Check your internet connection
- Verify that your Supabase project is active
- Make sure your IP address is not restricted in Supabase settings

### Error: Invalid JWT token
- Double-check that you copied the correct anon key from Supabase
- Make sure you're not using the service role key for client-side applications

### Tables aren't accessible
- Run the schema.sql script again
- Check that Row Level Security (RLS) policies are properly configured
- Verify that the anon key has the necessary permissions

## Next Steps

- Implement user authentication with Supabase Auth
- Add functionality for users to add Pokémon to their collections
- Create admin features for managing user collections

For more information on Supabase features, visit the [Supabase documentation](https://supabase.com/docs). 