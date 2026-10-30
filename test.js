const assert = require('assert');
const handler = require('./api/index.js');

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
  console.log('--- TEST 1: Discovery Endpoint (GET /discovery) ---');
  const req1 = { method: 'GET', url: '/discovery' };
  const res1 = mockRes();
  await handler(req1, res1);

  assert.strictEqual(res1.statusCode, 200, 'Discovery should return status 200');
  assert.ok(Array.isArray(res1.body.functions), 'Discovery must contain functions array');
  assert.ok(Array.isArray(res1.body.tools), 'Discovery must contain tools array');
  
  const fn = res1.body.functions[0];
  assert.strictEqual(fn.name, 'show_choice_card');
  assert.strictEqual(fn.endpoint, '/execute');
  assert.ok(Array.isArray(fn.parameters), 'Parameters must be an array of objects');
  assert.strictEqual(fn.parameters[0].name, 'prompt');
  console.log('✅ TEST 1 PASSED: Discovery endpoint strictly conforms to Opal Registry format.');

  console.log('\n--- TEST 2: Execute Endpoint (POST /execute) with standard options ---');
  const req2 = {
    method: 'POST',
    url: '/execute',
    body: {
      prompt: 'Have you finished installing your agents from the Directory?',
      options: ['Done installing', 'Skip for now']
    }
  };
  const res2 = mockRes();
  await handler(req2, res2);

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.getHeader('content-type'), 'application/vnd.optimizely.opal.tools+json');
  assert.ok(res2.body.ui, 'Response must have ui field');
  assert.strictEqual(res2.body.ui.$type, 'Document');
  assert.strictEqual(res2.body.ui.appearance, 'inline');
  
  const bodyGroup = res2.body.ui.body[0];
  assert.strictEqual(bodyGroup.$type, 'Group');
  
  const textElem = bodyGroup.children[0];
  assert.strictEqual(textElem.$type, 'Text');
  assert.strictEqual(textElem.children, 'Have you finished installing your agents from the Directory?');
  
  const btnGroup = bodyGroup.children[1];
  assert.strictEqual(btnGroup.$type, 'Group');
  assert.strictEqual(btnGroup.children.length, 2);
  
  const btn1 = btnGroup.children[0];
  assert.strictEqual(btn1.$type, 'Button');
  assert.strictEqual(btn1.children, 'Done installing');
  assert.strictEqual(btn1.appearance, 'primary-opal');
  assert.deepStrictEqual(btn1.onClick, { message: 'Done installing' });
  
  const btn2 = btnGroup.children[1];
  assert.strictEqual(btn2.$type, 'Button');
  assert.strictEqual(btn2.children, 'Skip for now');
  assert.strictEqual(btn2.appearance, 'subtle');
  assert.deepStrictEqual(btn2.onClick, { message: 'Skip for now' });
  console.log('✅ TEST 2 PASSED: Execute endpoint generates valid Proteus Document with primary-opal & subtle buttons.');

  console.log('\n--- TEST 3: Edge cases (String options, Subtitle present) ---');
  const req3 = {
    method: 'POST',
    url: '/execute',
    body: {
      prompt: 'Confirm your list to send invites:',
      options: '["Yes, send it", "Add more people", "Change an entry", "Skip for now"]',
      subtitle: 'Accounts will be created immediately once confirmed.'
    }
  };
  const res3 = mockRes();
  await handler(req3, res3);

  assert.strictEqual(res3.statusCode, 200);
  const children = res3.body.ui.body[0].children;
  assert.strictEqual(children.length, 3, 'Should contain prompt, subtitle, and button group');
  assert.strictEqual(children[1].children, 'Accounts will be created immediately once confirmed.');
  
  const buttons = children[2].children;
  assert.strictEqual(buttons.length, 4);
  assert.strictEqual(buttons[0].appearance, 'primary-opal'); // 'Yes, send it'
  assert.strictEqual(buttons[2].appearance, 'subtle');       // 'Change an entry'
  assert.strictEqual(buttons[3].appearance, 'subtle');       // 'Skip for now'
  console.log('✅ TEST 3 PASSED: Options parsing and subtitle rendering work cleanly.');

  console.log('\n🎉 ALL UNIT TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
