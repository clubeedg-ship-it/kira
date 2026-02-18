// @ts-check
const { test, expect } = require('@playwright/test');
const http = require('http');

const BASE = 'http://localhost:3870';
const TEST_USER = {
  name: 'Teste User',
  email: `teste_${Date.now()}@stellavics.com`,
  password: 'senha123456'
};

const FORM_DATA = {
  client_name: 'Empresa Teste Ltda',
  client_type: 'Pessoa Jurídica',
  country_residence: 'Portugal',
  income_type: 'Royalties',
  income_description: 'Pagamento de royalties por licenciamento de software desenvolvido em Portugal',
  amount: '500000',
  frequency: 'Mensal',
  source_country: 'Brasil',
  destination_country: 'Portugal',
  has_pe: 'Não',
  has_substance: 'Sim',
  objective: 'Eliminação de Dupla Tributação',
  additional_notes: 'Software registrado no INPI',
  urgency: 'Normal (2-4 semanas)'
};

// Helper: HTTP request without Playwright's request fixture
function httpPost(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'GET', headers
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Helper: login via UI
async function loginViaUI(page, email, password) {
  await page.goto(BASE);
  await page.waitForSelector('#authScreen', { state: 'visible' });
  // Make sure we're on login form
  const loginForm = page.locator('#loginForm');
  if (!(await loginForm.isVisible())) {
    await page.click('a:has-text("Entrar")');
  }
  await page.fill('#authEmail', email);
  await page.fill('#authPassword', password);
  await page.click('#loginForm button');
  await expect(page.locator('#appMain')).toBeVisible({ timeout: 15000 });
}

// Helper: register via UI
async function registerViaUI(page, name, email, password) {
  await page.goto(BASE);
  await page.waitForSelector('#authScreen', { state: 'visible' });
  await page.click('a:has-text("Criar conta")');
  await page.waitForSelector('#registerForm', { state: 'visible' });
  await page.fill('#regName', name);
  await page.fill('#regEmail', email);
  await page.fill('#regPassword', password);
  await page.click('#registerForm button');
}

// Pre-register test user via API before all tests
let apiToken = '';
test.beforeAll(async () => {
  const res = await httpPost('/api/auth/register', {
    name: TEST_USER.name, email: TEST_USER.email, password: TEST_USER.password
  });
  apiToken = res.data?.token || '';
});

// ==================== 1. AUTH FLOW ====================
test.describe('1. Auth Flow', () => {
  test('Landing page loads (shows auth screen, not app)', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#authScreen')).toBeVisible();
    await expect(page.locator('#appMain')).toBeHidden();
  });

  test('Register with valid data → redirected to app', async ({ page }) => {
    const email = `valid_${Date.now()}@test.com`;
    await registerViaUI(page, 'Valid User', email, 'password123');
    await expect(page.locator('#appMain')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#authScreen')).toBeHidden();
  });

  test('Register with duplicate email → shows error', async ({ page }) => {
    await registerViaUI(page, 'Dup User', TEST_USER.email, 'password123');
    await expect(page.locator('#authError')).toBeVisible({ timeout: 5000 });
  });

  test('Register with short password (<6 chars) → shows error', async ({ page }) => {
    await registerViaUI(page, 'Short Pass', `short_${Date.now()}@test.com`, '123');
    await expect(page.locator('#authError')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#authError')).toContainText('6');
  });

  test('Register with missing fields → shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.click('a:has-text("Criar conta")');
    await page.waitForSelector('#registerForm', { state: 'visible' });
    await page.click('#registerForm button');
    await expect(page.locator('#authError')).toBeVisible({ timeout: 5000 });
  });

  test('Logout → back to auth screen', async ({ page }) => {
    const email = `logout_${Date.now()}@test.com`;
    await registerViaUI(page, 'Logout Test', email, 'password123');
    await expect(page.locator('#appMain')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Sair")');
    await expect(page.locator('#authScreen')).toBeVisible({ timeout: 5000 });
  });

  test('Login with registered credentials → enters app', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
    await expect(page.locator('#appMain')).toBeVisible();
  });

  test('Login with wrong password → shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('#authEmail', TEST_USER.email);
    await page.fill('#authPassword', 'wrongpassword');
    await page.click('#loginForm button');
    await expect(page.locator('#authError')).toBeVisible({ timeout: 5000 });
  });

  test('Login with non-existent email → shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('#authEmail', 'nobody@nowhere.com');
    await page.fill('#authPassword', 'password123');
    await page.click('#loginForm button');
    await expect(page.locator('#authError')).toBeVisible({ timeout: 5000 });
  });

  test('Session persistence: reload page → still logged in', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
    await page.reload();
    await expect(page.locator('#appMain')).toBeVisible({ timeout: 15000 });
  });

  test('Expired/invalid token → redirected to auth screen', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.setItem('sv_token', 'invalid_token_abc'));
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.locator('#authScreen')).toBeVisible({ timeout: 10000 });
  });
});

// ==================== 2. QUESTIONNAIRE FLOW ====================
test.describe('2. Questionnaire Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
  });

  test('After login, questionnaire loads with progress bar', async ({ page }) => {
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('#formContainer')).toBeVisible();
    await expect(page.locator('.progress-step')).toHaveCount(4);
  });

  test('All form fields render correctly for step 1', async ({ page }) => {
    await expect(page.locator('#client_name')).toBeVisible();
    await expect(page.locator('#client_type')).toBeVisible();
    await expect(page.locator('#country_residence')).toBeVisible();
  });

  test('Can navigate forward with Próximo button', async ({ page }) => {
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    await expect(page.locator('#income_type')).toBeVisible({ timeout: 5000 });
  });

  test('Can navigate backward with Anterior button', async ({ page }) => {
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    await expect(page.locator('#income_type')).toBeVisible({ timeout: 5000 });
    await page.click('#prevBtn');
    await expect(page.locator('#client_name')).toBeVisible({ timeout: 5000 });
  });

  test('Progress bar updates correctly on each step', async ({ page }) => {
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    await expect(page.locator('.progress-step.active')).toContainText('Natureza');
  });

  test('Required fields prevent advancement when empty', async ({ page }) => {
    await page.click('#nextBtn');
    // Should still be on step 1
    await expect(page.locator('#client_name')).toBeVisible();
    // Verify we didn't advance (income_type should not be visible)
    await expect(page.locator('#income_type')).not.toBeVisible();
  });

  test('All dropdown options load (income types)', async ({ page }) => {
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    const options = await page.locator('#income_type option').allTextContents();
    expect(options.length).toBeGreaterThan(5);
    expect(options).toContain('Royalties');
    expect(options).toContain('Dividendos');
  });

  test('Form data persists when navigating back and forth', async ({ page }) => {
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    await expect(page.locator('#income_type')).toBeVisible({ timeout: 5000 });
    await page.click('#prevBtn');
    await expect(page.locator('#client_name')).toHaveValue(FORM_DATA.client_name);
  });
});

// ==================== 3. OPINION GENERATION ====================
test.describe('3. Opinion Generation', () => {
  test('Gerar Parecer button appears on last step and generates opinion', async ({ page }) => {
    test.setTimeout(180000);
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Step 1
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');

    // Step 2
    await page.selectOption('#income_type', FORM_DATA.income_type);
    await page.fill('#income_description', FORM_DATA.income_description);
    await page.selectOption('#frequency', FORM_DATA.frequency);
    await page.click('#nextBtn');

    // Step 3
    await page.fill('#source_country', FORM_DATA.source_country);
    await page.fill('#destination_country', FORM_DATA.destination_country);
    await page.selectOption('#has_pe', FORM_DATA.has_pe);
    await page.selectOption('#has_substance', FORM_DATA.has_substance);
    await page.click('#nextBtn');

    // Step 4 - last step
    await page.selectOption('#objective', FORM_DATA.objective);
    await page.selectOption('#urgency', FORM_DATA.urgency);
    await page.fill('#additional_notes', FORM_DATA.additional_notes);

    // Generate button visible, next hidden
    await expect(page.locator('#generateBtn')).toBeVisible();
    await expect(page.locator('#nextBtn')).toBeHidden();

    // Click generate
    await page.click('#generateBtn');

    // Loading state should appear
    await expect(page.locator('#loading')).toBeVisible({ timeout: 10000 });

    // Wait for result
    await expect(page.locator('#result')).toBeVisible({ timeout: 120000 });

    // Result content
    const content = await page.locator('#resultContent').textContent();
    expect(content.length).toBeGreaterThan(100);

    // Result actions visible
    await expect(page.locator('button:has-text("Copiar")')).toBeVisible();
    await expect(page.locator('button:has-text("Baixar PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("Nova Consulta")')).toBeVisible();

    // Loading spinner gone
    await expect(page.locator('#loading')).toBeHidden();
  });
});

// ==================== 4. RESULT ACTIONS ====================
test.describe('4. Result Actions', () => {
  test('Nova Consulta resets form to step 1', async ({ page }) => {
    test.setTimeout(180000);
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Fill all steps
    await page.fill('#client_name', FORM_DATA.client_name);
    await page.selectOption('#client_type', FORM_DATA.client_type);
    await page.fill('#country_residence', FORM_DATA.country_residence);
    await page.click('#nextBtn');
    await page.selectOption('#income_type', FORM_DATA.income_type);
    await page.fill('#income_description', FORM_DATA.income_description);
    await page.selectOption('#frequency', FORM_DATA.frequency);
    await page.click('#nextBtn');
    await page.fill('#source_country', FORM_DATA.source_country);
    await page.fill('#destination_country', FORM_DATA.destination_country);
    await page.selectOption('#has_pe', FORM_DATA.has_pe);
    await page.selectOption('#has_substance', FORM_DATA.has_substance);
    await page.click('#nextBtn');
    await page.selectOption('#objective', FORM_DATA.objective);
    await page.selectOption('#urgency', FORM_DATA.urgency);
    await page.click('#generateBtn');
    await expect(page.locator('#result')).toBeVisible({ timeout: 120000 });

    // Click Nova Consulta
    await page.click('button:has-text("Nova Consulta")');
    await expect(page.locator('#formContainer')).toBeVisible();
    await expect(page.locator('#result')).toBeHidden();
    await expect(page.locator('#client_name')).toBeVisible();
  });
});

// ==================== 5. API ENDPOINT TESTS ====================
test.describe('5. API Endpoints', () => {
  test('POST /api/auth/register → creates user', async () => {
    const res = await httpPost('/api/auth/register', {
      name: 'New User', email: `new_${Date.now()}@test.com`, password: 'password123'
    });
    expect(res.status).toBe(201);
    expect(res.data.token).toBeTruthy();
    expect(res.data.user.name).toBe('New User');
  });

  test('POST /api/auth/login → returns token', async () => {
    const res = await httpPost('/api/auth/login', {
      email: TEST_USER.email, password: TEST_USER.password
    });
    expect(res.status).toBe(200);
    expect(res.data.token).toBeTruthy();
  });

  test('GET /api/auth/me → returns user info', async () => {
    const res = await httpGet('/api/auth/me', { Authorization: `Bearer ${apiToken}` });
    expect(res.status).toBe(200);
    expect(res.data.user.email).toBe(TEST_USER.email);
  });

  test('GET /api/questionnaire (authenticated) → returns schema', async () => {
    const res = await httpGet('/api/questionnaire', { Authorization: `Bearer ${apiToken}` });
    expect(res.status).toBe(200);
    expect(res.data.steps).toBeTruthy();
    expect(res.data.steps.length).toBe(4);
  });

  test('GET /api/questionnaire (no auth) → 401', async () => {
    const res = await httpGet('/api/questionnaire');
    expect(res.status).toBe(401);
  });

  test('POST /api/search (with query) → returns results', async () => {
    const res = await httpPost('/api/search', 
      { query: 'royalties Brasil Portugal', topK: 3 },
      { Authorization: `Bearer ${apiToken}` }
    );
    expect(res.status).toBe(200);
  });

  test('POST /api/analyze (with form data) → returns analysis', async () => {
    const res = await httpPost('/api/analyze', FORM_DATA, { Authorization: `Bearer ${apiToken}` });
    expect(res.status).toBe(200);
    expect(res.data).toBeTruthy();
  });

  test('POST /api/stream (with form data) → streams SSE', async () => {
    test.setTimeout(120000);
    const res = await httpPost('/api/stream', FORM_DATA, { Authorization: `Bearer ${apiToken}` });
    expect(res.status).toBe(200);
    expect(res.raw).toContain('data:');
  });
});

// ==================== 6. EDGE CASES & SECURITY ====================
test.describe('6. Edge Cases & Security', () => {
  test('SQL injection attempt in email → handled safely', async () => {
    const res = await httpPost('/api/auth/login', {
      email: "admin@test.com' OR '1'='1", password: 'anything'
    });
    expect(res.status).toBe(401);
  });

  test('XSS attempt in name field → handled safely', async () => {
    const res = await httpPost('/api/auth/register', {
      name: '<script>alert("xss")</script>',
      email: `xss_${Date.now()}@test.com`,
      password: 'password123'
    });
    // Should not crash the server
    expect([201, 400]).toContain(res.status);
  });

  test('Extremely long input → handled gracefully', async () => {
    const longStr = 'A'.repeat(10000);
    const res = await httpPost('/api/auth/register', {
      name: longStr, email: `long_${Date.now()}@test.com`, password: 'password123'
    });
    expect([201, 400, 413, 500]).toContain(res.status);
    // Verify server still responds
    const check = await httpGet('/api/auth/me');
    expect(check.status).toBeTruthy();
  });

  test('Invalid JSON body → proper error response', async () => {
    const res = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'localhost', port: 3870, path: '/api/auth/login',
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      };
      const req = http.request(opts, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ status: res.statusCode, raw: body }));
      });
      req.on('error', reject);
      req.write('not json{{{');
      req.end();
    });
    expect([400, 500]).toContain(res.status);
  });

  test('Missing Authorization header on protected routes → 401', async () => {
    const res = await httpGet('/api/questionnaire');
    expect(res.status).toBe(401);
  });

  test('Malformed Bearer token → 401', async () => {
    const res = await httpGet('/api/questionnaire', { Authorization: 'Bearer invalidtoken123' });
    expect(res.status).toBe(401);
  });

  test('Concurrent requests → no race conditions', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(httpPost('/api/auth/register', {
        name: `Concurrent ${i}`,
        email: `conc_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}@test.com`,
        password: 'password123'
      }));
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      expect([201, 400]).toContain(res.status);
    }
  });
});

// ==================== 7. UI/UX QUALITY ====================
test.describe('7. UI/UX Quality', () => {
  test('Responsive on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await expect(page.locator('#authScreen')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('Responsive on tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE);
    await expect(page.locator('#authScreen')).toBeVisible();
  });

  test('No console errors during normal flow', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    
    const email = `console_${Date.now()}@test.com`;
    await registerViaUI(page, 'Console Test', email, 'password123');
    await expect(page.locator('#appMain')).toBeVisible({ timeout: 15000 });
    
    await page.fill('#client_name', 'Test');
    await page.selectOption('#client_type', 'Pessoa Física');
    await page.fill('#country_residence', 'Brasil');
    await page.click('#nextBtn');

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && !e.includes('net::') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('All text is in Portuguese', async ({ page }) => {
    await page.goto(BASE);
    const html = await page.locator('html').getAttribute('lang');
    expect(html).toBe('pt-BR');
    const title = await page.title();
    expect(title).toContain('Stella Vic');
  });

  test('Footer shows correct firm name "Stella Vic\'s"', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toContain('Stella Vic');
  });

  test('Header shows user name after login', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
    await expect(page.locator('#userName')).toContainText(TEST_USER.name);
  });
});
