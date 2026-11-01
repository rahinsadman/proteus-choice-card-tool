const assert = require('assert');
const handler = require('./index.js');

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end(data) { if (data) this.body = JSON.parse(data); return this; }
  };
  return res;
}

async function run() {
  console.log('Test 1: Discovery...');
  const res1 = mockRes();
  handler({ method: 'GET', url: '/discovery' }, res1);
  assert.strictEqual(res1.body.functions[0].ui_resource, 'ui://choice-card/template');
  assert.strictEqual(res1.getHeader('content-type'), 'application/vnd.optimizely.opal.tools.discovery+json');
  console.log('✅ Discovery OK: ui_resource advertised with v2 discovery MIME type');

  console.log('Test 2: Resource Reader (POST /resources/read)...');
  const res2 = mockRes();
  handler({
    method: 'POST',
    url: '/resources/read',
    body: { uri: 'ui://choice-card/template' }
  }, res2);
  assert.strictEqual(res2.body.mimeType, 'application/vnd.opal.proteus+json');
  assert.ok(res2.body.text.includes('"path":"/prompt"'));
  console.log('✅ Resource Reader OK: returns Proteus template with Value/Map bindings');

  console.log('Test 3: Execute (POST /execute)...');
  const res3 = mockRes();
  handler({
    method: 'POST',
    url: '/execute',
    body: {
      prompt: 'Ready to proceed?',
      options: ['Yes', 'No'],
      subtitle: 'Please select one'
    }
  }, res3);
  console.log('✅ Execute OK. Response keys:', Object.keys(res3.body));
  console.log('ALL TESTS PASSED');
}

run();
