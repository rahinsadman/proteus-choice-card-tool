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
    end(data) { if (data) this.body = data; return this; }
  };
  return res;
}

async function runTests() {
  console.log('--- TEST 1: Discovery ---');
  const res1 = mockRes();
  handler({ method: 'GET', url: '/discovery' }, res1);
  assert.strictEqual(res1.body.functions[0].name, 'show_choice_card');
  console.log('✅ Discovery OK');

  console.log('--- TEST 2: String body (Vercel raw body) ---');
  const res2 = mockRes();
  handler({
    method: 'POST',
    url: '/execute',
    body: JSON.stringify({
      prompt: 'Ready to publish?',
      options: ['Publish', 'Add more']
    })
  }, res2);
  assert.ok(res2.body.message.includes('with 2 options'), 'Should have 2 options');
  assert.strictEqual(res2.body.ui.body[0].children[1].children.length, 2);
  console.log('✅ String body OK');

  console.log('--- TEST 3: Nested parameters envelope ---');
  const res3 = mockRes();
  handler({
    method: 'POST',
    url: '/execute',
    body: {
      parameters: {
        prompt: 'Nested prompt',
        options: ['Yes', 'No']
      }
    }
  }, res3);
  assert.ok(res3.body.message.includes('with 2 options'), 'Should parse nested parameters envelope');
  console.log('✅ Nested parameters envelope OK');
  
  console.log('🎉 ALL TESTS PASSED!');
}

runTests();
