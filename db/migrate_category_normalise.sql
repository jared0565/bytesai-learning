-- Normalise category values to match the canonical CATEGORIES list in ranking.ts
-- "AI Agents" is the canonical value; fix any rows that used the old "Agents" label
UPDATE courses SET category = 'AI Agents'
WHERE category IN ('Agents', 'AI Agent', 'AI agent', 'AI agents', 'Agent');
