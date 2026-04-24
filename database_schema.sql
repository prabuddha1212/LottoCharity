-- Run this script in your Supabase SQL Editor

-- Drop existing tables, policies, and triggers to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.winners CASCADE;
DROP TABLE IF EXISTS public.draws CASCADE;
DROP TABLE IF EXISTS public.charities CASCADE;
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. profiles (Extension of auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  charity_id UUID,
  charity_percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. scores
CREATE TABLE public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 45),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. charities
CREATE TABLE public.charities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. draws
CREATE TABLE public.draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  numbers INTEGER[] NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. winners
CREATE TABLE public.winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE,
  match_count INTEGER CHECK (match_count >= 3 AND match_count <= 5),
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@test.com');

-- Scores Policies
CREATE POLICY "Users can view their own scores" ON public.scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scores" ON public.scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all scores" ON public.scores FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@test.com');

-- Charities Policies
CREATE POLICY "Anyone can view charities" ON public.charities FOR SELECT USING (true);

-- Draws Policies
CREATE POLICY "Anyone can view draws" ON public.draws FOR SELECT USING (true);
CREATE POLICY "Admins can insert draws" ON public.draws FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@test.com');

-- Winners Policies
CREATE POLICY "Users can view their own winnings" ON public.winners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all winners" ON public.winners FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@test.com');
CREATE POLICY "Admins can insert winners" ON public.winners FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@test.com');

-- Insert dummy charities
INSERT INTO public.charities (name, description, image_url) VALUES 
('Save The Oceans', 'Protecting marine life and oceans.', 'https://placehold.co/400x300?text=Oceans'),
('Rainforest Trust', 'Saving endangered rainforests.', 'https://placehold.co/400x300?text=Rainforest'),
('Kids Education Fund', 'Providing education to children in need.', 'https://placehold.co/400x300?text=Education');