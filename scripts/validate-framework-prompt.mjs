// Local validation: checks that the refresh-framework prompt template produces
// a structurally valid JSON skeleton when given a sample article.
// This does NOT call OpenRouter; it validates parsing and field extraction.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routePath = join(__dirname, '../src/app/api/admin/curated/refresh-framework/route.ts');
const routeCode = readFileSync(routePath, 'utf8');

// Extract the prompt template from the source file
const promptMatch = routeCode.match(/const prompt = `([\s\S]*?)`;/);
if (!promptMatch) {
  console.error('❌ Could not find prompt template in route.ts');
  process.exit(1);
}

const promptTemplate = promptMatch[1];

// Validate required instructions are present
const required = [
  'executive TL;DR',
  'Start with 3–5 Markdown bullet lines',
  'risk and opportunity',
  '**This week**',
  '**This quarter**',
  '**This year**',
  'Respond ONLY with valid JSON',
  'BANNED PHRASES',
];

const missing = required.filter(r => !promptTemplate.includes(r));
if (missing.length > 0) {
  console.error('❌ Prompt missing required instructions:', missing.join(', '));
  process.exit(1);
}

// Simulate a filled prompt with sample content
const sampleContent = `Researchers at Example Institute released a new benchmark of 1,000 tasks.
Their method improved accuracy from 45% to 78% while reducing errors by half.
The work is published on arXiv.`;

const filledPrompt = promptTemplate
  .replace('${title.replace(/"/g, \'\\\\"\')}', 'Sample Article Title')
  .replace('${rawContent.slice(0, 5500)}', sampleContent);

// Extract the JSON block the model is asked to return
const jsonBlockMatch = filledPrompt.match(/\{\s*"summary": "\.\.\.",\s*"why_it_matters": "\.\.\.",\s*"what_changed": "\.\.\.",\s*"executive_implications": "\.\.\.",\s*"meta_description": "\.\.\."\s*\}/);
if (!jsonBlockMatch) {
  console.error('❌ Could not find expected JSON schema block in prompt');
  process.exit(1);
}

console.log('✅ Prompt validation passed');
console.log('   - All required instructions present');
console.log('   - JSON schema block present');
console.log('   - Sample prompt length:', filledPrompt.length, 'chars');
