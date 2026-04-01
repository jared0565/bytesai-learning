-- BytesAI Learning — Featured course rules seed
-- Homepage rule: Slot 1+2 = Alison, Slot 3+4 = Dynamic highest-ranked non-Alison

INSERT OR IGNORE INTO featured_course_rules (id, rule_name, rule_json, active, updated_at) VALUES
('feat-rule-1','homepage_slot_1','{"slot":1,"type":"fixed","course_slug":"generative-ai-and-large-language-models-for-beginners","label":"Alison Featured A","notes":"Beginner Alison GenAI course — homepage rule slot 1"}',1,'2026-03-30T00:00:00Z'),
('feat-rule-2','homepage_slot_2','{"slot":2,"type":"fixed","course_slug":"diploma-in-applied-generative-ai","label":"Alison Featured B","notes":"Advanced Alison diploma — homepage rule slot 2"}',1,'2026-03-30T00:00:00Z'),
('feat-rule-3','homepage_slot_3','{"slot":3,"type":"dynamic","filter":{"is_alison":false,"published_status":"published"},"sort":"popularity_score DESC","label":"Dynamic Rank 1","notes":"Highest-ranked non-Alison course"}',1,'2026-03-30T00:00:00Z'),
('feat-rule-4','homepage_slot_4','{"slot":4,"type":"dynamic","filter":{"is_alison":false,"published_status":"published"},"sort":"popularity_score DESC","offset":1,"label":"Dynamic Rank 2","notes":"Second highest-ranked non-Alison course"}',1,'2026-03-30T00:00:00Z');
