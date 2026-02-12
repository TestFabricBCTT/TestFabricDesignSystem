require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.JIRA_BASE_URL.trim();
const auth = Buffer.from(
  process.env.JIRA_USER_EMAIL.trim() + ':' + process.env.JIRA_API_TOKEN.trim()
).toString('base64');

const EPIC_KEY = 'BCTT-336';
const PROJECT_KEY = 'BCTT';

// Feature keys for linking
const FEATURES = {
  batch1: 'BCTT-338', // Scaffolding Projectos Base
  batch2: 'BCTT-339', // Infra Agentes Fase 2
  batch3: 'BCTT-340', // WithErrors + UnitTest
};

function jiraRequest(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const options = {
      method,
      headers: {
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/json',
        ...(headers || {}),
      }
    };
    if (!headers || !headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }
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

// ======== STEP 1: Add documentation comment to BCTT-336 ========
async function addDocumentationComment() {
  console.log('=== Step 1: Adding documentation comment to BCTT-336 ===\n');

  const comment = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        // Title
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Interface Contract — BDEV00000011', marks: [{ type: 'strong' }] }]
        },
        // Intro paragraph
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Documentação técnica gerada automaticamente pelo TAA (Test Architecture Agent) em 2026-02-11.' }
          ]
        },
        // Separator
        { type: 'rule' },
        // APIs section
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'APIs REST (10 endpoints)' }]
        },
        // API Table
        {
          type: 'table',
          attrs: { isNumberColumnEnabled: false, layout: 'default' },
          content: [
            // Header row
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Método', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Endpoint', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Descrição', marks: [{ type: 'strong' }] }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Erros', marks: [{ type: 'strong' }] }] }] },
              ]
            },
            // Data rows
            ...([
              ['POST', '/api/v1/auth/login', 'Autenticação — JWT token', '400, 401'],
              ['GET', '/api/v1/accounts', 'Lista contas (filtro clientId JWT)', '401, 403'],
              ['GET', '/api/v1/accounts/:accountId', 'Detalhe conta com saldos', '401, 403, 404'],
              ['GET', '/api/v1/movements', 'Lista movimentos (paginação)', '400, 401, 403'],
              ['POST', '/api/v1/movements', 'Cria movimento (débito/crédito)', '400, 401, 404'],
              ['POST', '/api/v1/transfers', 'Transferência interna', '400, 401, 403, 404'],
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
        // Events section
        { type: 'rule' },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Eventos Socket.IO (4 eventos)' }]
        },
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
        // Shared Types section
        { type: 'rule' },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Tipos Partilhados (7 types)' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Client' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'Account' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'Movement' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'Balance' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'AuthToken' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'TransferResult' , marks: [{ type: 'code' }] },
            { type: 'text', text: ' | ' },
            { type: 'text', text: 'ApiError' , marks: [{ type: 'code' }] },
          ]
        },
        // Files section
        { type: 'rule' },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Ficheiros Anexados' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [
                { type: 'text', text: 'BDEV00000011.json', marks: [{ type: 'strong' }] },
                { type: 'text', text: ' — Interface Contract (dados completos, JSON)' }
              ]}]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [
                { type: 'text', text: 'BDEV00000011-architecture.svg', marks: [{ type: 'strong' }] },
                { type: 'text', text: ' — Diagrama de arquitectura do ecossistema (visual)' }
              ]}]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [
                { type: 'text', text: 'BDEV00000011-docs.html', marks: [{ type: 'strong' }] },
                { type: 'text', text: ' — Documentação completa da API (abrir no browser)' }
              ]}]
            },
          ]
        },
        // Tarefas section
        { type: 'rule' },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Tarefas Técnicas Criadas (13 tasks)' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Foram criadas 13 tarefas de validação [IC-01] a [IC-13] com label ' },
            { type: 'text', text: 'interface-contract', marks: [{ type: 'code' }] },
            { type: 'text', text: ', agrupadas por projecto: Core (8), Middleware (2), DigitalChannels (2), Transversal (1). Todas linkadas às Features correspondentes.' }
          ]
        },
      ]
    }
  };

  const result = await jiraRequest('POST', `/rest/api/3/issue/${EPIC_KEY}/comment`, comment);
  console.log(`  ✓ Comment added (ID: ${result.id})\n`);
  return result;
}

// ======== STEP 2: Create 13 tasks ========
const tasks = [
  { summary: '[IC-01] Validar API POST /auth/login — request/response conforme Interface Contract', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-02] Validar API GET /accounts — filtro por clientId JWT', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-03] Validar API GET /accounts/:accountId — detalhe com saldos', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-04] Validar API GET /movements — paginação e filtros', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-05] Validar API POST /movements — criação de movimento', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-06] Validar API POST /transfers — transferência interna', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-07] Validar API CRUD /clients — gestão clientes backoffice', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-08] Validar eventos Socket.IO (4 eventos) conforme contract', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-09] Validar proxy /api/v1/* → Core com autenticação JWT', labels: ['interface-contract', 'middleware', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-10] Validar rate limiting e error handling no Gateway', labels: ['interface-contract', 'middleware', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-11] Validar integração frontend com APIs via BFF', labels: ['interface-contract', 'digital-channels', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-12] Validar handling de eventos Socket.IO no frontend', labels: ['interface-contract', 'digital-channels', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-13] Validar tipos partilhados (7 types) entre projectos', labels: ['interface-contract', 'transversal', 'fase2'], feature: FEATURES.batch2 },
];

async function createTask(task) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary: task.summary,
      issuetype: { name: 'Task' },
      parent: { key: EPIC_KEY },
      labels: task.labels,
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'Tarefa gerada automaticamente a partir do Interface Contract BDEV00000011. Validar conformidade com o contrato técnico documentado.'
          }]
        }]
      }
    }
  };

  const result = await jiraRequest('POST', '/rest/api/3/issue', body);
  console.log(`  ✓ ${result.key} — ${task.summary.substring(0, 70)}`);
  return result;
}

async function linkIssues(fromKey, toKey, linkType) {
  const body = {
    type: { name: linkType },
    inwardIssue: { key: fromKey },
    outwardIssue: { key: toKey }
  };
  await jiraRequest('POST', '/rest/api/3/issueLink', body);
  console.log(`  🔗 ${fromKey} → ${toKey} (${linkType})`);
}

async function createTasks() {
  console.log('=== Step 2: Creating 13 Interface Contract tasks ===\n');

  const created = [];
  for (let i = 0; i < tasks.length; i += 3) {
    const batch = tasks.slice(i, i + 3);
    const results = await Promise.all(batch.map(t => createTask(t)));
    created.push(...results.map((r, idx) => ({ key: r.key, feature: batch[idx].feature })));
    if (i + 3 < tasks.length) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ ${created.length} tasks created\n`);

  // Link tasks to features
  console.log('=== Step 3: Linking tasks to Features ===\n');
  for (const item of created) {
    try {
      await linkIssues(item.key, item.feature, 'Relates');
    } catch (e) {
      console.log(`  ⚠ Link failed: ${item.key} → ${item.feature}: ${e.message.substring(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n✅ All tasks created and linked.\n');
  return created;
}

// ======== STEP 4: Attach files to BCTT-336 ========
async function attachFiles() {
  console.log('=== Step 4: Attaching files to BCTT-336 ===\n');

  const contractsDir = __dirname;
  const files = [
    { name: 'BDEV00000011.json', path: path.join(contractsDir, 'BDEV00000011.json') },
    { name: 'BDEV00000011-architecture.svg', path: path.join(contractsDir, 'BDEV00000011-architecture.svg') },
    { name: 'BDEV00000011-docs.html', path: path.join(contractsDir, 'BDEV00000011-docs.html') },
  ];

  for (const file of files) {
    try {
      const result = await jiraUpload(`/rest/api/3/issue/${EPIC_KEY}/attachments`, file.path, file.name);
      console.log(`  ✓ Attached: ${file.name} (${Array.isArray(result) ? result[0].id : 'ok'})`);
    } catch (e) {
      console.log(`  ⚠ Upload failed: ${file.name}: ${e.message.substring(0, 150)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✅ All files attached.\n');
}

// ======== MAIN ========
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  BDEV00000011 — Jira Operations (Comment + Tasks +     ║');
  console.log('║  Links + Attachments)                                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    await addDocumentationComment();
    await createTasks();
    await attachFiles();

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL OPERATIONS COMPLETE                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  } catch (e) {
    console.error('\n❌ FATAL ERROR:', e.message);
    process.exit(1);
  }
}

main();
