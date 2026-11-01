const assert = require('assert');
const handler = require('./index.js');
const discoveryHandler = require('./api/discovery.js');
const resourcesHandler = require('./api/resources.js');
const executeHandler = require('./api/execute.js');

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end(data) {
      if (data && !this.body) {
        try { this.body = JSON.parse(data); } catch(e) { this.body = data; }
      }
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('--- TEST 1: GET /discovery (Discovery Endpoint) ---');
  const res1 = mockRes();
  handler({ method: 'GET', url: '/discovery', headers: {} }, res1);
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.getHeader('content-type'), 'application/vnd.optimizely.opal.tools.discovery+json');
  assert.strictEqual(res1.body.functions[0].ui_resource, 'ui://choice-card/template');
  console.log('✅ TEST 1 PASSED: Discovery returns ui_resource with correct v2 discovery MIME type');

  console.log('\n--- TEST 2: POST /resources/read (Vercel Rewritten to /index.js) ---');
  // Simulating Vercel rewrite where req.url is /index.js but body has { uri: 'ui://choice-card/template' }
  const res2 = mockRes();
  handler({
    method: 'POST',
    url: '/index.js',
    headers: {},
    body: { uri: 'ui://choice-card/template' }
  }, res2);
  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.mimeType, 'application/vnd.opal.proteus+json');
  assert.strictEqual(res2.body.uri, 'ui://choice-card/template');
  const template = JSON.parse(res2.body.text);
  assert.strictEqual(template.$type, 'Document');
  assert.strictEqual(template.appearance, 'inline');
  console.log('✅ TEST 2 PASSED: Resource read dispatches even when URL was rewritten to /index.js');

  console.log('\n--- TEST 3: POST /execute (Tool Execution with Dual Data Binding) ---');
  const res3 = mockRes();
  handler({
    method: 'POST',
    url: '/index.js',
    headers: {},
    body: {
      prompt: 'Have you finished installing your agents from the Directory?',
      options: ['Done installing', 'Skip for now'],
      subtitle: 'Select an option to proceed with your onboarding.'
    }
  }, res3);
  assert.strictEqual(res3.statusCode, 200);
  assert.strictEqual(res3.getHeader('content-type'), 'application/vnd.optimizely.opal.tools+json');
  
  // Verify dual binding: top-level AND content
  assert.strictEqual(res3.body.prompt, 'Have you finished installing your agents from the Directory?');
  assert.strictEqual(res3.body.content.prompt, 'Have you finished installing your agents from the Directory?');
  assert.strictEqual(res3.body.options.length, 2);
  assert.strictEqual(res3.body.content.options.length, 2);
  assert.strictEqual(res3.body.options[0].appearance, 'primary-opal');
  assert.strictEqual(res3.body.options[1].appearance, 'subtle');
  console.log('✅ TEST 3 PASSED: Execute endpoint returns dual-layer binding payload (top-level and content)');

  console.log('\n--- TEST 4: Direct Serverless Function invocations (/api/discovery, /api/resources, /api/execute) ---');
  const res4a = mockRes();
  discoveryHandler({ method: 'GET', url: '/api/discovery', headers: {} }, res4a);
  assert.strictEqual(res4a.statusCode, 200);

  const res4b = mockRes();
  resourcesHandler({ method: 'POST', url: '/api/resources', headers: {}, body: { uri: 'ui://choice-card/template' } }, res4b);
  assert.strictEqual(res4b.statusCode, 200);

  const res4c = mockRes();
  executeHandler({ method: 'POST', url: '/api/execute', headers: {}, body: { prompt: 'Test?', options: ['Yes', 'No'] } }, res4c);
  assert.strictEqual(res4c.statusCode, 200);
  console.log('✅ TEST 4 PASSED: Direct /api/* serverless handlers work independently');

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
