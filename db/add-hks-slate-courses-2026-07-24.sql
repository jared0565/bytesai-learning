-- BytesAI Learning — New HKS SLATE course additions 2026-07-24
-- Adds 1 new provider (Harvard Kennedy School) and 4 new courses from the HKS
-- Generative AI curriculum. Course 1 (The Basics of Generative AI) was intentionally
-- omitted per request.
-- Run in Cowork (wrangler is not available locally).

-- ─── New Provider ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO providers (id, slug, name, website_url, affiliate_enabled, affiliate_disclosure, created_at, updated_at) VALUES
('prov-harvard-hks','harvard-hks','Harvard Kennedy School','https://generative-ai-course.hks.harvard.edu',0,NULL,'2026-07-24T00:00:00Z','2026-07-24T00:00:00Z');

-- ─── New Courses ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO courses (id,slug,provider_id,title,content_type,category,level,format_type,access_model,certification_type,snippet,destination_url,is_affiliate,is_alison,featured_priority,popularity_score,published_status,last_verified_at,cover_image_type,cover_image_alt,created_at,updated_at) VALUES

-- Harvard Kennedy School — Class 1: Introduction to Generative AI
('c-harv-hks-01','introduction-to-generative-ai-hks','prov-harvard-hks','Introduction to Generative AI','course','AI Foundations','Beginner','mixed','free to learn','none','Harvard Kennedy School introductory session on how generative AI and large language models actually work — built for beginners who want clarity without jargon.','https://generative-ai-course.hks.harvard.edu/1-how-genai-works/class-1',0,0,3,68,'published','2026-07-24','generated','Cover image for HKS Introduction to Generative AI','2026-07-24T00:00:00Z','2026-07-24T00:00:00Z'),

-- Harvard Kennedy School — Class 4: Prompt Engineering
('c-harv-hks-02','prompt-engineering-hks','prov-harvard-hks','Prompt Engineering','course','Prompt Engineering','Beginner','mixed','free to learn','none','Hands-on Harvard Kennedy School workshop covering prompt engineering techniques including TIC, Chain-of-Thought, and Few-Shot patterns for real-world tasks.','https://generative-ai-course.hks.harvard.edu/2-using-genai/class-4',0,0,3,70,'published','2026-07-24','generated','Cover image for HKS Prompt Engineering','2026-07-24T00:00:00Z','2026-07-24T00:00:00Z'),

-- Harvard Kennedy School — Class 5: Beyond Chatbots (System Prompts, RAG)
('c-harv-hks-03','beyond-chatbots-system-prompts-rag-hks','prov-harvard-hks','Beyond Chatbots: System Prompts, RAG','course','LLMs / Generative AI','Intermediate','mixed','free to learn','none','Intermediate Harvard Kennedy School session on moving beyond basic chatbots through system prompts, RAG, and multimodal applications with consumer AI tools.','https://generative-ai-course.hks.harvard.edu/2-using-genai/class-5',0,0,3,65,'published','2026-07-24','generated','Cover image for HKS Beyond Chatbots','2026-07-24T00:00:00Z','2026-07-24T00:00:00Z'),

-- Harvard Kennedy School — YouTube Playlist: Generative AI in Teaching & Learning
('c-harv-hks-04','generative-ai-in-teaching-learning-hks','prov-harvard-hks','Generative AI in Teaching & Learning','course','AI Foundations','Beginner','video','free to learn','none','Harvard Kennedy School playlist on applying generative AI frameworks to teaching, training, and internal knowledge building — extends well beyond the classroom.','https://www.youtube.com/playlist?list=PL_kRkvxqHjkqjnhAdSdejAkyQf1TnPkNM',0,0,2,58,'published','2026-07-24','generated','Cover image for HKS Generative AI in Teaching & Learning','2026-07-24T00:00:00Z','2026-07-24T00:00:00Z');
