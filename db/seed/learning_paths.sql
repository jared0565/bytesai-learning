-- Learning Paths: Curated career guides for the 10 most common AI jobs
-- These seed the curated_pages table as published learning paths.
-- Fields repurposed for learning paths:
--   summary            → role overview
--   why_it_matters     → career outlook and why to pursue it
--   what_changed       → skill progression (beginner → advanced)
--   executive_implications → key tools, technologies, and certifications

INSERT OR IGNORE INTO curated_pages (
  id, slug, title, summary,
  why_it_matters, what_changed, executive_implications,
  primary_course_slug, related_course_slugs_json, source_references_json,
  editorial_review_status, published_status,
  meta_title, meta_description,
  last_verified_at, created_at, updated_at
) VALUES

-- ─────────────────────────────────────────────────────────────
-- 1. Machine Learning Engineer
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-mle-01',
  'learning-path-machine-learning-engineer',
  'Learning Path: Machine Learning Engineer',
  'ML Engineers build, train, and deploy machine learning models into production systems. They sit at the intersection of software engineering and data science — making AI work reliably at scale.',
  'Every AI-powered product needs an ML Engineer to make models run in the real world. It is consistently one of the highest-paying tech roles, with demand projected to grow significantly through 2025 and beyond. Median salaries range from $130,000–$180,000 in the US, with strong opportunities globally.',
  'Beginner (0–6 months): Python fundamentals, linear algebra, calculus, probability and statistics, NumPy and Pandas, supervised and unsupervised learning algorithms, model evaluation (cross-validation, precision/recall/F1). Intermediate (6–12 months): Deep learning with PyTorch, CNNs, RNNs, LSTMs, hyperparameter tuning, feature engineering, SQL, experiment tracking with MLflow or Weights & Biases, basic cloud (AWS SageMaker or Google Vertex AI). Advanced (12–24 months): Transformer architectures, fine-tuning pretrained models, distributed training, model optimisation (quantisation, pruning, distillation), production deployment with FastAPI and Docker, Kubernetes, CI/CD pipelines, and production monitoring.',
  'Core tools: Python, scikit-learn, PyTorch, TensorFlow, XGBoost. Experiment tracking: MLflow, Weights & Biases. Cloud: AWS SageMaker, Google Vertex AI, Azure ML. Deployment: FastAPI, Docker, Kubernetes, TorchServe. Data: Pandas, NumPy, PySpark. Version control: Git, DVC. Recommended certifications: AWS Certified Machine Learning Specialty, Google Professional Machine Learning Engineer, Microsoft Azure AI Engineer (AI-102).',
  'cs229-machine-learning',
  '["machine-learning-for-beginners-microsoft","cs230-deep-learning","understanding-deep-learning","deep-learning-goodfellow","foundations-of-machine-learning","programming-for-everybody-python","explore-and-analyze-data-with-python"]',
  '[{"title":"Google ML Crash Course","url":"https://developers.google.com/machine-learning/crash-course"},{"title":"fast.ai: Practical Deep Learning for Coders","url":"https://course.fast.ai/"},{"title":"ML Engineer Roadmap — roadmap.sh","url":"https://roadmap.sh/machine-learning"},{"title":"DeepLearning.AI Machine Learning Specialization","url":"https://www.deeplearning.ai/courses/machine-learning-specialization/"}]',
  'approved', 'published',
  'Machine Learning Engineer Learning Path — BytesAI',
  'A complete beginner-to-advanced roadmap for becoming a Machine Learning Engineer, with free courses, key tools, and career milestones.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 2. Data Scientist (AI-focused)
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-ds-01',
  'learning-path-data-scientist',
  'Learning Path: Data Scientist (AI-Focused)',
  'AI-focused Data Scientists extract insights from data and build predictive models to solve business problems. They combine statistics, ML, and domain expertise to turn raw data into decisions that drive organisations forward.',
  'Employment of data scientists is projected to grow 34% from 2024 to 2034 — one of the fastest growth rates for any occupation. Every organisation with data assets needs people who can turn that data into actionable insight. Median salaries range from $110,000–$160,000 in the US.',
  'Beginner (0–6 months): Python or R, SQL (queries, joins, aggregations, window functions), descriptive statistics, hypothesis testing, A/B testing, data visualisation with Matplotlib/Seaborn. Intermediate (6–12 months): Supervised and unsupervised ML with scikit-learn, feature engineering and data cleaning, Pandas and NumPy, model validation (ROC/AUC, cross-validation), communicating findings to non-technical stakeholders. Advanced (12–24 months): Deep learning applications, causal inference, GenAI integration (RAG pipelines, embeddings, vector databases), big data tools (Spark, Databricks), cloud data platforms (BigQuery, Snowflake), and MLOps basics.',
  'Core tools: Python, R, SQL, Jupyter Notebooks, Pandas, NumPy. Visualisation: Matplotlib, Seaborn, Plotly, Tableau, Power BI. ML: scikit-learn, XGBoost, LightGBM. Big data: PySpark, Databricks. Cloud: BigQuery, Snowflake, AWS Redshift. GenAI: LangChain, Pinecone, OpenAI/Anthropic APIs. Recommended certifications: IBM Data Science Professional Certificate, Google Professional Data Engineer, Databricks Certified Associate Developer for Apache Spark.',
  'artificial-intelligence-fundamentals',
  '["ai-foundations-for-everyone","introduction-to-ai-concepts","programming-for-everybody-python","explore-and-analyze-data-with-python","python-for-beginners-microsoft","data-and-ai-fundamentals","cs229-machine-learning"]',
  '[{"title":"Kaggle Learn — Free ML & Python micro-courses","url":"https://www.kaggle.com/learn"},{"title":"AI and Data Scientist Roadmap — roadmap.sh","url":"https://roadmap.sh/ai-data-scientist"},{"title":"IBM Data Science Professional Certificate","url":"https://www.coursera.org/professional-certificates/ibm-data-science"},{"title":"DataTalks.Club Free Zoomcamps","url":"https://datatalks.club/"}]',
  'approved', 'published',
  'Data Scientist Learning Path — BytesAI',
  'A complete roadmap for becoming an AI-focused Data Scientist, covering Python, SQL, statistics, ML, and modern GenAI tools.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 3. AI Research Scientist
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-ars-01',
  'learning-path-ai-research-scientist',
  'Learning Path: AI Research Scientist',
  'AI Research Scientists advance the fundamental science of artificial intelligence — inventing new algorithms, architectures, and training techniques. They work at top tech labs (Google DeepMind, Anthropic, Meta AI, OpenAI) and universities, publishing research that shapes the entire field.',
  'AI Research Scientists created the Transformer architecture, RLHF, and diffusion models — the foundations that all other AI roles build upon. Job outlook is 26% growth between 2023 and 2033. Salaries at leading labs exceed $200,000, often with significant equity. This is the most academically demanding AI career path.',
  'Undergraduate level: Deep mathematical foundations (linear algebra, multivariable calculus, real analysis, probability theory), Python and algorithms, intro ML and statistics, reading arxiv papers. Graduate level: Deep learning theory (optimisation, regularisation, generalisation), PyTorch for research (custom training loops, autograd), specialisation in one area (NLP, CV, RL, generative models), reproducing results from published papers, experiment design and ablation studies. Researcher level: Original algorithm or architecture contributions, scaling laws, emergent behaviour in large models, alignment and safety research, publishing at NeurIPS, ICML, ICLR, ACL, or CVPR.',
  'Core tools: Python, PyTorch (dominant in research), JAX (Google/DeepMind). Compute: NVIDIA GPUs, CUDA, SLURM for HPC clusters. Experiment tracking: Weights & Biases, TensorBoard. Paper reading and writing: LaTeX, Overleaf, ArXiv. Key conferences: NeurIPS, ICML, ICLR, ACL, CVPR. Note: most research scientist roles require a PhD or equivalent published research output. Strong open-source contributions can substitute in some industry labs.',
  'cs229-machine-learning',
  '["cs230-deep-learning","cs234-reinforcement-learning","cs224n-nlp-with-deep-learning","cs224u-natural-language-understanding","stats214-machine-learning-theory","understanding-deep-learning","deep-learning-goodfellow","probabilistic-machine-learning-intro","probabilistic-machine-learning-advanced-topics","reinforcement-learning-introduction"]',
  '[{"title":"Stanford CS229: Machine Learning (free materials)","url":"https://cs229.stanford.edu/"},{"title":"fast.ai Part 2: Deep Learning from the Foundations","url":"https://course.fast.ai/Lessons/part2.html"},{"title":"Spinning Up in Deep RL — OpenAI","url":"https://spinningup.openai.com/"},{"title":"Anthropic Research Papers","url":"https://www.anthropic.com/research"},{"title":"ArXiv — AI/ML Preprints","url":"https://arxiv.org/list/cs.AI/recent"}]',
  'approved', 'published',
  'AI Research Scientist Learning Path — BytesAI',
  'A rigorous roadmap for becoming an AI Research Scientist, covering the mathematical foundations, PyTorch research skills, and specialisation areas needed to publish at top AI conferences.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 4. NLP / LLM Engineer
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-llm-01',
  'learning-path-nlp-llm-engineer',
  'Learning Path: NLP / LLM Engineer',
  'NLP/LLM Engineers build products and systems powered by large language models — working with LLM APIs, fine-tuning models on custom data, building RAG systems, and deploying text-generation applications. The field has exploded since the release of GPT-4 and Claude.',
  'The LLM market is projected to grow from $6.4 billion in 2024 to $36.1 billion by 2030. Nearly every software company is integrating LLMs into its products, creating massive demand for engineers who know how to work with them. This is currently one of the fastest-growing and highest-paying specialisations in software engineering.',
  'Beginner (0–4 months): Python, how LLMs work conceptually (tokens, context windows, sampling), using LLM APIs (OpenAI, Anthropic Claude, Google Gemini), prompt engineering basics, LangChain or LlamaIndex for chaining LLM calls. Intermediate (4–10 months): Transformer architecture (self-attention, multi-head attention, positional encoding), BERT/GPT/T5 model families, Hugging Face Transformers library, fine-tuning pretrained models, parameter-efficient fine-tuning (LoRA, QLoRA), vector databases (Pinecone, Chroma), RAG pipeline design, embeddings and semantic search. Advanced (10–18 months): Full model pre-training, RLHF and preference optimisation (DPO, PPO), quantisation (GGUF, AWQ, GPTQ), inference optimisation (vLLM, TensorRT-LLM), agentic systems (tool use, multi-agent orchestration), and LLM evaluation frameworks.',
  'Core tools: Python, Hugging Face Transformers and Datasets, LangChain, LlamaIndex. LLM APIs: Anthropic, OpenAI, Google Gemini, Cohere. Open-source models: Llama 3.x, Mistral, Qwen, Phi-3. Fine-tuning: Unsloth, Axolotl, TRL. Vector databases: Pinecone, Chroma, Weaviate, Qdrant. Serving: Ollama, vLLM, TGI. Evaluation: RAGAS, LM-Evaluation Harness. Recommended certifications: Hugging Face NLP Certificate, DeepLearning.AI LLMOps Specialisation.',
  'llm-course',
  '["cs224n-nlp-with-deep-learning","cs224u-natural-language-understanding","chatgpt-prompt-engineering-for-developers","building-systems-with-chatgpt-api","langchain-for-llm-application-development","building-agentic-rag-with-llamaindex","claude-101","building-with-the-claude-api","ai-agents-course","multi-ai-agent-systems-with-crewai"]',
  '[{"title":"Hugging Face LLM Course (free)","url":"https://huggingface.co/learn/llm-course/chapter1/1"},{"title":"mlabonne LLM Course — GitHub","url":"https://github.com/mlabonne/llm-course"},{"title":"DeepLearning.AI Short Courses (free)","url":"https://www.deeplearning.ai/short-courses/"},{"title":"Anthropic Prompt Engineering Docs","url":"https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"},{"title":"Stanford CS224n: NLP with Deep Learning","url":"https://web.stanford.edu/class/cs224n/"}]',
  'approved', 'published',
  'NLP / LLM Engineer Learning Path — BytesAI',
  'A complete roadmap for becoming an NLP/LLM Engineer, covering Transformer architecture, Hugging Face, fine-tuning, RAG, and production LLM deployment.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 5. Computer Vision Engineer
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-cv-01',
  'learning-path-computer-vision-engineer',
  'Learning Path: Computer Vision Engineer',
  'Computer Vision Engineers build systems that enable machines to interpret visual information — images, video, and real-time camera feeds. Applications span object detection, medical imaging, autonomous vehicles, facial recognition, and manufacturing quality control. The field is increasingly merging with LLMs through Vision-Language Models.',
  'Computer vision powers autonomous vehicles, medical diagnostics, security systems, robotics, and augmented reality. It is one of the most technically mature areas of AI with massive investment. The global computer vision market is projected to reach $41 billion by 2030, with strong career demand across healthcare, automotive, manufacturing, and tech.',
  'Beginner (0–4 months): Python, NumPy for image array manipulation, OpenCV for image processing (reading/writing images, geometric transforms, filters, edge detection), basic ML with scikit-learn, classical feature extraction (HOG, SIFT, ORB). Intermediate (4–10 months): Deep learning fundamentals (CNNs: convolution, pooling, strides), PyTorch, image classification with ResNet/EfficientNet, object detection with YOLO (v8, v11) and Faster R-CNN, image segmentation with Mask R-CNN and SAM, transfer learning and fine-tuning, data augmentation. Advanced (10–18 months): Vision Transformers (ViT), Vision-Language Models (CLIP, LLaVA, GPT-4V), 3D vision and depth estimation, real-time inference optimisation (ONNX, TensorRT), and production deployment on edge devices (NVIDIA Jetson).',
  'Core tools: Python, OpenCV, NumPy, PyTorch (preferred), TensorFlow/Keras. Detection and segmentation: YOLOv8/v11, Detectron2, MMDetection, SAM (Segment Anything Model). Pretrained models: Hugging Face Vision, CLIP, ViT. Optimisation: ONNX, TensorRT, OpenVINO. Edge deployment: NVIDIA Jetson, Coral TPU. Annotation: Roboflow, CVAT, Label Studio. Recommended certifications: NVIDIA Deep Learning Institute certifications, OpenCV University certificates.',
  'cs230-deep-learning',
  '["understanding-deep-learning","deep-learning-goodfellow","building-a-brain-in-10-minutes","getting-started-with-ai-on-jetson-nano","an-even-easier-introduction-to-cuda","cs234-reinforcement-learning","programming-for-everybody-python"]',
  '[{"title":"Stanford CS231n: CNNs for Visual Recognition (free materials)","url":"http://cs231n.stanford.edu/"},{"title":"OpenCV University Free Bootcamp","url":"https://opencv.org/university/"},{"title":"Computer Vision Engineer Roadmap — OpenCV","url":"https://opencv.org/blog/computer-vision-engineer-roadmap/"},{"title":"fast.ai: Practical Deep Learning for Coders","url":"https://course.fast.ai/"},{"title":"Ultralytics YOLO Documentation","url":"https://docs.ultralytics.com/"}]',
  'approved', 'published',
  'Computer Vision Engineer Learning Path — BytesAI',
  'A complete roadmap for becoming a Computer Vision Engineer, covering OpenCV, CNNs, YOLO, Vision Transformers, and edge deployment.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 6. MLOps / AI Infrastructure Engineer
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-mlops-01',
  'learning-path-mlops-engineer',
  'Learning Path: MLOps / AI Infrastructure Engineer',
  'MLOps Engineers bridge the gap between data scientists who build models and the production systems where those models run. They design and maintain the infrastructure, pipelines, and processes that allow models to be trained, evaluated, versioned, deployed, monitored, and retrained reliably.',
  'Most ML models built by data scientists never make it to production — MLOps Engineers solve this. The global MLOps market is projected to grow from $1.5 billion in 2024 to over $19.5 billion by 2032. It is one of the fastest-growing sub-fields in AI, with strong demand from every company moving AI projects from prototype to production.',
  'Beginner (0–4 months): Python, Git, Linux command line, Docker for containerisation, basic ML understanding (training, validation, inference), SQL. Intermediate (4–10 months): CI/CD pipelines (GitHub Actions), Kubernetes, ML experiment tracking (MLflow, Weights & Biases), model registries, cloud platforms (AWS/GCP/Azure — pick one deeply), data versioning (DVC), feature stores (Feast), workflow orchestration (Apache Airflow, Prefect). Advanced (10–18 months): End-to-end ML platform design, model monitoring (data drift detection, performance alerts with Evidently AI), Infrastructure as Code (Terraform), LLMOps (managing LLM deployments, prompt versioning, RAG monitoring), distributed training infrastructure, GPU cluster management, and cost optimisation for ML workloads.',
  'Core tools: Docker, Kubernetes, GitHub Actions. Experiment tracking: MLflow, Weights & Biases. Orchestration: Apache Airflow, Prefect, Kubeflow, ZenML. Feature stores: Feast, Tecton, Hopsworks. Model serving: TorchServe, BentoML, vLLM. Monitoring: Evidently AI, WhyLabs, Grafana. Cloud ML: AWS SageMaker, Google Vertex AI, Azure ML. IaC: Terraform, Pulumi. Recommended certifications: AWS Certified DevOps Engineer, Google Professional MLOps Engineer, Microsoft DevOps Engineer Expert (AZ-400).',
  'data-and-ai-fundamentals',
  '["getting-started-with-ai-on-jetson-nano","an-even-easier-introduction-to-cuda","aws-ai-practitioner-learning-plan","introduction-to-nvidia-nim-microservices","cs229-machine-learning","python-for-beginners-microsoft","explore-and-analyze-data-with-python"]',
  '[{"title":"DataTalks.Club MLOps Zoomcamp (free)","url":"https://github.com/DataTalks-Club/mlops-zoomcamp"},{"title":"Full Stack Deep Learning (free)","url":"https://fullstackdeeplearning.com/"},{"title":"MLflow Documentation and Tutorials","url":"https://mlflow.org/"},{"title":"Microsoft Azure AI Engineer Learning Path","url":"https://learn.microsoft.com/en-us/training/career-paths/ai-engineer"},{"title":"How to Learn MLOps — Neptune.ai","url":"https://neptune.ai/blog/how-to-learn-mlops"}]',
  'approved', 'published',
  'MLOps / AI Infrastructure Engineer Learning Path — BytesAI',
  'A complete roadmap for becoming an MLOps Engineer, covering Docker, Kubernetes, MLflow, Airflow, model monitoring, and production ML infrastructure.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 7. AI Product Manager
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-pm-01',
  'learning-path-ai-product-manager',
  'Learning Path: AI Product Manager',
  'AI Product Managers define what AI-powered products to build, why, and for whom. They work at the intersection of business strategy, user needs, and AI capabilities — translating what AI can do into products that create real value. They combine traditional PM skills with deep AI literacy.',
  'Every company building AI products needs someone who can own the product vision and roadmap. AI PMs command premium salaries because the combination of product sense, business acumen, and AI technical literacy is rare. Average salaries range from $140,000–$200,000 at major tech companies. Demand is growing as AI moves from engineering teams into every product.',
  'Beginner (0–4 months): Core PM fundamentals (user research, roadmapping, prioritisation, stakeholder management), AI literacy (how ML models work, key limitations: hallucinations, bias, latency, cost), data literacy (reading dashboards, understanding metrics, basic SQL). Intermediate (4–10 months): Hands-on with LLM APIs to build simple prototypes (OpenAI, Claude, Gemini), product metrics for AI (accuracy, precision/recall trade-offs, latency, user trust), understanding model evaluation, responsible AI (bias, fairness, explainability), and AI product strategy (defensibility, data flywheel effects, build vs. buy). Advanced (10–18 months): AI product strategy at org level, managing model performance and retraining cadences, navigating regulatory requirements (EU AI Act, GDPR), LLMOps product decisions (prompt management, observability), enterprise AI adoption patterns, and leading cross-functional AI teams.',
  'Core tools: OpenAI Playground, Anthropic Console, Google AI Studio for prototyping. Analytics: Mixpanel, Amplitude, Looker. Project management: Jira, Linear, Notion. LLM evaluation: LangSmith, PromptLayer. Data: SQL, BigQuery, basic Python notebooks. Key frameworks: NIST AI RMF (for risk), EU AI Act (for compliance). Recommended certifications: IBM AI Product Manager Professional Certificate, Microsoft AI Product Manager Certificate, AIPMM Certified AI Product Manager.',
  'ai-fluency-framework-and-foundations',
  '["introduction-to-generative-ai","generative-ai-explained","career-essentials-in-generative-ai","generative-ai-for-decision-makers","ai-for-beginners-microsoft","teaching-ai-fluency","ai-foundations-for-everyone","introduction-to-generative-ai-and-agents","aws-ai-practitioner-learning-plan"]',
  '[{"title":"AI for Everyone — Andrew Ng (free audit)","url":"https://www.coursera.org/learn/ai-for-everyone"},{"title":"IBM AI Product Manager Certificate","url":"https://www.coursera.org/professional-certificates/ibm-ai-product-manager"},{"title":"Google AI Essentials","url":"https://grow.google/intl/en_us/guide-to-ai/"},{"title":"DeepLearning.AI Short Courses (free)","url":"https://www.deeplearning.ai/short-courses/"},{"title":"AI PM Learning Roadmap — Product School","url":"https://productschool.com/blog/artificial-intelligence/ai-learning-roadmap"}]',
  'approved', 'published',
  'AI Product Manager Learning Path — BytesAI',
  'A complete roadmap for becoming an AI Product Manager, covering AI literacy, LLM prototyping, product metrics, responsible AI, and enterprise strategy.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 8. Prompt Engineer
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-pe-01',
  'learning-path-prompt-engineer',
  'Learning Path: Prompt Engineer',
  'Prompt Engineers design, test, and optimise the instructions given to AI language models to produce desired outputs reliably. The role spans system prompt design, few-shot example curation, chain-of-thought structuring, and building prompt pipelines for production applications. At the advanced level it overlaps with LLM engineering and AI product design.',
  'The quality of a prompt can be the difference between a useless and a transformative AI application. While the role title is debated, the underlying skills — instructing LLMs precisely and systematically — are in demand across AI product, research, and engineering roles. Prompt engineering is also the fastest entry point into a career in AI, with no prior ML or maths background required.',
  'Beginner (0–2 months): Using LLMs interactively (Claude, ChatGPT, Gemini), basic prompting (instruction clarity, context-setting), zero-shot vs. few-shot prompting, understanding temperature, top-p, and max tokens, knowing hallucination risks and context window limitations. Intermediate (2–6 months): Chain-of-thought (CoT) prompting and reasoning techniques, role prompting, system prompt design for product applications, output format control (JSON, XML, structured data), Python for prompt automation and LLM API calls, prompt chaining with LangChain or LlamaIndex, and RAG fundamentals. Advanced (6–12 months): Systematic prompt evaluation and A/B testing, building eval datasets, adversarial prompting and red-teaming, agentic prompt design (tool use, multi-step reasoning), fine-tuning vs. prompting trade-off decisions, and enterprise prompt governance (versioning, monitoring).',
  'Core tools: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Mistral. Developer APIs: Anthropic API, OpenAI API, Google AI Studio. Frameworks: LangChain, LlamaIndex, DSPy. Prompt management: PromptLayer, LangSmith, Weights & Biases Prompts. Evaluation: RAGAS, custom eval harnesses, manual red-teaming. Local models: Ollama, LM Studio. Python for automation. Recommended certifications: Anthropic has no formal cert yet — the Prompt Engineering Tutorial (GitHub) is the closest official resource. Vanderbilt Prompt Engineering for ChatGPT (Coursera) provides a structured certificate.',
  'chatgpt-prompt-engineering-for-developers',
  '["prompt-engineering-for-ai-applications","foundations-of-prompt-engineering","basics-of-prompt-engineering","prompt-engineering-with-generative-ai","claude-101","building-with-the-claude-api","ai-agents-in-langgraph","llm-course","cs50-prompt-engineering-lecture","genai-prompt-types","introduction-to-generative-ai-and-prompting"]',
  '[{"title":"Anthropic Prompt Engineering Documentation","url":"https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"},{"title":"Anthropic Interactive Prompt Engineering Tutorial — GitHub","url":"https://github.com/anthropics/prompt-eng-interactive-tutorial"},{"title":"Learn Prompting — Open Source Guide","url":"https://learnprompting.org/"},{"title":"DeepLearning.AI: ChatGPT Prompt Engineering for Developers (free)","url":"https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/"},{"title":"OpenAI Prompt Engineering Guide","url":"https://platform.openai.com/docs/guides/prompt-engineering"}]',
  'approved', 'published',
  'Prompt Engineer Learning Path — BytesAI',
  'A complete roadmap for becoming a Prompt Engineer, covering zero-shot and few-shot techniques, chain-of-thought prompting, RAG, agentic design, and production prompt evaluation.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 9. AI Ethics & Governance Specialist
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-eth-01',
  'learning-path-ai-ethics-governance',
  'Learning Path: AI Ethics & Governance Specialist',
  'AI Ethics and Governance Specialists ensure AI systems are developed and deployed responsibly — fairly, safely, transparently, and in compliance with laws and organisational values. They assess algorithmic bias, develop governance frameworks, conduct impact assessments, and ensure regulatory compliance with the EU AI Act, GDPR, and NIST frameworks.',
  'Gartner predicts 75% of organisations will face AI compliance audits by 2027, yet only 18% currently have formal AI governance in place. The EU AI Act (now in force) and similar legislation globally are creating urgent demand for professionals who can operationalise responsible AI at scale. This is one of the fastest-growing non-engineering AI specialisations.',
  'Beginner (0–4 months): AI literacy (how ML works, its limitations), core ethics principles (fairness, accountability, transparency, privacy, harm prevention), introduction to algorithmic bias, data privacy fundamentals (GDPR, CCPA), overview of the EU AI Act and NIST AI Risk Management Framework. Intermediate (4–10 months): Bias detection and mitigation (Fairlearn, IBM AI Fairness 360), explainability tools (SHAP, LIME), governance framework design, AI impact assessments, stakeholder engagement methods, case studies in facial recognition, hiring algorithms, and content moderation, technical vs. non-technical cross-disciplinary communication. Advanced (10–24 months): Deep EU AI Act compliance expertise (conformity assessments, high-risk systems), AI audit methodology, responsible AI programme management at organisational scale, international frameworks (OECD, G7, UNESCO), safety and alignment research foundations, ethics review board leadership, and policy advocacy.',
  'Bias and fairness tools: IBM AI Fairness 360, Fairlearn (Microsoft), Aequitas. Explainability: SHAP, LIME, InterpretML. Documentation standards: Model Cards, Datasheets for Datasets. Governance frameworks: NIST AI RMF, ISO/IEC 42001 (AI Management Systems). Audit tools: Credo AI, Holistic AI. Regulatory reading: EU AI Act, GDPR, CCPA, NIST documentation. Recommended certifications: IAPP AIGP (AI Governance Professional) — the leading industry certification for this role. Georgetown Certificate in AI Governance and Compliance.',
  'ai-governance-and-ethics',
  '["embrace-responsible-ai-principles-and-practices","ai-risk-management-and-incident-response","managing-ai-governance-in-organizations-with-iso-42001","diploma-in-ai-ethics-navigating-the-moral-compass-of-business-ai","ai-fluency-framework-and-foundations","introduction-to-ai-concepts","ai-foundations-for-everyone","securing-large-language-models-llms"]',
  '[{"title":"NIST AI Risk Management Framework (free)","url":"https://www.nist.gov/artificial-intelligence/ai-risk-management-framework"},{"title":"EU AI Act — Full Text and Summary","url":"https://artificialintelligenceact.eu/"},{"title":"IAPP AIGP: AI Governance Professional Certification","url":"https://iapp.org/certify/aigp"},{"title":"Google Responsible AI Practices","url":"https://ai.google/responsibility/responsible-ai-practices/"},{"title":"IBM AI Fairness 360 Toolkit","url":"https://aif360.res.ibm.com/"}]',
  'approved', 'published',
  'AI Ethics & Governance Learning Path — BytesAI',
  'A complete roadmap for becoming an AI Ethics and Governance Specialist, covering algorithmic bias, EU AI Act compliance, NIST frameworks, and responsible AI programme management.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
),

-- ─────────────────────────────────────────────────────────────
-- 10. Data Engineer (AI Pipelines)
-- ─────────────────────────────────────────────────────────────
(
  'cp-path-de-01',
  'learning-path-data-engineer-ai-pipelines',
  'Learning Path: Data Engineer (AI Pipelines)',
  'Data Engineers build and maintain the infrastructure that collects, stores, transforms, and serves data to AI and ML systems. The AI Pipelines specialisation means focusing on reliable, scalable pipelines that feed training data to models and serve inference-time data to production AI applications. Without good data engineering, ML models cannot be trained or serve real users.',
  'AI systems are only as good as the data they are trained on and the pipelines that serve them. Employment demand is strong and growing. Gartner predicts 75% of organisations will deploy AI/ML integrated with data engineering processes by 2025. Salaries range from $110,000–$160,000 in the US, with senior roles and cloud specialists commanding significantly more.',
  'Beginner (0–4 months): SQL (the single most important skill — master queries, joins, window functions, aggregations), Python for scripting pipelines, data modelling basics (dimensional modelling, star schema), understanding ETL vs. ELT, basic cloud storage (S3, GCS, Azure Blob), Git. Intermediate (4–10 months): Apache Spark/PySpark for distributed processing, Apache Airflow or Prefect for orchestration, data warehousing (Snowflake, BigQuery, or Databricks), dbt for data transformation, streaming with Apache Kafka, data quality and testing, Docker, and deep knowledge of one cloud platform (AWS, GCP, or Azure). Advanced (10–18 months): Real-time AI feature pipelines, building training data pipelines (large-scale data curation and deduplication for LLM training), vector database management and embedding pipelines, MLOps integration, data lakehouse architecture (Delta Lake, Apache Iceberg), Infrastructure as Code (Terraform), and data governance (lineage, cataloging).',
  'Core tools: SQL (primary), Python (PySpark, scripting). Processing: Apache Spark/PySpark, Apache Flink. Orchestration: Apache Airflow, Prefect, Dagster. Transformation: dbt (data build tool). Streaming: Apache Kafka, AWS Kinesis. Warehousing: Snowflake, BigQuery, Databricks, Redshift. Storage formats: Parquet, Delta Lake, Apache Iceberg. Feature stores: Feast, Hopsworks, Tecton. Cloud: AWS (S3, Glue, EMR), GCP (BigQuery, Dataflow), Azure Data Factory. IaC: Terraform. Recommended certifications: dbt Certified Developer, Databricks Certified Associate Developer for Apache Spark, Google Professional Data Engineer, AWS Data Analytics Specialty.',
  'data-and-ai-fundamentals',
  '["programming-for-everybody-python","explore-and-analyze-data-with-python","python-for-beginners-microsoft","introduction-to-ai-concepts","artificial-intelligence-fundamentals","aws-ai-practitioner-learning-plan","cs229-machine-learning"]',
  '[{"title":"DataTalks.Club Data Engineering Zoomcamp (free)","url":"https://datatalks.club/blog/data-engineering-zoomcamp.html"},{"title":"dbt Learn — Official Free Courses","url":"https://courses.getdbt.com/"},{"title":"IBM Data Engineering Professional Certificate (audit free)","url":"https://www.coursera.org/professional-certificates/ibm-data-engineer"},{"title":"Data Engineer Roadmap — roadmap.sh","url":"https://roadmap.sh/data-engineer"},{"title":"Google BigQuery Free Tier","url":"https://cloud.google.com/bigquery"}]',
  'approved', 'published',
  'Data Engineer (AI Pipelines) Learning Path — BytesAI',
  'A complete roadmap for becoming a Data Engineer specialising in AI pipelines, covering SQL, Spark, Airflow, dbt, Kafka, and lakehouse architecture.',
  '2026-04-01', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'
);
