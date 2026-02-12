require('dotenv').config();
const https = require('https');

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

const tasks = [
  // Core tasks
  { summary: '[IC-01] Validar API POST /auth/login — request/response conforme Interface Contract', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-02] Validar API GET /accounts — filtro por clientId JWT', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-03] Validar API GET /accounts/:accountId — detalhe com saldos', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-04] Validar API GET /movements — paginação e filtros', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-05] Validar API POST /movements — criação de movimento', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-06] Validar API POST /transfers — transferência interna', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-07] Validar API CRUD /clients — gestão clientes backoffice', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-08] Validar eventos Socket.IO (4 eventos) conforme contract', labels: ['interface-contract', 'core', 'fase2'], feature: FEATURES.batch1 },
  // Middleware tasks
  { summary: '[IC-09] Validar proxy /api/v1/* → Core com autenticação JWT', labels: ['interface-contract', 'middleware', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-10] Validar rate limiting e error handling no Gateway', labels: ['interface-contract', 'middleware', 'fase2'], feature: FEATURES.batch1 },
  // DigitalChannels tasks
  { summary: '[IC-11] Validar integração frontend com APIs via BFF', labels: ['interface-contract', 'digital-channels', 'fase2'], feature: FEATURES.batch1 },
  { summary: '[IC-12] Validar handling de eventos Socket.IO no frontend', labels: ['interface-contract', 'digital-channels', 'fase2'], feature: FEATURES.batch1 },
  // Transversal
  { summary: '[IC-13] Validar tipos partilhados (7 types) entre projectos', labels: ['interface-contract', 'transversal', 'fase2'], feature: FEATURES.batch2 },
];

function jiraRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
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
          reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`));
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
  console.log(`  ✓ ${result.key} — ${task.summary}`);
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

async function main() {
  console.log('=== Creating Interface Contract Tasks for BCTT-336 ===\n');

  const created = [];

  // Create tasks in batches of 3
  for (let i = 0; i < tasks.length; i += 3) {
    const batch = tasks.slice(i, i + 3);
    const results = await Promise.all(batch.map(t => createTask(t)));
    created.push(...results.map((r, idx) => ({ key: r.key, feature: batch[idx].feature })));
    // Small delay between batches
    if (i + 3 < tasks.length) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ ${created.length} tasks created\n`);

  // Link tasks to features
  console.log('=== Linking tasks to Features ===\n');
  for (const item of created) {
    try {
      await linkIssues(item.key, item.feature, 'Relates');
    } catch (e) {
      console.log(`  ⚠ Link failed: ${item.key} → ${item.feature}: ${e.message.substring(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n✅ Done! All tasks created and linked.');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
