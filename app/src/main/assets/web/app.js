const $ = (s) => document.querySelector(s);
const money = (n) => "৳" + Number(n || 0).toLocaleString("en-US");
const esc = (s) => String(s ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const dmy = (iso) => iso.split("-").reverse().join("/");
const longDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

const state = { entries: [], profile: { company: "OSCAR BANGLA CO LTD", name: "", role: "" } };
let store;
const COMPANIES = ['OSCAR BANGLA CO LTD', 'STELLA HAIR PRODUCTS CO LTD', 'KELLY HAIR PRODUCTS CO LTD'];
const norm = (c) => String(c || '').trim().toUpperCase();
function setSelect(sel, val) {                      // select a value, adding it if it is a legacy/custom name
  val = norm(val) || COMPANIES[0];
  if (![...sel.options].some((o) => o.value === val)) sel.add(new Option(val, val));
  sel.value = val;
}
['#eCompany', '#fCompany', '#pCompany'].forEach((id) => COMPANIES.forEach((c) => $(id).add(new Option(c, c))));
const coOf = (e) => norm(e.company) || norm(state.profile.company);

/* ---------- data layer: SQLite via native bridge (ConveyanceDb); localStorage only in a desktop browser preview ---------- */
function sqliteStore() {
  const db = window.ConveyanceDb;
  let cb = () => {};
  const emit = () => cb(JSON.parse(db.listEntries()), JSON.parse(db.getProfile()));
  return {
    mode: "sqlite", note: "Saved on this phone",
    subscribe(fn) { cb = fn; emit(); },
    async saveEntry(e) { db.saveEntry(JSON.stringify(e)); emit(); },
    async removeEntry(id) { db.deleteEntry(String(id)); emit(); },
    async saveProfile(p) { db.saveProfile(JSON.stringify(p)); emit(); }
  };
}
function browserStore() {
  const KEY = "conveyance.v1";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "{\"entries\":[],\"profile\":null}");
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  let cb = () => {};
  const emit = () => { const d = load(); cb(d.entries, d.profile); };
  return {
    mode: "browser", note: "Browser preview (not SQLite)",
    subscribe(fn) { cb = fn; emit(); },
    async saveEntry(e) {
      const d = load(); e = { ...e };
      if (e.id) d.entries = d.entries.map((x) => (x.id === e.id ? e : x));
      else { e.id = Date.now(); d.entries.push(e); }
      save(d); emit();
    },
    async removeEntry(id) { const d = load(); d.entries = d.entries.filter((x) => String(x.id) !== String(id)); save(d); emit(); },
    async saveProfile(p) { const d = load(); d.profile = p; save(d); emit(); }
  };
}
const sorted = () => [...state.entries].sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id));
const route = (e) => [e.from, e.to].filter(Boolean).join(" → ");

/* ---------- UI: entries ---------- */

function renderEntries() {
  const rows = sorted();
  $('#emptyMsg').hidden = rows.length > 0;
  $('#entryTable tbody').innerHTML = rows.map((e) => `<tr>
    <td>${dmy(e.date)}</td><td>${esc(coOf(e))}</td><td>${esc(e.head)}</td><td>${esc(route(e)) || '—'}</td>
    <td class="r">${money(e.amount)}</td>
    <td class="r"><button class="edit" data-edit="${esc(e.id)}">Edit</button> <button class="del" data-del="${esc(e.id)}">Delete</button></td></tr>`).join('');
}

function resetForm() {
  $('#entryForm').reset(); $('#eId').value = ''; $('#eDate').value = $('#eDate').dataset.last || today();
  setSelect($('#eCompany'), $('#eCompany').dataset.last || state.profile.company);
  $('#saveBtn').textContent = 'Add entry'; $('#cancelBtn').hidden = true;
}

$('#entryForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const e = {
    id: $('#eId').value ? Number($('#eId').value) : undefined, company: $('#eCompany').value, date: $('#eDate').value, head: $('#eHead').value.trim(),
    from: $('#eFrom').value.trim(), to: $('#eTo').value.trim(), purpose: $('#ePurpose').value.trim(),
    amount: Math.round(Number($('#eAmount').value))
  };
  $('#eDate').dataset.last = e.date; $('#eCompany').dataset.last = e.company;
  try { await store.saveEntry(e); resetForm(); } catch (err) { flash('Could not save: ' + err.message); }
});
$('#cancelBtn').onclick = resetForm;
$('#entryTable').addEventListener('click', async (ev) => {
  const ed = ev.target.dataset.edit, del = ev.target.dataset.del;
  if (ed) {
    const e = state.entries.find((x) => String(x.id) === ed); if (!e) return;
    $('#eId').value = e.id; $('#eDate').value = e.date; setSelect($('#eCompany'), coOf(e)); $('#eHead').value = e.head; $('#eFrom').value = e.from || '';
    $('#eTo').value = e.to || ''; $('#ePurpose').value = e.purpose || ''; $('#eAmount').value = e.amount;
    $('#saveBtn').textContent = 'Save changes'; $('#cancelBtn').hidden = false; scrollTo({ top: 0 });
  }
  if (del && confirm('Delete this entry?')) await store.removeEntry(del);
});

/* ---------- UI: report ---------- */
function renderReport() {
  const from = $('#fFrom').value, to = $('#fTo').value;
  const company = $('#fCompany').value;
  const rows = sorted().filter((e) => coOf(e) === company && (!from || e.date >= from) && (!to || e.date <= to));
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const days = new Set(rows.map((e) => e.date)).size;
  const byHead = {};
  rows.forEach((e) => { byHead[e.head] = (byHead[e.head] || 0) + e.amount; });
  const heads = Object.entries(byHead).sort((a, b) => b[1] - a[1]);
  const first = rows[0]?.date, last = rows[rows.length - 1]?.date;
  const p = state.profile, dash = '<span class="dash">—</span>';
  const now = new Date().toLocaleDateString('en-GB');

  $('#sheet').innerHTML = `
  <header>
    <div><h2>${esc(company)}</h2><div class="sub">Conveyance statement</div>
      <div class="range">${first ? `${longDate(first)} &nbsp;–&nbsp; ${longDate(last)}` : 'No entries in range'}</div></div>
    <div class="by">Prepared by<b>${esc(p.name)}</b>${esc(p.role)}</div>
  </header>
  <div class="top">
    <div><h3>Summary by head</h3>
      <table class="sum"><thead><tr><th>HEAD</th><th class="r">AMOUNT</th></tr></thead><tbody>
      ${heads.map(([h, v]) => `<tr><td>${esc(h)}</td><td class="r">${money(v)}</td></tr>`).join('') || `<tr><td colspan="2">${dash}</td></tr>`}
      </tbody></table></div>
    <div class="stats">
      <div class="stat"><small>Total spent</small><b>${money(total)}</b></div>
      <div class="stat"><small>Entries</small><b>${rows.length}</b></div>
      <div class="stat"><small>Days</small><b>${days}</b></div>
      <div class="stat"><small>Avg / day</small><b>${money(days ? Math.round(total / days) : 0)}</b></div>
    </div>
  </div>
  <h3>Transaction details</h3>
  <table class="tx"><thead><tr><th>SL</th><th>Date</th><th>Head</th><th>Route</th><th>Purpose of work</th><th class="r">Amount</th></tr></thead><tbody>
  ${rows.map((e, i) => `<tr><td>${i + 1}</td><td>${dmy(e.date)}</td><td class="head">${esc(e.head)}</td>
     <td>${esc(route(e)) || dash}</td><td>${esc(e.purpose) || dash}</td><td class="r"><b>${money(e.amount)}</b></td></tr>`).join('')}
  </tbody></table>
  <div class="grand"><span>GRAND TOTAL</span><span>${money(total)}</span></div>
  <div class="sign">
    <div><b>${esc(p.name)}</b><small>${esc(p.role)}</small><small>Prepared by</small></div>
    <div><span style="color:#555">Checked / Approved by</span><small>Signature &amp; date</small></div>
  </div>
  <div class="foot"><span>${esc(company)} · ${esc(p.name)}</span><span>Generated ${now}</span></div>`;
}

/* ---------- UI: profile, tabs, print ---------- */
$('#profileForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try { await store.saveProfile({ company: $('#pCompany').value.trim(), name: $('#pName').value.trim(), role: $('#pRole').value.trim() }); flash('Profile saved'); }
  catch (e) { flash('Could not save: ' + e.message); }
});
let defaultsSet = false;
function fillProfile() {
  state.profile.company = norm(state.profile.company) || COMPANIES[0];
  setSelect($('#pCompany'), state.profile.company);
  if (!defaultsSet) { defaultsSet = true; setSelect($('#eCompany'), state.profile.company); setSelect($('#fCompany'), state.profile.company); }
  $('#pName').value = state.profile.name; $('#pRole').value = state.profile.role; }

document.querySelectorAll('nav button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('nav button, .tab').forEach((x) => x.classList.remove('on'));
  b.classList.add('on'); $('#tab-' + b.dataset.tab).classList.add('on');
  if (b.dataset.tab === 'report') renderReport();
});
$('#fFrom').onchange = $('#fTo').onchange = $('#fCompany').onchange = renderReport;
$('#printBtn').onclick = () => {
  renderReport();
  if (window.ConveyanceDb) window.ConveyanceDb.print('Conveyance statement'); else window.print();
};

let t; function flash(m) { $('#status').textContent = m; clearTimeout(t); t = setTimeout(() => $('#status').textContent = store.note, 3000); }

/* ---------- boot ---------- */
(async function boot() {
  $('#eDate').value = today();
  store = window.ConveyanceDb ? sqliteStore() : browserStore();
  $('#status').textContent = store.note;
  store.subscribe((entries, profile) => {
    state.entries = entries;
    if (profile) { state.profile = { ...state.profile, ...profile }; }
    fillProfile(); renderEntries();
    if ($('#tab-report').classList.contains('on')) renderReport();
  });
})();
