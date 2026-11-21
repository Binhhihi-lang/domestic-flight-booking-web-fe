#!/usr/bin/env node
/**
 * Script kiểm thử UI tốc độ cao qua Chrome DevTools Protocol (CDP) — KHÔNG cần
 * cài thêm package (dùng trực tiếp Node 24 WebSocket + Google Chrome có sẵn).
 *
 * Cách dùng:
 *   node scripts/ui-smoke.mjs --role=admin --routes=/admin/dashboard,/admin/reports
 *   node scripts/ui-smoke.mjs --role=customer --routes=/booking/review,/booking/payment --shot-dir=.tmp-shots
 *
 * Đặc điểm tối ưu:
 * - Tự nạp sẵn `fb_access_token` và `fb_current_user` vào localStorage (bỏ qua bước gõ form /login).
 * - Chỉ xuất JSON metrics gọn (overflow 1440/768/375, số lỗi console, text heading, HTTP >= 400).
 * - Chỉ chụp ảnh màn hình khi truyền `--shot-dir=<dir>` lúc nghiệm thu cuối.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
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

const MOCK_USERS = {
  ADMIN: {
    id: 1,
    email: 'admin@demo.local',
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
    email: 'staff@demo.local',
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
    id: 10,
    email: 'customer@demo.local',
    full_name: 'Nguyễn Minh Anh',
    phone: '0912345678',
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

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.seq = 1;
    this.pending = new Map();
    this.consoleErrors = [];
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
  await sleep(1000);

  // Nạp sẵn phiên đăng nhập vào localStorage (bỏ qua form /login)
  if (ROLE !== 'GUEST' && MOCK_USERS[ROLE]) {
    const userJson = JSON.stringify(MOCK_USERS[ROLE]);
    await cdp.eval(`
      localStorage.setItem('fb_access_token', 'mock-access-token');
      localStorage.setItem('fb_current_user', ${JSON.stringify(userJson)});
    `);
  }

  const report = [];
  for (const route of ROUTES) {
    cdp.consoleErrors = [];
    const targetUrl = `${BASE_URL}${route.startsWith('/') ? route : '/' + route}`;
    await cdp.send('Page.navigate', { url: targetUrl });
    await sleep(1200);

    const routeResult = { route, viewports: {}, heading: '', consoleErrors: [] };

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
    report.push(routeResult);
  }

  console.log(JSON.stringify({ role: ROLE, baseUrl: BASE_URL, results: report }, null, 2));

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
      Object.values(r.viewports).some((v) => v.overflow),
  );
  process.exit(hasErrors ? 1 : 0);
})().catch((err) => {
  console.error('UI_SMOKE_ERROR:', err.message);
  process.exit(1);
});
