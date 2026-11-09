import { chromium } from 'playwright';
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(x => x.includes('=')).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).trim()]; }));
fs.mkdirSync('.qa', { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true });
    const hc = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), ac = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const host = await hc.newPage(), attendee = await ac.newPage();
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
    await host.locator('#retro-full-name').fill('QA Host ' + stamp);
    await host.locator('#retro-title').fill(title);
    if (!await host.getByRole('checkbox', { name: 'Allow guest login' }).isChecked())
        throw Error('guest default');
    await host.getByRole('dialog').getByRole('button', { name: 'Create retro', exact: true }).click();
    await host.waitForURL('**/?created=1');
    await host.getByRole('link', { name: title, exact: true }).waitFor();
    console.log('guest create returns dashboard/history');
    const hi = await identity(hc);
    await host.screenshot({ path: '.qa/dashboard.png', fullPage: true });
    await host.getByRole('link', { name: 'Open board →', exact: true }).first().click();
    await host.locator('.connected-board-toolbar').getByRole('button', { name: 'Add reflection', exact: true }).waitFor();
    const invite = host.url();
    const slug = new URL(invite).pathname.split('/').pop();
    metadata.slug = slug;
    const rr = await api(hi.token, 'retros?invite_slug=eq.' + slug);
    const rid = rr.data[0].id;
    metadata.retros.push(rid);
    save();
    console.log('host board opened');
    await attendee.goto(invite);
    await attendee.locator('#join-full-name').fill('QA Attendee ' + stamp);
    await attendee.getByRole('button', { name: 'Join as guest' }).click();
    await attendee.locator('.connected-board-toolbar').getByRole('button', { name: 'Add reflection', exact: true }).waitFor();
    const ai = await identity(ac);
    console.log('second guest joined');
    await host.locator('.connected-board-toolbar').getByRole('button', { name: 'Add reflection', exact: true }).click();
    await host.locator('#connected-item-title').fill('Shared reflection ' + stamp);
    await host.locator('#connected-item-description').fill('A real persisted note.');
    const sharedAt = Date.now();
    await host.getByRole('button', { name: 'Save reflection', exact: true }).click();
    await host.getByRole('dialog').waitFor({ state: 'hidden' });
    await attendee.getByText('Shared reflection ' + stamp, { exact: true }).waitFor({ timeout: 10000 });
    const sharedMs = Date.now() - sharedAt;
    console.log('reflection synchronized across browsers in', sharedMs, 'ms');
    if (sharedMs > 10000)
        throw Error('live updates too slow');
    const snap = await api(hi.token, 'rpc/retro_snapshot', 'POST', { slug });
    const item = snap.data.items.find(i => i.title === 'Shared reflection ' + stamp);
    const ticket = item.ticket_id;
    await attendee.getByRole('button', { name: 'Upvote ' + ticket, exact: true }).click();
    await host.getByRole('button', { name: 'Show 1 votes for ' + ticket, exact: true }).waitFor({ timeout: 10000 });
    console.log('vote synchronized');
    await attendee.getByRole('button', { name: ticket, exact: true }).click();
    await attendee.locator('#new-comment').fill('Comment from another attendee');
    await attendee.getByRole('button', { name: 'Post comment', exact: true }).click();
    await attendee.getByText('Comment from another attendee', { exact: true }).waitFor();
    await attendee.getByRole('button', { name: 'Upvote comment (0)', exact: true }).click();
    await attendee.getByRole('button', { name: 'Remove comment upvote (1)', exact: true }).waitFor();
    await attendee.getByRole('button', { name: 'Remove comment upvote (1)', exact: true }).click();
    await attendee.getByRole('button', { name: 'Upvote comment (0)', exact: true }).waitFor();
    await attendee.getByRole('button', { name: 'Close dialog', exact: true }).click();
    console.log('comment and comment vote/unvote persisted');
    await host.getByRole('button', { name: 'Add to Action items', exact: true }).click();
    await host.locator('#connected-item-title').fill('Host-only action ' + stamp);
    await host.getByRole('button', { name: 'Save action item', exact: true }).click();
    await host.getByRole('dialog').waitFor({ state: 'hidden' });
    await attendee.getByText('Host-only action ' + stamp, { exact: true }).waitFor({ timeout: 10000 });
    if (await attendee.getByRole('button', { name: 'Add to Action items', exact: true }).count())
        throw Error('attendee sees create action');
    const denied = await api(ai.token, 'rpc/retro_command', 'POST', { action: 'item_save', payload: { slug, kind: 'action', title: 'Should be denied' } });
    if (denied.status < 400)
        throw Error('attendee action write allowed');
    const hidden = await api(ai.token, 'retro_host_keys?retro_id=eq.' + rid);
    if (hidden.data.length)
        throw Error('host key exposed');
    console.log('attendee action write denied and host key hidden');
    await host.getByRole('button', { name: 'Show host key', exact: true }).click();
    await host.getByRole('textbox', { name: 'Host key', exact: true }).waitFor();
    await host.waitForFunction(() => document.querySelector('input[aria-label="Host key"]')?.value.length === 48);
    const key = await host.getByRole('textbox', { name: 'Host key', exact: true }).inputValue();
    await host.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await attendee.getByRole('button', { name: 'Claim host', exact: true }).click();
    await attendee.locator('#claim-host-key').fill(key);
    await attendee.getByRole('button', { name: 'Claim ownership', exact: true }).click();
    await attendee.getByRole('button', { name: 'Show host key', exact: true }).waitFor();
    await host.getByRole('button', { name: 'Claim host', exact: true }).waitFor({ timeout: 10000 });
    const stale = await api(hi.token, 'rpc/retro_command', 'POST', { action: 'claim_host', payload: { slug, key } });
    if (stale.status < 400)
        throw Error('old key reused');
    console.log('host transfer synchronized, previous key invalidated');
    await attendee.getByRole('button', { name: 'Retro settings', exact: true }).click();
    await attendee.getByRole('button', { name: 'Add 5 mins', exact: true }).click();
    await host.waitForFunction(() => !document.querySelector('[aria-label="Session time remaining"]').textContent.includes('No timer'));
    await attendee.getByText('Allow guest login', { exact: true }).click();
    await attendee.getByRole('button', { name: 'Save guest setting', exact: true }).click();
    await attendee.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log('host settings/timer persist');
    await attendee.getByRole('button', { name: 'Attendees (2)', exact: true }).click();
    await attendee.getByText('Online', { exact: true }).nth(1).waitFor({ timeout: 15000 });
    await attendee.getByRole('button', { name: 'Close dialog', exact: true }).click();
    console.log('private presence shows both online');
    await host.reload();
    await host.getByText('Shared reflection ' + stamp, { exact: true }).waitFor();
    await host.screenshot({ path: '.qa/board.png', fullPage: true });
    await host.getByRole('link', { name: 'Retrospace home', exact: true }).click();
    await host.getByRole('link', { name: title, exact: true }).waitFor();
    console.log('refresh and history persist');
    console.log('connection host', await attendee.locator('.connection-status').textContent());
    console.log('runtime errors', errors);
    if (errors.length)
        throw Error('runtime errors');
    const unsigned = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await unsigned.goto(invite);
    await unsigned.getByText('The host requires a registered account for this retrospective.', { exact: true }).waitFor();
    if (await unsigned.locator('#join-full-name').count())
        throw Error('guest-disabled invite offers guest join');
    console.log('guest-disabled invite requires registered login');
    const secret = await api(ai.token, 'retro_host_keys?retro_id=eq.' + rid);
    const race = await Promise.all([hi, ai].map(i => api(i.token, 'rpc/retro_command', 'POST', { action: 'claim_host', payload: { slug, key: secret.data[0].host_key } })));
    if (race.filter(r => r.status === 200).length !== 1 || race.filter(r => r.status === 403).length !== 1)
        throw Error('concurrent host claims not atomic');
    console.log('concurrent claims: exactly one winner');
    for (const i of [hi, ai])
        await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + i.token } });
    await browser.close();
    console.log('COLLABORATION E2E PASSED');
})().catch(e => { console.error(e); process.exit(1); });
