import { chromium } from 'playwright';
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(x => x.includes('=')).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).trim()]; }));
fs.mkdirSync('.qa', { recursive: true });
let debugPage;
(async () => {
    const browser = await chromium.launch({ headless: true });
    const hc = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), ac = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const host = await hc.newPage(), attendee = await ac.newPage();
    debugPage=host;
    host.setDefaultTimeout(20000);
    attendee.setDefaultTimeout(20000);
    const errors = [];
    for (const p of [host, attendee])
        p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    const base = process.env.QA_BASE_URL || 'http://localhost:3000';
    const stamp = Date.now();
    const title = 'Collaboration QA ' + stamp;
    const previous = fs.existsSync('.qa/records.json') ? JSON.parse(fs.readFileSync('.qa/records.json', 'utf8')) : {};
    const metadata = { title, users: previous.users ?? [], retros: previous.retros ?? [] };
    function save() { fs.writeFileSync('.qa/records.json', JSON.stringify(metadata)); }
    async function identity(context) { const cs = (await context.cookies()).filter(c => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)); const v = cs.map(c => decodeURIComponent(c.value)).join(''); const session = JSON.parse(v.startsWith('base64-') ? Buffer.from(v.slice(7), 'base64url').toString() : v); const jwt = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString()); if (!metadata.users.includes(jwt.sub)) {
        metadata.users.push(jwt.sub);
        save();
    } return { token: session.access_token, id: jwt.sub }; }
    async function api(token, path, method = 'GET', body) { const r = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + path, { method, headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json() }; }
    await host.goto(base + '/?create=1');
    await host.getByRole('dialog').waitFor();
    await host.locator('#retro-full-name').fill('Guest Conversion QA');
    await host.locator('#retro-title').fill(title);
    await host.getByRole('dialog').getByRole('button', { name: 'Create retro', exact: true }).click();
    await host.waitForURL('**/?created=1');
    await host.getByRole('link', { name: title, exact: true }).waitFor();
    const guest = await identity(hc);
    await host.getByRole('link', { name: 'Open board →', exact: true }).first().click();
    await host.locator('.connected-board-toolbar').waitFor();
    const slug = new URL(host.url()).pathname.split('/').pop();
    const rr = await api(guest.token, 'retros?invite_slug=eq.' + slug);
    const rid = rr.data[0].id;
    metadata.retros.push(rid);
    metadata.slug = slug;
    save();
    await host.locator('.connected-board-toolbar').getByRole('button', { name: 'Add reflection', exact: true }).click();
    await host.locator('#connected-item-title').fill('Keep guest authorship');
    await host.getByRole('button', { name: 'Save reflection', exact: true }).click();
    await host.getByRole('dialog').waitFor({ state: 'hidden' });
    await host.getByRole('link', { name: 'Create an account', exact: true }).click();
    await host.getByRole('dialog').waitFor();
    const email = 'qa-retro-' + stamp + '@example.com';
    const password = 'QA_' + stamp + '_strong-pass';
    await host.locator('#name').fill('Registered Conversion QA');
    await host.locator('#email').fill(email);
    await host.locator('#password').fill(password);
    await host.getByRole('button', { name: 'Create account', exact: true }).click();
    await host.waitForURL(base+'/', { timeout: 30000 });
    await host.getByRole('link', { name: title, exact: true }).waitFor();
    const registered = await identity(hc);
    if (registered.id === guest.id)
        throw Error('identity not switched');
    const snap = await api(registered.token, 'rpc/retro_snapshot', 'POST', { slug });
    if (snap.data.retro.host_id !== registered.id || snap.data.items[0].author_id !== registered.id || snap.data.members.some(m => m.id === guest.id))
        throw Error('guest merge incomplete');
    const old = await api(guest.token, 'rpc/retro_snapshot', 'POST', { slug });
    if (old.data !== null)
        throw Error('old guest retains access');
    console.log('Guest signup preserves hosted history, ownership and authorship; old guest loses access');
    await host.getByRole('link', { name: 'Open board →', exact: true }).first().click();
    await host.locator('.connected-board-toolbar').waitFor();
    await hc.setOffline(true);
    await hc.setOffline(false);
    await host.getByRole('button', { name: 'Refresh', exact: true }).click();
    await host.locator('.connection-status').filter({ hasText: 'Live' }).waitFor({ timeout: 20000 });
    await host.getByText('Keep guest authorship', { exact: true }).waitFor();
    console.log('Reconnect refresh retains persisted board');
    const out = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + registered.token } });
    if (!out.ok)
        throw Error('signout failed');
    await hc.clearCookies();
    await host.goto(base + '/?auth=login');
    await host.getByRole('dialog').waitFor();
    await host.locator('#email').fill(email);
    await host.locator('#password').fill(password);
    await host.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
    await host.waitForURL(base+'/');
    await host.getByRole('link', { name: title, exact: true }).waitFor();
    console.log('Registered password login opens dashboard and retains history');
    const signedin = await identity(hc);
    await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + signedin.token } });
    if (errors.length)
        throw Error(errors.join(';'));
    await browser.close();
    console.log('GUEST CONVERSION E2E PASSED');
})().catch(async e => { console.error(e); if(debugPage){console.log('failed URL',debugPage.url());console.log('alerts',await debugPage.getByRole('alert').allTextContents());await debugPage.screenshot({path:'.qa/failed.png',fullPage:true});}process.exit(1); });
