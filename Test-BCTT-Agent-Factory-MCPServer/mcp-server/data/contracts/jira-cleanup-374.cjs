require('dotenv').config();
const https = require('https');

const baseUrl = process.env.JIRA_BASE_URL.trim();
const auth = Buffer.from(
  process.env.JIRA_USER_EMAIL.trim() + ':' + process.env.JIRA_API_TOKEN.trim()
).toString('base64');

const EPIC_KEY = 'BCTT-374';
const TASKS_TO_DELETE = [
  'BCTT-413', 'BCTT-414', 'BCTT-415', 'BCTT-416', 'BCTT-417',
  'BCTT-418', 'BCTT-419', 'BCTT-420', 'BCTT-421', 'BCTT-422',
  'BCTT-423', 'BCTT-424', 'BCTT-425'
];

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
        if (res.statusCode >= 400 && res.statusCode !== 404) {
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

async function main() {
  console.log(`=== Cleanup ${EPIC_KEY} ===\n`);

  // 1. Get attachments and comments from the Epic
  console.log('Phase 1: Reading Epic attachments & comments...');
  const issue = await jiraRequest('GET', `/rest/api/3/issue/${EPIC_KEY}?fields=attachment,comment`);

  // 2. Delete all attachments
  const attachments = issue.fields?.attachment || [];
  console.log(`  Found ${attachments.length} attachments`);
  for (const att of attachments) {
    try {
      await jiraRequest('DELETE', `/rest/api/3/attachment/${att.id}`);
      console.log(`  ✓ Deleted attachment: ${att.filename} (ID: ${att.id})`);
    } catch (e) {
      console.log(`  ⚠ Failed to delete attachment ${att.id}: ${e.message.substring(0, 80)}`);
    }
  }

  // 3. Delete all comments
  const comments = issue.fields?.comment?.comments || [];
  console.log(`\n  Found ${comments.length} comments`);
  for (const cmt of comments) {
    try {
      await jiraRequest('DELETE', `/rest/api/3/issue/${EPIC_KEY}/comment/${cmt.id}`);
      console.log(`  ✓ Deleted comment ID: ${cmt.id}`);
    } catch (e) {
      console.log(`  ⚠ Failed to delete comment ${cmt.id}: ${e.message.substring(0, 80)}`);
    }
  }

  // 4. Delete tasks
  console.log(`\nPhase 2: Deleting ${TASKS_TO_DELETE.length} tasks...`);
  for (const taskKey of TASKS_TO_DELETE) {
    try {
      await jiraRequest('DELETE', `/rest/api/3/issue/${taskKey}`);
      console.log(`  ✓ Deleted ${taskKey}`);
    } catch (e) {
      console.log(`  ⚠ Failed to delete ${taskKey}: ${e.message.substring(0, 80)}`);
    }
  }

  console.log(`\n✅ Cleanup complete!`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
