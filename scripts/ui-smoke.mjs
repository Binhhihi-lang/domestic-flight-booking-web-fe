#!/usr/bin/env node
/**
 * Script kiểm thử UI & Fullstack API tốc độ cao qua Chrome DevTools Protocol (CDP)
 * — KHÔNG cần cài thêm package (dùng trực tiếp Node 24 WebSocket + Google Chrome).
 *
 * Cách dùng:
 *   node scripts/ui-smoke.mjs --role=admin --routes=/admin/dashboard,/admin/flights
 *   node scripts/ui-smoke.mjs --role=customer --routes=/,/flights,/lookup --shot-dir=.tmp-shots
 *   node scripts/ui-smoke.mjs --role=admin --auth-mode=mock --routes=/admin/dashboard
 *
 * Chế độ xác thực:
 * - Mặc định (`--auth-mode=live`): Gọi thật `POST <api-base>/auth/login` với tài khoản seed
 *   (`admin@flightbooking.local`, `staff@flightbooking.local`, `customer@flightbooking.local`)
 *   để lấy JWT thật nạp vào `fb_access_token` & `fb_current_user`.
 * - `--auth-mode=mock`: Nạp token giả (chỉ dùng khi test UI cô lập không bật Backend).
 *
 * Kiểm soát chất lượng bắt buộc:
 * - Theo dõi `Network.responseReceived` để bắt mọi HTTP status >= 400 (kể cả API lẫn asset).
 * - Theo dõi `Runtime.consoleAPICalled` (error) & `Runtime.exceptionThrown`.
 * - Kiểm tra `overflow: false` ở 1440x900, 768x1024, 375x812.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import path from 'path';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('Không tìm thấy chrome.exe. Hãy truyền biến môi trường CHROME_PATH.');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...rest] = arg.replace(/^--/, '').split('=');
    return [k, rest.join('=') || 'true'];
  }),
);

const BASE_URL = args.base || 'http://localhost:4200';
const API_BASE = (args['api-base'] || 'http://localhost:8080/api').replace(/\/$/, '');
const AUTH_MODE = (args['auth-mode'] || 'live').toLowerCase();
const ROLE = (args.role || 'admin').toUpperCase();
const ROUTES = (args.routes || '/').split(',').map((r) => r.trim()).filter(Boolean);
const VIEWPORTS = (args.viewports || '1440x900,768x1024,375x812')
  .split(',')
  .map((vp) => {
    const [w, h] = vp.split('x').map(Number);
    return { width: w || 1440, height: h || 900 };
  });
const SHOT_DIR = args['shot-dir'] ? path.resolve(args['shot-dir']) : null;
const PORT = Number(args.port || (9230 + Math.floor(Math.random() * 400)));

const SEED_CREDENTIALS = {
  ADMIN: {
    email: process.env.SMOKE_ADMIN_EMAIL || 'admin@flightbooking.local',
    password: process.env.SMOKE_ADMIN_PASSWORD || 'Admin@12345',
  },
  STAFF: {
    email: process.env.SMOKE_STAFF_EMAIL || 'staff@flightbooking.local',
    password: process.env.SMOKE_STAFF_PASSWORD || 'Staff@12345',
  },
  CUSTOMER: {
    email: process.env.SMOKE_CUSTOMER_EMAIL || 'customer@flightbooking.local',
    password: process.env.SMOKE_CUSTOMER_PASSWORD || 'Customer@12345',
  },
};

const MOCK_USERS = {
  ADMIN: {
    id: 1,
    email: 'admin@flightbooking.local',
    full_name: 'Quản trị viên',
    phone: '0901234567',
    avatar_url: null,
    status: 'ACTIVE',
    roles: ['ADMIN'],
    permissions: [
      'PROFILE_READ_SELF',
      'PROFILE_UPDATE_SELF',
      'BOOKING_READ_SELF',
      'NOTIFICATION_READ_SELF',
      'FLIGHT_READ',
      'FLIGHT_CREATE',
      'FLIGHT_UPDATE',
      'BOOKING_READ',
      'DASHBOARD_READ_OPERATIONAL',
      'DASHBOARD_READ',
      'USER_READ',
    ],
  },
  STAFF: {
    id: 2,
    email: 'staff@flightbooking.local',
    full_name: 'Nhân viên vận hành',
    phone: '0912345678',
    avatar_url: null,
    status: 'ACTIVE',
    roles: ['STAFF'],
    permissions: [
      'PROFILE_READ_SELF',
      'PROFILE_UPDATE_SELF',
      'BOOKING_READ_SELF',
      'NOTIFICATION_READ_SELF',
      'FLIGHT_READ',
      'FLIGHT_UPDATE',
      'BOOKING_READ',
      'DASHBOARD_READ_OPERATIONAL',
    ],
  },
  CUSTOMER: {
    id: 3,
    email: 'customer@flightbooking.local',
    full_name: 'Nguyễn Minh Hoàng',
    phone: '0987654321',
    avatar_url: null,
    status: 'ACTIVE',
    roles: ['CUSTOMER'],
    permissions: [
      'PROFILE_READ_SELF',
      'PROFILE_UPDATE_SELF',
      'BOOKING_READ_SELF',
      'NOTIFICATION_READ_SELF',
      'PAYMENT_CREATE',
      'PAYMENT_READ_SELF',
      'ETICKET_READ_SELF',
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function postJson(url, payload) {
  const body = JSON.stringify(payload);
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      parsed,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.seq = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.httpErrors = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.consoleErrors.push(
          (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '),
        );
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params?.exceptionDetails?.text || 'Uncaught exception');
      } else if (msg.method === 'Network.responseReceived') {
        const resp = msg.params?.response;
        if (resp && resp.status >= 400 && !resp.url?.endsWith('/favicon.ico')) {
          this.httpErrors.push(`${resp.status} ${resp.url}`);
        }
      } else if (msg.method === 'Network.loadingFailed') {
        const errorText = msg.params?.errorText || 'net::FAILED';
        if (errorText !== 'net::ERR_ABORTED') {
          this.httpErrors.push(`FAILED ${msg.params?.type || ''} ${errorText}`.trim());
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

(async () => {
  let liveSession = null;
  if (ROLE !== 'GUEST' && AUTH_MODE === 'live' && SEED_CREDENTIALS[ROLE]) {
    const creds = SEED_CREDENTIALS[ROLE];
    const loginRes = await postJson(`${API_BASE}/auth/login`, creds);
    if (loginRes.status !== 200 || !loginRes.body?.data?.access_token) {
      throw new Error(
        `Đăng nhập thật thất bại cho role=${ROLE} (${creds.email}): HTTP ${loginRes.status} ${JSON.stringify(loginRes.body)}`,
      );
    }
    liveSession = loginRes.body.data;
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vinafly-cdp-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
      BASE_URL,
    ],
    { stdio: 'ignore' },
  );

  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
      if (Array.isArray(targets) && targets.length > 0) break;
    } catch {
      // retry
    }
    await sleep(250);
  }
  if (!targets || targets.length === 0) {
    chrome.kill();
    throw new Error(`Không kết nối được Chrome CDP trên cổng ${PORT}`);
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await sleep(1000);

  if (ROLE !== 'GUEST') {
    if (liveSession) {
      const userJson = JSON.stringify(liveSession.user);
      await cdp.eval(`
        localStorage.setItem('fb_access_token', ${JSON.stringify(liveSession.access_token)});
        localStorage.setItem('fb_current_user', ${JSON.stringify(userJson)});
      `);
    } else if (AUTH_MODE === 'mock' && MOCK_USERS[ROLE]) {
      const userJson = JSON.stringify(MOCK_USERS[ROLE]);
      await cdp.eval(`
        localStorage.setItem('fb_access_token', 'mock-access-token');
        localStorage.setItem('fb_current_user', ${JSON.stringify(userJson)});
      `);
    }
  }

  const report = [];
  for (const route of ROUTES) {
    cdp.consoleErrors = [];
    cdp.httpErrors = [];
    const targetUrl = `${BASE_URL}${route.startsWith('/') ? route : '/' + route}`;
    await cdp.send('Page.navigate', { url: targetUrl });
    await sleep(1400);

    const routeResult = {
      route,
      viewports: {},
      heading: '',
      consoleErrors: [],
      httpErrors: [],
    };

    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768,
      });
      await sleep(300);

      const metrics = await cdp.eval(`
        (() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          heading: (document.querySelector('h1, h2')?.textContent || '').trim(),
          url: window.location.pathname,
        }))()
      `);
      routeResult.heading = metrics.heading;
      routeResult.actualPath = metrics.url;
      routeResult.viewports[`${vp.width}x${vp.height}`] = {
        overflow: metrics.overflow,
        scrollWidth: metrics.scrollWidth,
        innerWidth: metrics.innerWidth,
      };

      if (SHOT_DIR && (vp.width === 1440 || vp.width === 375)) {
        const slug = route.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
        await cdp.screenshot(path.join(SHOT_DIR, `${slug}-${vp.width}.png`));
      }
    }

    routeResult.consoleErrors = [...cdp.consoleErrors];
    routeResult.httpErrors = [...cdp.httpErrors];
    report.push(routeResult);
  }

  console.log(
    JSON.stringify({ role: ROLE, authMode: AUTH_MODE, baseUrl: BASE_URL, results: report }, null, 2),
  );

  cdp.close();
  chrome.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup lock on Windows
  }

  const hasErrors = report.some(
    (r) =>
      r.consoleErrors.length > 0 ||
      r.httpErrors.length > 0 ||
      Object.values(r.viewports).some((v) => v.overflow),
  );
  process.exit(hasErrors ? 1 : 0);
})().catch((err) => {
  console.error('UI_SMOKE_ERROR:', err.message);
  process.exit(1);
});
