/**
 * Insert screenshots into Notion documentation pages.
 *
 * Usage: NOTION_TOKEN=ntn_xxx node scripts/insert-notion-screenshots.js
 *
 * This script:
 * 1. Reads each Notion page
 * 2. Finds blocks with "📸" or "Capture d'écran" markers
 * 3. Inserts image blocks with raw.githubusercontent.com URLs after those markers
 */

const https = require('https');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GITHUB_OWNER = 'teamafeia-creator';
const GITHUB_REPO = 'afeia-practitioner-web';
const GITHUB_BRANCH = 'claude/add-documentation-screenshots-G76cV';
const SCREENSHOT_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/docs/screenshots`;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
if (!NOTION_TOKEN) {
  console.error('Error: NOTION_TOKEN environment variable is required');
  console.error('Usage: NOTION_TOKEN=ntn_xxx node scripts/insert-notion-screenshots.js');
  process.exit(1);
}

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Set up proxy agent
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
if (proxyUrl) console.log('Using proxy for Notion API');

// Mapping: Notion page ID -> screenshot filename(s)
const PAGE_SCREENSHOT_MAP = [
  { pageId: '3064d5abfcd681f393a4d99e74ba4797', screenshots: ['login.png'], label: 'Page Login' },
  { pageId: '3064d5abfcd681adae24df28995bb4bd', screenshots: ['dashboard.png'], label: 'Dashboard' },
  { pageId: '3064d5abfcd6810186c9e3c311868d09', screenshots: ['agenda.png'], label: 'Agenda' },
  { pageId: '3064d5abfcd68193bd7bca125a744ca0', screenshots: ['consultants.png', 'consultant-fiche.png'], label: 'Consultants' },
  { pageId: '3064d5abfcd681c89785e40183984d12', screenshots: [], label: 'Dossier medical (requires activated consultant)' },
  { pageId: '3064d5abfcd681e8be12d79f2dfbe5a8', screenshots: [], label: 'Anamnese (requires activated consultant)' },
  { pageId: '3064d5abfcd681a290efcc8233a64863', screenshots: [], label: 'Conseillancier (requires activated consultant)' },
  { pageId: '3064d5abfcd681fdb6cff028c0780ac5', screenshots: [], label: 'Journal (requires activated consultant)' },
  { pageId: '3064d5abfcd681bfa113d286eb61ea3e', screenshots: [], label: 'Bague connectee (requires activated consultant)' },
  { pageId: '3064d5abfcd681f89003c6faa9dcde78', screenshots: [], label: 'Schemas corporels (requires activated consultant)' },
  { pageId: '3064d5abfcd68124bd3ad03194c26434', screenshots: [], label: 'Documents (requires activated consultant)' },
  { pageId: '3064d5abfcd6818c8d7edfece0bb129c', screenshots: [], label: 'Notes privees (requires activated consultant)' },
  { pageId: '3064d5abfcd681eeacbcc7eee3f06538', screenshots: [], label: 'Messages consultant (requires activated consultant)' },
  { pageId: '3064d5abfcd681a1a52cfd5bb5a976fd', screenshots: ['messages.png'], label: 'Messages' },
  { pageId: '3064d5abfcd681629d67d18bf6dd5fd5', screenshots: ['facturation.png'], label: 'Facturation' },
  { pageId: '3064d5abfcd6818b920dee0f0c17cff6', screenshots: ['statistiques.png'], label: 'Statistiques' },
  { pageId: '3064d5abfcd68131813bf35b6f292f84', screenshots: ['parametres.png', 'parametres-types-seance.png', 'parametres-disponibilites.png', 'parametres-prise-rdv.png', 'parametres-profil-ia.png'], label: 'Parametres' },
  { pageId: '3064d5abfcd6811d995eeb4cb3b0f33a', screenshots: ['aide.png'], label: 'Aide' },
  { pageId: '3064d5abfcd6815bb3acf51637ce79f4', screenshots: ['admin-login.png'], label: 'Admin' },
];

function notionRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${NOTION_API}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Notion API error ${res.statusCode}: ${json.message || JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function getBlockChildren(blockId) {
  const allBlocks = [];
  let cursor;
  do {
    const params = cursor ? `?start_cursor=${cursor}` : '';
    const data = await notionRequest('GET', `/blocks/${blockId}/children${params}`);
    allBlocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return allBlocks;
}

async function findScreenshotMarkers(pageId) {
  const blocks = await getBlockChildren(pageId);
  const markers = [];

  for (const block of blocks) {
    const text = extractPlainText(block);
    if (text && (text.includes('📸') || text.toLowerCase().includes('capture d\'écran') || text.toLowerCase().includes('capture d\'ecran'))) {
      markers.push(block);
    }
  }
  return markers;
}

function extractPlainText(block) {
  const type = block.type;
  const content = block[type];
  if (!content) return '';

  if (content.rich_text) {
    return content.rich_text.map(t => t.plain_text).join('');
  }
  if (content.text) {
    return content.text.map(t => t.plain_text).join('');
  }
  return '';
}

async function insertImageAfterBlock(pageId, afterBlockId, imageUrl, caption = '') {
  const imageBlock = {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url: imageUrl },
      caption: caption ? [{
        type: 'text',
        text: { content: caption },
      }] : [],
    },
  };

  // Append the image block after the specified block
  return await notionRequest('PATCH', `/blocks/${afterBlockId}/children`, {
    children: [imageBlock],
  });
}

async function appendImageToPage(pageId, imageUrl, caption = '') {
  const imageBlock = {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url: imageUrl },
      caption: caption ? [{
        type: 'text',
        text: { content: caption },
      }] : [],
    },
  };

  return await notionRequest('PATCH', `/blocks/${pageId}/children`, {
    children: [imageBlock],
  });
}

async function processPage(pageId, screenshots, label) {
  if (screenshots.length === 0) {
    console.log(`  [skip] ${label} - no screenshots available`);
    return;
  }

  console.log(`\n  Processing: ${label} (${screenshots.length} screenshots)`);

  try {
    // First try to find 📸 markers
    const markers = await findScreenshotMarkers(pageId);

    if (markers.length > 0) {
      console.log(`    Found ${markers.length} screenshot marker(s)`);
      // Insert screenshots after markers
      for (let i = 0; i < Math.min(markers.length, screenshots.length); i++) {
        const imageUrl = `${SCREENSHOT_BASE}/${screenshots[i]}`;
        const caption = screenshots[i].replace('.png', '').replace(/-/g, ' ');

        try {
          await appendImageToPage(markers[i].id, imageUrl, caption);
          console.log(`    [ok] Inserted ${screenshots[i]} after marker`);
        } catch (e) {
          // If appending to block fails, try appending to page
          console.log(`    [retry] Appending to page instead...`);
          await appendImageToPage(pageId, imageUrl, caption);
          console.log(`    [ok] Appended ${screenshots[i]} to page`);
        }
      }
      // If more screenshots than markers, append remaining to page
      for (let i = markers.length; i < screenshots.length; i++) {
        const imageUrl = `${SCREENSHOT_BASE}/${screenshots[i]}`;
        const caption = screenshots[i].replace('.png', '').replace(/-/g, ' ');
        await appendImageToPage(pageId, imageUrl, caption);
        console.log(`    [ok] Appended ${screenshots[i]} to page`);
      }
    } else {
      // No markers found, just append all screenshots to the page
      console.log('    No markers found, appending screenshots to page');
      for (const ss of screenshots) {
        const imageUrl = `${SCREENSHOT_BASE}/${ss}`;
        const caption = ss.replace('.png', '').replace(/-/g, ' ');
        await appendImageToPage(pageId, imageUrl, caption);
        console.log(`    [ok] Appended ${ss} to page`);
      }
    }
  } catch (e) {
    console.error(`    [FAIL] ${e.message}`);
  }
}

async function main() {
  console.log('=== Inserting screenshots into Notion pages ===\n');
  console.log(`GitHub base URL: ${SCREENSHOT_BASE}`);
  console.log(`Processing ${PAGE_SCREENSHOT_MAP.length} pages...\n`);

  for (const { pageId, screenshots, label } of PAGE_SCREENSHOT_MAP) {
    await processPage(pageId, screenshots, label);
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);
