-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pokemon table with enhanced fields
CREATE TABLE IF NOT EXISTS pokemon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  card_id TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  large_image_url TEXT,
  set_name TEXT,
  rarity TEXT,
  types TEXT[],
  hp TEXT,
  artist TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_pokemon join table
CREATE TABLE IF NOT EXISTS user_pokemon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pokemon_id UUID NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
  acquired_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pokemon_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_pokemon_user_id ON user_pokemon(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pokemon_pokemon_id ON user_pokemon(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_card_id ON pokemon(card_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_rarity ON pokemon(rarity);
CREATE INDEX IF NOT EXISTS idx_pokemon_set_name ON pokemon(set_name);

-- Disable RLS for initial data loading
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_pokemon DISABLE ROW LEVEL SECURITY;

-- You can enable RLS later with these commands:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pokemon ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_pokemon ENABLE ROW LEVEL SECURITY;
-- 
-- And add policies:
-- CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access to pokemon" ON pokemon FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access to user_pokemon" ON user_pokemon FOR SELECT USING (true);

-- Create policies
-- Read policies
CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pokemon" ON pokemon FOR SELECT USING (true);
CREATE POLICY "Allow public read access to user_pokemon" ON user_pokemon FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Allow public insert access to users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access to pokemon" ON pokemon FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access to user_pokemon" ON user_pokemon FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Allow public update access to users" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public update access to pokemon" ON pokemon FOR UPDATE USING (true);
CREATE POLICY "Allow public update access to user_pokemon" ON user_pokemon FOR UPDATE USING (true);

-- For insert/update/delete, you would typically want more restrictive policies
-- based on auth.uid() === user_id for example, but for this example we're allowing all operations 