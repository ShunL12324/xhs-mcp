import { XhsClient } from '../src/xhs/index.js';

async function main() {
  const client = new XhsClient();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'login':
        console.log('Starting login flow...');
        await client.login();
        break;

      case 'search':
        const keyword = args[1];
        if (!keyword) {
          console.error('Please provide a keyword: npm run test:search -- <keyword>');
          process.exit(1);
        }
        console.log(`Searching for "${keyword}"...`);
        const results = await client.search(keyword);
        console.log(JSON.stringify(results, null, 2));
        break;

      case 'note':
        const noteId = args[1];
        if (!noteId) {
          console.error('Please provide a note ID: npm run test:note -- <noteId>');
          process.exit(1);
        }
        console.log(`Getting note "${noteId}"...`);
        const note = await client.getNote(noteId);
        console.log(JSON.stringify(note, null, 2));
        break;

      default:
        console.log('Usage:');
        console.log('  npm run test:login');
        console.log('  npm run test:search -- <keyword>');
        console.log('  npm run test:note -- <noteId>');
        break;
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
