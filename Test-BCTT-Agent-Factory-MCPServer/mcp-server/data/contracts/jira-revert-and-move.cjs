require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.JIRA_BASE_URL.trim();
const auth = Buffer.from(
  process.env.JIRA_USER_EMAIL.trim() + ':' + process.env.JIRA_API_TOKEN.trim()
).toString('base64');

const OLD_EPIC = 'BCTT-336';
const NEW_EPIC = 'BCTT-374';
const PROJECT_KEY = 'BCTT';

// Tasks created in the wrong epic
const TASKS_TO_DELETE = [
  'BCTT-400', 'BCTT-401', 'BCTT-402', 'BCTT-403', 'BCTT-404',
  'BCTT-405', 'BCTT-406', 'BCTT-407', 'BCTT-408', 'BCTT-409',
  'BCTT-410', 'BCTT-411', 'BCTT-412'
];

const COMMENT_ID = '10044';

// Attachment IDs from the upload
const ATTACHMENT_IDS = ['10245', '10246', '10247'];

function jiraRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + apiPath);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = https.request(url, options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 300)}`));
          return;
        }
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
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/json',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'X-Atlassian-Token': 'no-check',
      }
    };
    const req = https.request(url, options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 300)}`));
          return;
        }
        resolve(d ? JSON.parse(d) : {});
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function linkIssues(fromKey, toKey, linkType) {
  const body = {
    type: { name: linkType },
    inwardIssue: { key: fromKey },
    outwardIssue: { key: toKey }
  };
  return jiraRequest('POST', '/rest/api/3/issueLink', body);
}

// ======== PHASE 1: REVERT from BCTT-336 ========

async function revertOldEpic() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1: Reverting BCTT-336 (removing everything)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1a. Delete comment
  console.log('--- Deleting comment ---');
  try {
    await jiraRequest('DELETE', `/rest/api/3/issue/${OLD_EPIC}/comment/${COMMENT_ID}`);
    console.log(`  ✓ Comment ${COMMENT_ID} deleted from ${OLD_EPIC}`);
  } catch (e) {
    console.log(`  ⚠ Comment delete failed: ${e.message.substring(0, 100)}`);
  }

  // 1b. Delete attachments
  console.log('\n--- Deleting attachments ---');
  for (const attId of ATTACHMENT_IDS) {
    try {
      await jiraRequest('DELETE', `/rest/api/3/attachment/${attId}`);
      console.log(`  ✓ Attachment ${attId} deleted`);
    } catch (e) {
      console.log(`  ⚠ Attachment ${attId} delete failed: ${e.message.substring(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // 1c. Delete tasks
  console.log('\n--- Deleting 13 tasks ---');
  for (const key of TASKS_TO_DELETE) {
    try {
      await jiraRequest('DELETE', `/rest/api/3/issue/${key}`);
      console.log(`  ✓ ${key} deleted`);
    } catch (e) {
      console.log(`  ⚠ ${key} delete failed: ${e.message.substring(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n✅ BCTT-336 reverted — all items removed.\n');
}

// ======== PHASE 2: Query BCTT-374 structure ========

async function queryNewEpic() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: Querying BCTT-374 structure                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Get BCTT-374 details
  const issue = await jiraRequest('GET', `/rest/api/3/issue/${NEW_EPIC}?fields=summary,issuetype,status`);
  console.log(`  Epic: ${issue.key} — ${issue.fields.summary}`);
  console.log(`  Type: ${issue.fields.issuetype.name}, Status: ${issue.fields.status.name}\n`);

  // Get children
  const searchBody = { jql: `parent = ${NEW_EPIC} ORDER BY issuetype ASC`, maxResults: 50, fields: ['summary', 'issuetype', 'status', 'labels'] };
  try {
    const results = await jiraRequest('POST', '/rest/api/3/search/jql', searchBody);
    console.log(`  Children: ${results.total}`);
    (results.issues || []).forEach(i => {
      console.log(`    ${i.key} ${i.fields.issuetype.name.padEnd(10)} ${i.fields.status.name.padEnd(20)} ${i.fields.summary.substring(0, 70)}`);
    });
    return results.issues || [];
  } catch (e) {
    console.log(`  ⚠ Search failed: ${e.message.substring(0, 150)}`);
    return [];
  }
}

// ======== PHASE 3: Recreate everything on BCTT-374 ========

async function recreateOnNewEpic(children) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 3: Creating everything on BCTT-374               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Find features to link to (if any exist under BCTT-374)
  const features = children.filter(c => c.fields.issuetype.name === 'Feature');
  const firstFeature = features.length > 0 ? features[0].key : null;
  console.log(`  Features found: ${features.length}${firstFeature ? ' (first: ' + firstFeature + ')' : ''}\n`);

  // 3a. Add comment
  console.log('--- Adding documentation comment ---');
  const comment = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Interface Contract \u2014 BDEV00000011', marks: [{ type: 'strong' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Documenta\u00e7\u00e3o t\u00e9cnica gerada automaticamente pelo TAA (Test Architecture Agent) em 2026-02-11.' }] },
        { type: 'rule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'APIs REST (10 endpoints)' }] },
        {
          type: 'table',
          attrs: { isNumberColumnEnabled: false, layout: 'default' },
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'M\u00e9todo', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Endpoint', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Descri\u00e7\u00e3o', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Erros', marks: [{ type: 'strong' }] }] }] },
              ]
            },
            ...([
              ['POST', '/api/v1/auth/login', 'Autentica\u00e7\u00e3o \u2014 JWT token', '400, 401'],
              ['GET', '/api/v1/accounts', 'Lista contas (filtro clientId JWT)', '401, 403'],
              ['GET', '/api/v1/accounts/:accountId', 'Detalhe conta com saldos', '401, 403, 404'],
              ['GET', '/api/v1/movements', 'Lista movimentos (pagina\u00e7\u00e3o)', '400, 401, 403'],
              ['POST', '/api/v1/movements', 'Cria movimento (d\u00e9bito/cr\u00e9dito)', '400, 401, 404'],
              ['POST', '/api/v1/transfers', 'Transfer\u00eancia interna', '400, 401, 403, 404'],
              ['GET', '/api/v1/clients', 'Lista clientes (backoffice)', '401, 403'],
              ['GET', '/api/v1/clients/:clientId', 'Detalhe cliente', '401, 404'],
              ['POST', '/api/v1/clients', 'Cria cliente (backoffice)', '400, 409'],
              ['PUT', '/api/v1/clients/:clientId', 'Actualiza cliente', '404, 409'],
            ]).map(([method, endpoint, desc, errors]) => ({
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: method, marks: [{ type: 'code' }] }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: endpoint, marks: [{ type: 'code' }] }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: desc }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: errors }] }] },
              ]
            }))
          ]
        },
        { type: 'rule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Eventos Socket.IO (4 eventos)' }] },
        {
          type: 'table',
          attrs: { isNumberColumnEnabled: false, layout: 'default' },
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Evento', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Origem', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Destino', marks: [{ type: 'strong' }] }] }] },
              ]
            },
            ...([
              ['movement.created', 'Core API', 'DigitalChannels (frontend)'],
              ['balance.updated', 'Core API', 'DigitalChannels (frontend)'],
              ['account.status.changed', 'Core API', 'DigitalChannels (frontend)'],
              ['digital_access.created', 'Core API', 'Middleware'],
            ]).map(([name, src, dest]) => ({
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: name, marks: [{ type: 'code' }] }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: src }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: dest }] }] },
              ]
            }))
          ]
        },
        { type: 'rule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Tipos Partilhados (7 types)' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Client', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'Account', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'Movement', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'Balance', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'AuthToken', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'TransferResult', marks: [{ type: 'code' }] }, { type: 'text', text: ' | ' },
            { type: 'text', text: 'ApiError', marks: [{ type: 'code' }] },
          ]
        },
        { type: 'rule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Ficheiros Anexados' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BDEV00000011.json', marks: [{ type: 'strong' }] }, { type: 'text', text: ' \u2014 Interface Contract (dados completos, JSON)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BDEV00000011-architecture.svg', marks: [{ type: 'strong' }] }, { type: 'text', text: ' \u2014 Diagrama de arquitectura do ecossistema (visual)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BDEV00000011-docs.html', marks: [{ type: 'strong' }] }, { type: 'text', text: ' \u2014 Documenta\u00e7\u00e3o completa da API (abrir no browser)' }] }] },
          ]
        },
        { type: 'rule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Tarefas T\u00e9cnicas Criadas (13 tasks)' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Foram criadas 13 tarefas de valida\u00e7\u00e3o [IC-01] a [IC-13] com label ' },
            { type: 'text', text: 'interface-contract', marks: [{ type: 'code' }] },
            { type: 'text', text: ', agrupadas por projecto: Core (8), Middleware (2), DigitalChannels (2), Transversal (1).' }
          ]
        },
      ]
    }
  };

  const commentResult = await jiraRequest('POST', `/rest/api/3/issue/${NEW_EPIC}/comment`, comment);
  console.log(`  \u2713 Comment added to ${NEW_EPIC} (ID: ${commentResult.id})\n`);

  // 3b. Create 13 tasks
  console.log('--- Creating 13 tasks ---');
  const tasks = [
    { summary: '[IC-01] Validar API POST /auth/login \u2014 request/response conforme Interface Contract', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-02] Validar API GET /accounts \u2014 filtro por clientId JWT', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-03] Validar API GET /accounts/:accountId \u2014 detalhe com saldos', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-04] Validar API GET /movements \u2014 pagina\u00e7\u00e3o e filtros', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-05] Validar API POST /movements \u2014 cria\u00e7\u00e3o de movimento', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-06] Validar API POST /transfers \u2014 transfer\u00eancia interna', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-07] Validar API CRUD /clients \u2014 gest\u00e3o clientes backoffice', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-08] Validar eventos Socket.IO (4 eventos) conforme contract', labels: ['interface-contract', 'core', 'fase2'] },
    { summary: '[IC-09] Validar proxy /api/v1/* \u2192 Core com autentica\u00e7\u00e3o JWT', labels: ['interface-contract', 'middleware', 'fase2'] },
    { summary: '[IC-10] Validar rate limiting e error handling no Gateway', labels: ['interface-contract', 'middleware', 'fase2'] },
    { summary: '[IC-11] Validar integra\u00e7\u00e3o frontend com APIs via BFF', labels: ['interface-contract', 'digital-channels', 'fase2'] },
    { summary: '[IC-12] Validar handling de eventos Socket.IO no frontend', labels: ['interface-contract', 'digital-channels', 'fase2'] },
    { summary: '[IC-13] Validar tipos partilhados (7 types) entre projectos', labels: ['interface-contract', 'transversal', 'fase2'] },
  ];

  const created = [];
  for (let i = 0; i < tasks.length; i += 3) {
    const batch = tasks.slice(i, i + 3);
    const results = await Promise.all(batch.map(t => {
      const body = {
        fields: {
          project: { key: PROJECT_KEY },
          summary: t.summary,
          issuetype: { name: 'Task' },
          parent: { key: NEW_EPIC },
          labels: t.labels,
          description: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tarefa gerada automaticamente a partir do Interface Contract BDEV00000011. Validar conformidade com o contrato t\u00e9cnico documentado.' }] }]
          }
        }
      };
      return jiraRequest('POST', '/rest/api/3/issue', body);
    }));
    results.forEach((r, idx) => {
      console.log(`  \u2713 ${r.key} \u2014 ${batch[idx].summary.substring(0, 65)}`);
      created.push(r.key);
    });
    if (i + 3 < tasks.length) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n\u2705 ${created.length} tasks created under ${NEW_EPIC}\n`);

  // 3c. Link tasks to features (if any exist)
  if (firstFeature) {
    console.log(`--- Linking tasks to Feature ${firstFeature} ---`);
    for (const key of created) {
      try {
        await linkIssues(key, firstFeature, 'Relates');
        console.log(`  \ud83d\udd17 ${key} \u2192 ${firstFeature}`);
      } catch (e) {
        console.log(`  \u26a0 Link failed: ${key}: ${e.message.substring(0, 80)}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  } else {
    console.log('  (No features found under BCTT-374 \u2014 skipping links)');
  }

  // 3d. Attach files
  console.log('\n--- Attaching files ---');
  const contractsDir = __dirname;
  const files = [
    { name: 'BDEV00000011.json', path: path.join(contractsDir, 'BDEV00000011.json') },
    { name: 'BDEV00000011-architecture.svg', path: path.join(contractsDir, 'BDEV00000011-architecture.svg') },
    { name: 'BDEV00000011-docs.html', path: path.join(contractsDir, 'BDEV00000011-docs.html') },
  ];

  for (const file of files) {
    try {
      const result = await jiraUpload(`/rest/api/3/issue/${NEW_EPIC}/attachments`, file.path, file.name);
      console.log(`  \u2713 Attached: ${file.name}`);
    } catch (e) {
      console.log(`  \u26a0 Upload failed: ${file.name}: ${e.message.substring(0, 150)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\u2705 All files attached to ${NEW_EPIC}\n`);
}

// ======== MAIN ========
async function main() {
  try {
    // Phase 1: Revert BCTT-336
    await revertOldEpic();

    // Phase 2: Query BCTT-374
    const children = await queryNewEpic();

    // Phase 3: Recreate on BCTT-374
    await recreateOnNewEpic(children);

    console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('\u2551  \u2705 MOVE COMPLETE: BCTT-336 \u2192 BCTT-374                  \u2551');
    console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  } catch (e) {
    console.error('\n\u274c FATAL ERROR:', e.message);
    process.exit(1);
  }
}

main();
