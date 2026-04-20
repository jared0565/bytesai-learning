-- BytesAI Learning — New course additions 2026-04-20
-- Adds 4 new providers and 9 new courses verified against candidate list.
-- Run in Cowork (wrangler is not available locally).
-- Claude Code 101 (anthropic-claude-code-101) is already in the DB — skipped.
-- Skipped (paid/unverifiable): Google Prompting Essentials, Google AI Essentials,
--   MITx ML with Python (paid MicroMasters), MIT Generative AI in K-12 (paid program),
--   MIT "How to AI (Almost) Anything" (OCW URL unverifiable), HP LIFE (specific URL not found),
--   IBM "AI for Everyone: Master the Basics" (Coursera URL not found).

-- ─── New Providers ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO providers (id, slug, name, website_url, affiliate_enabled, affiliate_disclosure, created_at, updated_at) VALUES
('prov-mit-ocw','mit-ocw','MIT OpenCourseWare','https://ocw.mit.edu',0,NULL,'2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),
('prov-elements-of-ai','elements-of-ai','Elements of AI','https://www.elementsofai.com',0,NULL,'2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),
('prov-google-cloud','google-cloud','Google Cloud','https://www.cloudskillsboost.google',0,NULL,'2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),
('prov-umd','umd','University of Maryland','https://www.rhsmith.umd.edu',0,NULL,'2026-04-20T00:00:00Z','2026-04-20T00:00:00Z');

-- ─── New Courses ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO courses (id,slug,provider_id,title,content_type,category,level,format_type,access_model,certification_type,snippet,destination_url,is_affiliate,is_alison,featured_priority,popularity_score,published_status,last_verified_at,cover_image_type,cover_image_alt,created_at,updated_at) VALUES

-- MIT OpenCourseWare — Minds and Machines (24.09, Fall 2011)
('c-mit-01','minds-and-machines-mit-ocw','prov-mit-ocw','Minds and Machines','course','AI Foundations','Intermediate','video','free to learn','none','MIT philosophy of mind course exploring consciousness, perception, and artificial intelligence through a rigorous conceptual lens.','https://ocw.mit.edu/courses/24-09-minds-and-machines-fall-2011/',0,0,2,50,'published','2026-04-20','generated','Cover image for MIT Minds and Machines','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- Elements of AI — University of Helsinki / MinnaLearn
('c-helsinki-01','elements-of-ai','prov-elements-of-ai','Elements of AI','course','AI Foundations','Beginner','mixed','free to learn','none','Completely free introductory AI course by the University of Helsinki and MinnaLearn. No coding or maths required — over 2 million students from 170+ countries.','https://course.elementsofai.com/',0,0,4,85,'published','2026-04-20','generated','Cover image for Elements of AI','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- Google Cloud Skills Boost — Generative AI Leader path
('c-gcloud-01','generative-ai-leader-google-cloud','prov-google-cloud','Generative AI Leader','path','LLMs / Generative AI','Intermediate','mixed','free to learn','optional paid certificate','Google Cloud learning path covering generative AI strategy, architecture, and application for technical leaders.','https://www.cloudskillsboost.google/paths/1951',0,0,3,70,'published','2026-04-20','generated','Cover image for Google Cloud Generative AI Leader','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- NVIDIA — AI Infrastructure and Operations Fundamentals (via Coursera)
('c-nv-09','nvidia-ai-infrastructure-operations-fundamentals','prov-nvidia','AI Infrastructure and Operations Fundamentals','course','AI Foundations','Beginner','mixed','free to learn','optional paid certificate','Official NVIDIA course covering AI infrastructure concepts, GPU computing, and data center operations. Free to audit on Coursera.','https://www.coursera.org/learn/introduction-ai-data-center',0,0,2,55,'published','2026-04-20','generated','Cover image for NVIDIA AI Infrastructure and Operations Fundamentals','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- University of Maryland — AI and Career Empowerment Certificate
('c-umd-01','ai-and-career-empowerment-certificate-umd','prov-umd','AI and Career Empowerment Certificate','course','AI Foundations','Beginner','mixed','free to learn','none','Free 10-module self-paced certificate from UMD Smith School covering AI literacy, practical applications, and career transitions.','https://www.rhsmith.umd.edu/programs/executive-education/learning-opportunities-individuals/free-online-certificate-artificial-intelligence-and-career-empowerment',0,0,3,65,'published','2026-04-20','generated','Cover image for UMD AI and Career Empowerment Certificate','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- Stanford — CS329H: Machine Learning from Human Preferences
('c-stan-08','cs329h-machine-learning-from-human-preferences','prov-stanford','CS329H: Machine Learning from Human Preferences','course','Data / ML','Advanced','video','free to learn','none','Stanford graduate course on RLHF, reward modelling, and preference learning — the core techniques behind modern LLM alignment.','https://web.stanford.edu/class/cs329h/',0,0,3,72,'published','2026-04-20','generated','Cover image for Stanford CS329H Machine Learning from Human Preferences','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- Stanford — CS330: Deep Multi-Task and Meta Learning
('c-stan-09','cs330-deep-multi-task-meta-learning','prov-stanford','CS330: Deep Multi-Task and Meta Learning','course','Data / ML','Advanced','video','free to learn','none','Stanford graduate course with freely available lecture videos on multi-task learning, meta-learning, and transfer learning.','https://cs330.stanford.edu/',0,0,3,70,'published','2026-04-20','generated','Cover image for Stanford CS330 Deep Multi-Task and Meta Learning','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- DeepLearning.AI — AI For Everyone (Coursera, free audit)
('c-dl-09','ai-for-everyone-deeplearning-ai','prov-deeplearning-ai','AI For Everyone','course','AI Foundations','Beginner','video','free to learn','optional paid certificate','Andrew Ng''s landmark non-technical introduction to AI — strategy, terminology, and what AI can and cannot do. Free to audit on Coursera.','https://www.coursera.org/learn/ai-for-everyone',0,0,5,90,'published','2026-04-20','generated','Cover image for DeepLearning.AI AI For Everyone','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z'),

-- DeepLearning.AI — Generative AI for Everyone (Coursera, free audit)
('c-dl-10','generative-ai-for-everyone-deeplearning-ai','prov-deeplearning-ai','Generative AI for Everyone','course','LLMs / Generative AI','Beginner','video','free to learn','optional paid certificate','Andrew Ng''s accessible introduction to generative AI — how it works, how to use it, and how to apply it in your work. Free to audit on Coursera.','https://www.coursera.org/learn/generative-ai-for-everyone',0,0,5,88,'published','2026-04-20','generated','Cover image for DeepLearning.AI Generative AI for Everyone','2026-04-20T00:00:00Z','2026-04-20T00:00:00Z');
