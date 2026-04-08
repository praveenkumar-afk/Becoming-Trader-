-- Trading Dashboard Database Schema

-- Enable Row Level Security
ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  source TEXT,
  dt DATE,
  tm TEXT,
  sym TEXT,
  dir TEXT,
  strat TEXT,
  en NUMERIC,
  ex NUMERIC,
  qt NUMERIC,
  bk NUMERIC,
  sl NUMERIC,
  tg NUMERIC,
  rr NUMERIC,
  rp NUMERIC,
  sq TEXT,
  pl TEXT,
  rl TEXT,
  em TEXT,
  nt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table (daily notes)
CREATE TABLE IF NOT EXISTS notes (
  date DATE PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Capital events
CREATE TABLE IF NOT EXISTS capital (
  id SERIAL PRIMARY KEY,
  type TEXT, -- 'deposit', 'withdraw', 'pnl'
  amount NUMERIC,
  date DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist items
CREATE TABLE IF NOT EXISTS checklist (
  id TEXT PRIMARY KEY,
  text TEXT,
  type TEXT, -- 'pre' or 'post'
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading rules
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  desc TEXT,
  cat TEXT,
  priority TEXT,
  weight INTEGER,
  why TEXT,
  violations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT,
  desc TEXT,
  type TEXT, -- 'weekly', 'monthly', 'custom'
  target INTEGER,
  current INTEGER DEFAULT 0,
  reward_xp INTEGER,
  start_date DATE,
  end_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- XP and engagement
CREATE TABLE IF NOT EXISTS user_xp (
  id SERIAL PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  discipline_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS policies (for security)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for personal use (adjust as needed)
CREATE POLICY "Allow all operations for anon" ON trades FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON notes FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON capital FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON checklist FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON rules FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON challenges FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON user_xp FOR ALL USING (true);

-- Insert default checklist data
INSERT INTO checklist (id, text, type) VALUES 
  ('pre1', 'Reviewed market news and key levels', 'pre'),
  ('pre2', 'Set daily goals and risk limits', 'pre'),
  ('pre3', 'Mental preparation - calm and focused', 'pre'),
  ('pre4', 'Technical setup - CPR and levels identified', 'pre'),
  ('pre5', 'Capital allocation decided', 'pre'),
  ('post1', 'Reviewed all trades - what worked, what didn''t', 'post'),
  ('post2', 'Updated journal with lessons learned', 'post'),
  ('post3', 'Calculated P&L and risk metrics', 'post'),
  ('post4', 'Prepared setup for tomorrow', 'post'),
  ('post5', 'Mental debrief - emotions and discipline check', 'post'),
  ('post6', 'Rules adherence review', 'post'),
  ('post7', 'Profit withdrawal consideration', 'post')
ON CONFLICT DO NOTHING;