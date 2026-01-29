const { initDatabase } = require('./dist/db/index.js');
const { generateImage } = require('./dist/core/gemini.js');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

async function test() {
  const db = await initDatabase();

  // 1. Generate an image
  console.log('Step 1: Generating image...');
  const imgResult = await generateImage('一杯精致的抹茶拿铁，拉花呈现叶子形状，白色陶瓷杯，极简背景');
  console.log('Image result:', imgResult);

  if (!imgResult.success) {
    console.error('Image generation failed');
    return;
  }

  // 2. Create draft
  console.log('Step 2: Creating draft...');
  const draftId = randomUUID();
  const now = new Date().toISOString();

  // Copy image to drafts dir
  const draftDir = path.join(require('os').homedir(), '.xhs-mcp', 'drafts', draftId);
  fs.mkdirSync(draftDir, { recursive: true });
  const destPath = path.join(draftDir, '0.jpg');
  fs.copyFileSync(imgResult.path, destPath);

  db.run(
    'INSERT INTO note_drafts (id, title, content, tags, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      draftId,
      '今日饮品推荐',
      '周末的下午，来一杯抹茶拿铁，感受生活的美好',
      JSON.stringify(['咖啡', '抹茶', '下午茶']),
      JSON.stringify([destPath]),
      now,
      now
    ]
  );
  console.log('Draft created:', draftId);

  // 3. List drafts
  console.log('Step 3: Listing drafts...');
  const drafts = db.all('SELECT * FROM note_drafts ORDER BY created_at DESC');
  console.log(JSON.stringify(drafts.map(d => ({
    id: d.id,
    title: d.title,
    tags: JSON.parse(d.tags || '[]'),
    images: JSON.parse(d.images || '[]'),
  })), null, 2));
}

test().catch(console.error);
