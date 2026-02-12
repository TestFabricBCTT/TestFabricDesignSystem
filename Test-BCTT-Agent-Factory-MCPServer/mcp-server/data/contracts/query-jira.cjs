require('dotenv').config();
const https = require('https');
const baseUrl = process.env.JIRA_BASE_URL.trim();
const auth = Buffer.from(process.env.JIRA_USER_EMAIL.trim() + ':' + process.env.JIRA_API_TOKEN.trim()).toString('base64');
const postData = JSON.stringify({ jql: 'parent = BCTT-336 ORDER BY issuetype ASC', maxResults: 50, fields: ['summary','issuetype','status','labels'] });
const url = new URL(baseUrl + '/rest/api/3/search/jql');
const options = { method: 'POST', headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
const req = https.request(url, options, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode !== 200) { console.log('Status:', res.statusCode, d.substring(0,500)); return; }
    const j = JSON.parse(d);
    console.log('Total:', j.total);
    (j.issues||[]).forEach(i => console.log(i.key, i.fields.issuetype.name.padEnd(10), i.fields.status.name.padEnd(20), i.fields.summary.substring(0,80), (i.fields.labels||[]).join(',')));
  });
});
req.on('error', e => console.error(e));
req.write(postData);
req.end();
