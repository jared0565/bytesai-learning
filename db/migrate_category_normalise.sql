-- Normalise category values to match the canonical CATEGORIES list in ranking.ts
UPDATE courses SET category = 'Agents'
WHERE category IN ('AI Agent', 'AI Agents', 'AI agent', 'AI agents', 'Agent');
