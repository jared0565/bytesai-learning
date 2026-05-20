import fs from 'fs';

const data = JSON.parse(fs.readFileSync(new URL('./quiz-seed.json', import.meta.url), 'utf8'));
const now = new Date().toISOString();

let sql = `INSERT INTO quizzes (id, slug, title, description, category, published_status, created_at, updated_at) VALUES ('quiz-ai-knowledge', 'ai-knowledge', 'AI Knowledge Check', 'Test your understanding of AI concepts across beginner, intermediate, and advanced levels.', 'ai-knowledge', 'published', '${now}', '${now}');\n`;

const chunkSize = 10;
for (let i = 0; i < data.length; i += chunkSize) {
  const chunk = data.slice(i, i + chunkSize);
  sql += 'INSERT INTO quiz_questions (id, quiz_id, question_text, options_json, correct_index, explanation, difficulty, topic_tags_json) VALUES ';
  sql += chunk.map(q => {
    const opts = JSON.stringify(q.options_json).replace(/'/g, "''");
    const expl = q.explanation ? "'" + q.explanation.replace(/'/g, "''") + "'" : 'NULL';
    const tags = q.topic_tags_json ? "'" + JSON.stringify(q.topic_tags_json).replace(/'/g, "''") + "'" : 'NULL';
    return `('${q.id}', '${q.quiz_id}', '${q.question_text.replace(/'/g, "''")}', '${opts}', ${q.correct_index}, ${expl}, '${q.difficulty}', ${tags})`;
  }).join(', ');
  sql += ';\n';
}

fs.writeFileSync(new URL('./quiz-seed.sql', import.meta.url), sql);
console.log('Generated', data.length, 'question inserts');
