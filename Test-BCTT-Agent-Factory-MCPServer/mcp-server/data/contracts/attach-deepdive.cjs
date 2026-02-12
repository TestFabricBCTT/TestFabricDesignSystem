require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.JIRA_BASE_URL.trim();
const auth = Buffer.from(
  process.env.JIRA_USER_EMAIL.trim() + ':' + process.env.JIRA_API_TOKEN.trim()
).toString('base64');

const EPIC_KEY = 'BCTT-374';

function jiraRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + apiPath);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/json', 'Content-Type': 'application/json' }
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);
    const req = https.request(url, options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`)); return; }
        resolve(d ? JSON.parse(d) : {});
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function jiraUpload(issuePath, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now().toString(36);
    const fileContent = fs.readFileSync(filePath);
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    parts.push(fileContent);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const url = new URL(baseUrl + issuePath);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth, 'Accept': 'application/json',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length, 'X-Atlassian-Token': 'no-check',
      }
    };
    const req = https.request(url, options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`)); return; }
        resolve(d ? JSON.parse(d) : {});
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Attaching Deep Dive SVG to BCTT-374 ===\n');

  // 1. Upload SVG
  const svgPath = path.join(__dirname, 'BDEV00000011-dcs-deepdive.svg');
  try {
    await jiraUpload(`/rest/api/3/issue/${EPIC_KEY}/attachments`, svgPath, 'BDEV00000011-dcs-deepdive.svg');
    console.log('  ✓ Deep Dive SVG attached');
  } catch (e) {
    console.log('  ⚠ Upload failed:', e.message.substring(0, 100));
  }

  // 2. Add comment
  const comment = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Deep Dive — Digital Channels', marks: [{ type: 'strong' }] }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Diagrama deep dive dos Digital Channels anexado (' },
            { type: 'text', text: 'BDEV00000011-dcs-deepdive.svg', marks: [{ type: 'strong' }] },
            { type: 'text', text: '). Inclui:' }
          ]
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Microserviços BFF (Auth Service, Accounts Service)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Páginas frontend (LoginPage /login, LandingPage /) com rotas e componentes' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Estratégia de cache (localStorage: access_token, user)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Análise de eventos Socket.IO (4 eventos Core NÃO CONSUMIDOS pelo frontend)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Estratégia de dados: API-ONLY (sem event-driven updates)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fluxo: User → React → api.ts → BFF :4020 → Middleware :4010 → Core :4001' }] }] },
          ]
        },
        { type: 'rule' },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Lacuna identificada: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: 'Socket.IO client está nas dependências mas não é usado no código. Os 4 eventos do Core (movement.created, balance.updated, account.status.changed, digital_access.created) não são consumidos.' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Recomendação: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: 'Considerar padrão hybrid — consumir eventos Socket.IO para actualizações real-time de saldos e movimentos.' }
          ]
        },
      ]
    }
  };

  try {
    const result = await jiraRequest('POST', `/rest/api/3/issue/${EPIC_KEY}/comment`, comment);
    console.log(`  ✓ Comment added (ID: ${result.id})`);
  } catch (e) {
    console.log('  ⚠ Comment failed:', e.message.substring(0, 100));
  }

  console.log('\n✅ Done!');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
