
const STORE = 'oceanCaseManagerV53StableFinalRecent'; const MANAGER_CODE = 'MANAGER123'; let activeView = 'dashboard', selectedId = null, selectedAuditId = null, queueFilter = 'all', editCaseId = null, showHistoryId = null, showCreditPanelId = null, overrideMode = false; let dashboardFilters = { caseId: '', source: '', customer: '', account: '', status: '', txnType: '', claimType: '', minAmount: '', maxAmount: '' }; let auditFilters = { caseId: '', source: '', customer: '', account: '', status: '', txnType: '', claimType: '', dailyDate: '', minAmount: '', maxAmount: '', amount: '' }; let ledgerFilters = { caseId: '', customer: '', account: '', amount: '' }; let recoveryFilters = { caseId: '', customer: '', account: '', amount: '' }; let chargebackFilters = { caseId: '', customer: '', account: '', amount: '' }; let managerFilters = { caseId: '', customer: '', account: '', amount: '', status: '' }; let queueSort = { field: 'noticeDate', direction: 'desc' }; let dashboardSort = { field: 'noticeDate', direction: 'desc' }; let auditSort = { field: 'noticeDate', direction: 'desc' }; let managerSort = { field: 'noticeDate', direction: 'desc' }; let ledgerSort = { field: 'date', direction: 'desc' }; const today = new Date('2026-06-22T12:00:00'); function now() { return new Date().toLocaleString() } function eventObj(text) { return { time: now(), text } } function commentObj(author, text) { return { time: now(), author, text } } function autoNotify(c, message) { c.comments = c.comments || []; c.events = c.events || []; let text = message + ' This notice/comment was generated automatically by O.C.E.A.N.'; c.comments.push(commentObj('O.C.E.A.N Auto-Notice', text)); c.events.push(eventObj('Automated customer notice/comment: ' + message)) }
function caseSuffix(id) { return String(id || '').replace(/^REG-E-/, '').replace(/^NON-E-/, '') || new Date().toISOString().slice(2, 10).replaceAll('-', '') + '-' + Math.floor(1000 + Math.random() * 9000) }
function desiredPrefix(c) { return classify(c).likelyRegE ? 'REG-E' : 'NON-E' }
function retagCaseId(c) { let prefix = desiredPrefix(c); let oldId = c.id || ''; let newId = prefix + '-' + caseSuffix(oldId); if (oldId !== newId) { let base = newId, step = 1; while (cases.some(x => x !== c && x.id === newId)) { newId = base + '-' + step; step++ } c.id = newId; c.events = c.events || []; c.events.push(eventObj('Case ID retagged from ' + oldId + ' to ' + newId + ' after classification change')); if (selectedId === oldId) selectedId = newId; if (selectedAuditId === oldId) selectedAuditId = newId; if (editCaseId === oldId) editCaseId = newId } return c.id }
function exportJsonFile(obj, filename) { let blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }); let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 100) }
function exportSelectedCaseJson() { let c = cur(); if (!c) { alert('No case selected.'); return } exportJsonFile(c, (c.id || 'case') + '.json') }
function exportAllCasesJson() { exportJsonFile({ exportedAt: new Date().toISOString(), caseCount: cases.length, cases: cases }, 'case-backup-' + new Date().toISOString().slice(0, 10) + '.json') }
function importCaseJsonPrompt() { let input = document.getElementById('jsonImportInput'); if (input) { input.value = ''; input.click() } }
async function importCasesJson(e) { let files = [...e.target.files]; if (!files.length) return; let imported = 0, failed = 0; for (let file of files) { try { let text = await file.text(); let data = JSON.parse(text); let list = Array.isArray(data) ? data : (Array.isArray(data.cases) ? data.cases : [data]); for (let item of list) { let c = normalizeImportedCase(item); retagCaseId(c); let idx = cases.findIndex(x => x.id === c.id); if (idx >= 0) { cases[idx] = c } else { cases.unshift(c) } imported++ } } catch (err) { console.error(err); failed++ } } save(); render(); alert('Imported ' + imported + ' case(s)' + (failed ? ' with ' + failed + ' file error(s).' : '')) }
function normalizeImportedCase(raw) {
  let txns = (raw.flaggedTransactions || raw.transactions || raw.claimTransactions || []).map((t, i) => ({ date: t.date || t.txnDate || raw.txnDate || raw.noticeDate || '', type: t.type || t.txnType || raw.txnType || 'Zelle / P2P', merchant: t.merchant || t.recipient || raw.merchant || '', amount: Number(t.amount || 0), primary: i === 0 })); if (!txns.length) { txns = [{ date: raw.txnDate || raw.transactionDate || raw.noticeDate || '', type: raw.txnType || raw.transactionType || 'Zelle / P2P', merchant: raw.merchant || raw.recipient || '', amount: Number(raw.amount || 0), primary: true }] }
  let first = txns[0]; let c = { id: raw.id || '', source: raw.source || 'Bank Mobile App', intakeOfficer: raw.intakeOfficer || raw.officer || 'Imported JSON', customer: raw.customer || raw.customerName || 'Imported Customer', account: raw.account || raw.accountNumber || '', txnType: first.type, claimType: raw.claimType || raw.reason || 'Unauthorized transaction', merchant: first.merchant, amount: transactionTotal(txns), txnDate: first.date, noticeDate: raw.noticeDate || raw.receivedDate || new Date().toISOString().slice(0, 10), openedDate: raw.openedDate || raw.openDate || raw.noticeDate || raw.receivedDate || new Date().toISOString().slice(0, 10), accountAge: raw.accountAge || 'Over 30 days', foreign: raw.foreign || 'No', createdAt: raw.createdAt || raw.created || '', openedBy: raw.openedBy || raw.intakeOfficer || '', deviceStatus: raw.deviceStatus || raw.accessDeviceStatus || 'Unknown', prior: Number(raw.prior || raw.priorDisputes || 0), statement: raw.statement || raw.customerStatement || '', flaggedTransactions: txns, status: raw.status || 'Officer Review Needed', officerDecision: raw.officerDecision || null, officerComment: raw.officerComment || '', provisional: !!raw.provisional, creditStatus: raw.creditStatus || 'No credit posted', finalDecision: raw.finalDecision || null, managerReviewed: !!raw.managerReviewed, auditReady: !!raw.auditReady, manualRegEStatus: raw.manualRegEStatus || 'Auto', manualInitialDays: raw.manualInitialDays || 'Auto', manualExtendedDays: raw.manualExtendedDays || 'Auto', manualRoute: raw.manualRoute || 'Auto', manualOverrideNote: raw.manualOverrideNote || '', provisionalLedger: Array.isArray(raw.provisionalLedger) ? raw.provisionalLedger : [], comments: Array.isArray(raw.comments) ? raw.comments : [], events: Array.isArray(raw.events) ? raw.events : [eventObj('Case imported from JSON')] }; if (!c.id) { c.id = desiredPrefix(c) + '-' + new Date().toISOString().slice(2, 10).replaceAll('-', '') + '-' + Math.floor(1000 + Math.random() * 9000) } c.events.push(eventObj('Case imported/normalized from JSON')); return c
}

const seed = [{ id: 'REG-E-260622-1001', source: 'Bank Mobile App', intakeOfficer: 'Mobile Intake', customer: 'Maria Alvarez', account: '3928149002', txnType: 'Debit Card POS', claimType: 'Unauthorized transaction', merchant: 'SUNSHINE ELECTRONICS MIAMI', amount: 884.27, txnDate: '2026-06-18', noticeDate: '2026-06-22', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Still in possession', prior: 0, statement: 'Customer still has card and says the purchase was not authorized.', flaggedTransactions: [{ date: '2026-06-18', type: 'Debit Card POS', merchant: 'SUNSHINE ELECTRONICS MIAMI', amount: 884.27, primary: true }, { date: '2026-06-19', type: 'Debit Card POS', merchant: 'SUNSHINE ELECTRONICS ONLINE', amount: 212.44, primary: false }], status: 'Officer Review Needed', officerDecision: null, officerComment: '', provisional: false, creditStatus: 'No credit posted', finalDecision: null, managerReviewed: false, auditReady: false, comments: [], events: [eventObj('Case created from bank mobile app')] }, { id: 'REG-E-260619-1002', source: 'Customer Phone Call', intakeOfficer: 'S. Sanz', customer: 'Darnell Brown', account: '7741200381', txnType: 'ATM Withdrawal', claimType: 'ATM cash not received', merchant: 'ATM HIALEAH', amount: 300, txnDate: '2026-06-17', noticeDate: '2026-06-19', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Unknown', prior: 1, statement: 'ATM showed error and did not dispense cash.', flaggedTransactions: [{ date: '2026-06-17', type: 'ATM Withdrawal', merchant: 'ATM HIALEAH', amount: 300, primary: true }], status: 'Final Decision Made - Customer Credited', officerDecision: 'Investigator agreed with machine', officerComment: 'Reg E investigation opened after customer phone notice.', provisional: true, creditStatus: 'Provisional credit made permanent', finalDecision: 'Customer credited permanently', managerReviewed: false, auditReady: false, comments: [commentObj('S. Sanz', 'Need ATM journal and cash balancing report.')], events: [eventObj('Case created from customer phone call'), eventObj('Investigator agreed with machine recommendation'), eventObj('Investigation started'), eventObj('Provisional credit posted'), eventObj('Final decision: customer keeps credit permanently')] }, { id: 'NON-E-260620-1003', source: 'Customer Phone Call', intakeOfficer: 'S. Sanz', customer: 'Jordan Lee', account: '6088123001', txnType: 'Check', claimType: 'Service not received', merchant: 'Local Contractor', amount: 1200, txnDate: '2026-06-14', noticeDate: '2026-06-20', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Unknown', prior: 0, statement: 'Customer paid by check and says service was not completed.', flaggedTransactions: [{ date: '2026-06-14', type: 'Check', merchant: 'Local Contractor', amount: 1200, primary: true }], status: 'Final Decision Made - Recover Credit', officerDecision: 'Investigator override', officerComment: 'Routed outside Reg E; check/service issue.', provisional: false, creditStatus: 'No customer credit due', finalDecision: 'Recover / reverse credit', managerReviewed: true, auditReady: true, comments: [commentObj('Manager', 'Reviewed as non-Reg E workflow example.')], events: [eventObj('Case created from customer phone call'), eventObj('Investigator overrode machine recommendation'), eventObj('Final decision: alternate workflow / no Reg E credit'), eventObj('Manager sign-off completed'), eventObj('Case marked closed')] }];
function loadCases() { try { let stored = JSON.parse(localStorage.getItem(STORE) || 'null'); if (Array.isArray(stored) && stored.length) return stored } catch (e) { console.warn('Storage load failed, using seed cases', e) } return JSON.parse(JSON.stringify(seed)) } let cases = loadCases(); selectedId = cases[0]?.id; function save() { try { localStorage.setItem(STORE, JSON.stringify(cases)) } catch (e) { console.warn('Storage save skipped:', e) } } function money(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) } function addBusinessDays(dateStr, days) { let d = new Date(dateStr + 'T12:00:00'), c = 0; while (c < days) { d.setDate(d.getDate() + 1); if (d.getDay() != 0 && d.getDay() != 6) c++ } return d.toISOString().slice(0, 10) } function addCalendarDays(dateStr, days) { let d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) } function daysUntil(dateStr) { return Math.ceil((new Date(dateStr + 'T12:00:00') - today) / 86400000) } function val(id) { let el = document.getElementById(id); return el ? el.value : '' } function cur() { return cases.find(c => c.id === selectedId) || cases[0] }
function currentDateISO() { return new Date().toISOString().slice(0, 10) }
function accountProfile(acct) { return (typeof MOCK_ACCOUNTS !== 'undefined' && MOCK_ACCOUNTS) ? MOCK_ACCOUNTS[String(acct || '').trim()] : null }
function accountHasTaxIdentity(acct) { let d = accountProfile(acct); return !!(d && (String(d.ssn || '').trim() || String(d.taxId || '').trim())) }
function deriveForeignFromAccount(acct) { let d = accountProfile(acct); if (!d) return val('foreign') || 'No'; return accountHasTaxIdentity(acct) ? 'No' : 'Yes' }
function isCardChargebackCase(c) { let t = caseTxnType(c); return t === 'Debit Card POS' || t === 'Credit Card' }

function classify(x) {
  let eft = ['Debit Card POS', 'ATM Withdrawal', 'ACH Debit', 'Zelle / P2P', 'Online Banking Transfer'];
  let non = ['Credit Card', 'Check', 'Wire Transfer'];
  let txns = getFlaggedTransactions(x);
  let txnTypes = [...new Set(txns.map(t => t.type || x.txnType).filter(Boolean))];
  let hasEft = txnTypes.some(t => eft.includes(t));
  let hasNon = txnTypes.some(t => non.includes(t));
  let mixedRails = hasEft && hasNon;
  let claim = String(x.claimType || '');
  let claimLower = claim.toLowerCase();
  let foreignFlag = (x.foreign === 'Yes');
  let manualReg = x.manualRegEStatus || 'Auto';
  let details = x.claimDetails || {};
  let customerAuthorized = details.detailAuthorized === 'Yes' || details.detailCustomerSent === 'Yes - customer participated';
  let likelyRegE = hasEft && !mixedRails;
  let reason = [];
  if (mixedRails) { likelyRegE = false; reason.push('Mixed Reg E and Non Reg E transaction types are not allowed in one claim. Split into separate claims.') }
  if (claimLower.includes('service not received') || claimLower.includes('merchandise') || claimLower.includes('defective') || claimLower.includes('price adjustment')) { likelyRegE = false; reason.push('Goods/services, merchandise, defective-product, and price-adjustment disputes route to card-network/alternate dispute workflows, not Reg E error resolution in this demo.') }
  if (claimLower.includes('scam')) { likelyRegE = false; reason.push('Customer-authorized scam complaints require enhanced fact review. In this demo they are not treated as Reg E unauthorized EFT unless investigator override determines the transfer was unauthorized.') }
  if (customerAuthorized) { likelyRegE = false; reason.push('Customer confirmed they authorized/sent the payment, so this is not an unauthorized EFT under Reg E. Route as a customer-authorized payment dispute (outside Reg E error resolution) unless investigator override applies.') }
  if (txnTypes.includes('Credit Card')) { likelyRegE = false; reason.push('Credit card disputes route under card/Reg Z style workflow, not Reg E.') }
  if (txnTypes.includes('Check')) { likelyRegE = false; reason.push('Checks are not electronic fund transfers for this workflow and route outside Reg E.') }
  if (txnTypes.includes('Wire Transfer')) { likelyRegE = false; reason.push('Wire-transfer disputes route outside the Reg E EFT workflow in this demo.') }
  if (foreignFlag) { likelyRegE = false; reason.push('Account is treated as foreign/outside U.S. because account KYC has no SSN/Tax ID. This demo routes it outside Reg E unless investigator override applies.') }
  if (manualReg === 'Force Reg E') { likelyRegE = true; reason.push('Investigator manual override forced Reg E classification') }
  if (manualReg === 'Force Non Reg E') { likelyRegE = false; reason.push('Investigator manual override forced Non Reg E classification') }
  if (hasEft) reason.push('Flagged transactions are on EFT rail(s): ' + txnTypes.filter(t => eft.includes(t)).join(', '));
  if (hasNon) reason.push('Flagged transactions are routed outside Reg E in this demo: ' + txnTypes.filter(t => non.includes(t)).join(', '));
  if (txnTypes.length === 1) reason.push('Claim uses one transaction type: ' + txnTypes[0]);
  let initialDays = x.accountAge === 'New account under 30 days' ? 20 : 10;
  let manualInitial = parseInt(x.manualInitialDays || '');
  if (manualInitial === 10 || manualInitial === 20) { initialDays = manualInitial; reason.push('Investigator manual override set initial/provisional-credit deadline to ' + initialDays + ' business days') }
  let noticeDate = x.noticeDate || new Date().toISOString().slice(0, 10);
  let openedDate = x.openedDate || noticeDate;
  let provisionalCreditDate = addBusinessDays(noticeDate, initialDays);
  let due10 = provisionalCreditDate;
  let extendedDays = (txnTypes.includes('Debit Card POS') || x.accountAge === 'New account under 30 days') ? 90 : 45;
  if (foreignFlag) extendedDays = 90;
  let manualExtended = parseInt(x.manualExtendedDays || '');
  if (manualExtended === 45 || manualExtended === 90) { extendedDays = manualExtended; reason.push('Investigator manual override set maximum investigation deadline to ' + extendedDays + ' days') }
  let deadlineDate = addCalendarDays(noticeDate, extendedDays);
  let extendedDue = deadlineDate;
  let score = 10; if (likelyRegE) score += 10;
  let totalAmount = transactionTotal(txns); if (totalAmount > 100) score += 10; if (totalAmount > 500) score += 15;
  if (txnTypes.includes('Zelle / P2P')) score += 18; if (txnTypes.includes('ACH Debit')) score += 8;
  if (x.deviceStatus === 'Still in possession') score += 15; if (x.deviceStatus === 'Shared credentials') score += 20; if (x.accountAge === 'New account under 30 days') score += 12; if (foreignFlag) score += 10;
  score += Math.min(Number(x.prior || 0) * 8, 24); if (claimLower.includes('scam')) score += 20; if (claimLower.includes('unauthorized') || claimLower.includes('not authorized') || claimLower.includes('fraud')) score += 10;
  score = Math.min(100, Math.max(0, score)); let level = score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low'; let tasks = [];
  if (mixedRails) { tasks.push('Split claim into separate Reg E and Non Reg E cases before investigation') }
  else if (likelyRegE) { tasks.push('Open Reg E investigation'); tasks.push('Track provisional-credit and final investigation deadlines'); tasks.push('Prepare customer receipt/acknowledgment'); if (x.source === 'Customer Phone Call') tasks.push('Send/request written confirmation if policy requires it'); if (score >= 75) tasks.push('Escalate for fraud review'); if (txnTypes.includes('Zelle / P2P')) tasks.push('Review recipient, token, device, and login data'); if (txnTypes.includes('ACH Debit')) tasks.push('Request ACH authorization/originator details'); if (txnTypes.includes('ATM Withdrawal')) tasks.push('Request ATM journal, camera, and cash balancing data'); if (txnTypes.includes('Debit Card POS')) tasks.push('Review merchant receipt, chip/magstripe/CNP indicators and chargeback rights') }
  else { tasks.push('Route to alternate dispute workflow'); tasks.push('Document why Reg E is not likely'); if (txnTypes.includes('Credit Card') || txnTypes.includes('Debit Card POS')) tasks.push('Evaluate Mastercard chargeback workflow when applicable') }
  let route = (x.manualRoute && x.manualRoute !== 'Auto') ? x.manualRoute : (likelyRegE ? 'Reg E Investigation' : 'Alternate Workflow');
  return { likelyRegE, route, reason, due10, initialDays, openedDate, provisionalCreditDate, deadlineDate, extendedDays, extendedDue, score, level, tasks, mixedRails, creditRecommendation: likelyRegE ? 'Reg E investigation path. Provisional-credit decision due by ' + provisionalCreditDate + '; maximum investigation deadline ' + deadlineDate + '.' : 'No Reg E provisional credit recommendation; use the applicable alternate/card-network workflow.' }
}
function badge(c) { if (c.auditReady) return '<span class="badge purple">Closed Cases / Log</span>'; if (c.managerReviewed) return '<span class="badge green">Manager Reviewed</span>'; if (c.status.includes('Final')) return '<span class="badge gray">' + c.status + '</span>'; if (c.status === 'Officer Review Needed') return '<span class="badge orange">Investigator Review Needed</span>'; if (c.provisional) return '<span class="badge green">Provisional Credit Posted</span>'; let calc = classify(c); if (calc.score >= 75) return '<span class="badge red">High Risk</span>'; return '<span class="badge">' + c.status + '</span>' }
function dateInRange(c, fromId, toId) { let from = val(fromId), to = val(toId), d = c.noticeDate; if (from && d < from) return false; if (to && d > to) return false; return true }
function amountInRange(c) { let min = Number(document.getElementById('queueMinAmount')?.value || 0); let max = Number(document.getElementById('queueMaxAmount')?.value || 0); let amount = activeView === 'chargeback' ? Number(c.chargebackAmount || c.amount || 0) : Number(c.amount || 0); if (min > 0 && amount < min) return false; if (max > 0 && amount > max) return false; return true }
function tab(id, btn) { activeView = id; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (id !== 'intake') cancelEdit(false); render() } function startNewCase(btn) { cancelEdit(false); resetNewCaseForm(); tab('intake', btn) } function setTabByIndex(i, id) { activeView = id; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); let view = document.getElementById(id); if (view) view.classList.add('active'); let buttons = [...document.querySelectorAll('.tabs button')]; buttons.forEach(b => b.classList.remove('active')); let map = { dashboard: 'Dashboard', recent: 'Recent Cases', review: 'Review', chargeback: 'Chargeback', manager: 'Manager', audit: 'Closed Cases', auditDetailView: 'Closed Cases', ledger: 'Ledger', recovery: 'Pending Recovery' }; let btn = buttons.find(b => (b.textContent || '').includes(map[id] || '')) || buttons[i]; if (btn) btn.classList.add('active'); render() } function setQueueFilter(f) { queueFilter = f; render() } function setDashboardFilter(field, value) { dashboardFilters[field] = ['minAmount', 'maxAmount'].includes(field) ? String(value || '').trim() : String(value || '').toLowerCase().trim(); renderDashboard() } function setAuditFilter(field, value) { auditFilters[field] = ['minAmount', 'maxAmount'].includes(field) ? String(value || '').trim() : String(value || '').toLowerCase().trim(); renderAudit() } function setAuditDailyDate(value) { auditFilters.dailyDate = String(value || '').trim(); renderAudit() } function setLedgerFilter(field, value) { ledgerFilters[field] = value.toLowerCase().trim(); renderLedger() } function setManagerFilter(field, value) { managerFilters[field] = value.toLowerCase().trim(); renderManager() } function setRecoveryFilter(field, value) { recoveryFilters[field] = value.toLowerCase().trim(); renderRecovery() } function setQueueSearchFilter(field, value) { let normalized = String(value || '').toLowerCase().trim(); if (activeView === 'chargeback') chargebackFilters[field] = normalized; else if (activeView === 'manager') managerFilters[field] = normalized; else if (activeView === 'audit' || activeView === 'auditDetailView') { if (field === 'caseId') auditFilters.caseId = normalized; else if (field === 'customer') auditFilters.customer = normalized; else if (field === 'account') auditFilters.account = normalized; else if (field === 'amount') auditFilters.amount = normalized; else if (field === 'status') auditFilters.status = normalized } else if (activeView === 'recovery') recoveryFilters[field] = normalized; render() } function setQueueSort(field, value) { queueSort[field] = value; renderCaseList() } function setDashboardSort(field, value) { dashboardSort[field] = value; renderDashboard() } function setAuditSort(field, value) { auditSort[field] = value; renderAudit() } function setManagerSort(field, value) { managerSort[field] = value; renderManager() } function setLedgerSort(field, value) { ledgerSort[field] = value; renderLedger() } function toggleSort(sortObj, field, renderFn) { if (sortObj.field === field) { sortObj.direction = sortObj.direction === 'asc' ? 'desc' : 'asc' } else { sortObj.field = field; sortObj.direction = 'desc' } renderFn() } function sortArrow(sortObj, field) { return sortObj.field === field ? (sortObj.direction === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;' } function toggleDashboardSort(field) { toggleSort(dashboardSort, field, renderDashboard) } function toggleAuditSort(field) { toggleSort(auditSort, field, renderAudit) } function toggleManagerSort(field) { toggleSort(managerSort, field, renderManager) } function toggleLedgerSort(field) { toggleSort(ledgerSort, field, renderLedger) } function sortValue(v) { let t = Date.parse(v); return isNaN(t) ? String(v || '').toLowerCase() : t } function applySort(list, sort, getter) { let dir = sort.direction === 'asc' ? 1 : -1; return list.slice().sort((a, b) => { let av = sortValue(getter(a, sort.field)), bv = sortValue(getter(b, sort.field)); return av > bv ? dir : av < bv ? -dir : 0 }) }
function caseTxnType(c) { let txns = getFlaggedTransactions(c); return (txns[0] && txns[0].type) || c.txnType || '' } function caseClaimType(c) { return c.claimType || '' } function matchesQueueDropdowns(c) { let t = val('queueTxnTypeFilter'), e = val('queueClaimTypeFilter'); return (!t || caseTxnType(c) === t) && (!e || caseClaimType(c) === e) } function matchesRegE(c) { let r = classify(c).likelyRegE; if (queueFilter === 'regE') return r; if (queueFilter === 'nonRegE') return !r; return true } function isManagerCase(c) { return (c.status.includes('Final') || c.managerReviewed) && !c.auditReady } function isAuditCase(c) { return c.auditReady } function isNormalReviewCase(c) { return !c.auditReady } function getChargebackQueueCases() { return cases.filter(isChargebackInProcess).filter(c => matchesChargebackCase(c, chargebackFilters)).filter(c => dateInRange(c, 'queueDateFrom', 'queueDateTo')).filter(matchesQueueDropdowns).filter(c => amountInRange(c)) } function visibleQueueCases() { let base = cases; if (activeView === 'dashboard' || activeView === 'recent') return []; if (activeView === 'manager') base = cases.filter(isManagerCase); else if (activeView === 'audit' || activeView === 'auditDetailView') base = cases.filter(isAuditCase); else if (activeView === 'ledger') base = cases.filter(c => ledgerCreditTotal(c) > 0); else if (activeView === 'chargeback') base = getChargebackQueueCases(); else if (activeView === 'recovery') base = cases.filter(c => ledgerPendingThirdPartyTotal(c) > 0); else base = cases.filter(isNormalReviewCase).filter(matchesRegE); let rows = base.filter(c => dateInRange(c, 'queueDateFrom', 'queueDateTo')).filter(matchesQueueDropdowns).filter(c => amountInRange(c)); return applySort(rows, { field: 'noticeDate', direction: 'desc' }, (c, f) => c.noticeDate) } function queueAction(c) { if (activeView === 'manager') return `selectCase('${c.id}');setTabByIndex(3,'manager')`; if (activeView === 'audit') return `openAuditCase('${c.id}')`; if (activeView === 'ledger') return `openProvisionalAdjustment('${c.id}')`; if (activeView === 'chargeback') return `openChargebackCase('${c.id}')`; if (activeView === 'recovery') return `selectCase('${c.id}')`; return `selectCase('${c.id}')` }
function matchesDashboard(c) { let calc = classify(c); let v = { caseId: c.id, source: c.source, customer: c.customer, account: c.account, status: c.status + ' ' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E'), txnType: caseTxnType(c), claimType: caseClaimType(c) }; let amount = Number(c.amount || 0); let minAmount = Number(dashboardFilters.minAmount || 0); let maxAmount = Number(dashboardFilters.maxAmount || 0); if (minAmount > 0 && amount < minAmount) return false; if (maxAmount > 0 && amount > maxAmount) return false; let filterEntries = Object.entries(dashboardFilters).filter(([k]) => !['minAmount', 'maxAmount'].includes(k)); return filterEntries.every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f)) && dateInRange(c, 'dashboardDateFrom', 'dashboardDateTo') }
function matchesAudit(c) { let calc = classify(c); let opened = c.openedDate || c.noticeDate || ''; if (auditFilters.dailyDate && opened !== auditFilters.dailyDate) return false; let amount = Number(c.amount || 0); let minAmount = Number(auditFilters.minAmount || 0); let maxAmount = Number(auditFilters.maxAmount || 0); if (minAmount > 0 && amount < minAmount) return false; if (maxAmount > 0 && amount > maxAmount) return false; let v = { caseId: c.id, source: c.source, customer: c.customer, account: c.account, status: c.status + ' ' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E'), txnType: caseTxnType(c), claimType: caseClaimType(c), dailyDate: opened, amount: String(c.amount || 0) + ' ' + money(c.amount || 0) }; let filterEntries = Object.entries(auditFilters).filter(([k]) => !['dailyDate', 'minAmount', 'maxAmount'].includes(k)); return filterEntries.every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f)) } function matchesLedgerRow(r) { let v = { caseId: r.caseId, customer: r.customer, account: r.account, amount: String(r.entry.amount) + ' ' + money(r.entry.amount) }; return Object.entries(ledgerFilters).every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f)) } function matchesManager(c) { let v = { caseId: c.id, customer: c.customer, account: c.account, amount: String(c.amount) + ' ' + money(c.amount), status: c.status + ' ' + (c.finalDecision || '') + ' ' + c.creditStatus }; return Object.entries(managerFilters).every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f)) }
function addCalendarDaysOnly(dateStr, days) { let d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) } function transactionListHtml(c, title = 'Claim Transactions') { let txns = getFlaggedTransactions(c); return '<h3>' + title + '</h3><table><tr><th>#</th><th>Date</th><th>Type</th><th>Merchant / Recipient</th><th>Amount</th></tr>' + txns.map((t, i) => '<tr class="txFlag"><td>' + (i + 1) + '</td><td>' + t.date + '</td><td>' + t.type + '</td><td>' + t.merchant + '</td><td>' + money(t.amount) + '</td></tr>').join('') + '</table>' }
function transactionTypeOptions(selected) { let opts = ['Zelle / P2P', 'ACH Debit', 'Debit Card POS', 'ATM Withdrawal', 'Online Banking Transfer', 'Wire Transfer', 'Check', 'Credit Card']; return opts.map(o => '<option ' + (o === selected ? 'selected' : '') + '>' + o + '</option>').join('') }
function defaultTransaction() { return { date: '2026-06-20', type: 'Zelle / P2P', merchant: 'Unknown Zelle Recipient', amount: 450, primary: true } }
function primaryTransactionFromCase(c) { return { date: c.txnDate, type: c.txnType, merchant: c.merchant, amount: Number(c.amount || 0), primary: true } }
function getFlaggedTransactions(c) { if (c.flaggedTransactions && c.flaggedTransactions.length) return c.flaggedTransactions; return [primaryTransactionFromCase(c)] }
function renderTransactionRows(txns = [defaultTransaction()]) { let box = document.getElementById('transactionRows'); if (!box) return; let forcedType = (txns[0] && txns[0].type) || 'Zelle / P2P'; box.innerHTML = txns.map((t, i) => '<div class="txnBox txnRow"><div class="txnHead"><strong>Transaction ' + (i + 1) + '</strong>' + (i > 0 ? '<button class="bad smallBtn" type="button" onclick="removeTransactionRow(this)">Remove</button>' : '') + '</div><div class="two"><div><label>Transaction date</label><input class="txnDateField" type="date" value="' + (t.date || '') + '" onchange="liveCalc()"></div><div><label>Transaction type</label><select class="txnTypeField" ' + (i > 0 ? 'disabled' : '') + ' onchange="syncTransactionTypes();liveCalc()">' + transactionTypeOptions(i === 0 ? (t.type || forcedType) : forcedType) + '</select>' + (i > 0 ? '<input class="txnTypeHidden" type="hidden" value="' + forcedType + '"><div class="muted mini">Same type as Transaction 1</div>' : '<div class="muted mini">One transaction type per claim. Changing this updates all rows.</div>') + '</div></div><div class="two"><div><label>Merchant / recipient</label><input class="txnMerchantField" value="' + (t.merchant || '') + '" oninput="liveCalc()"></div><div><label>Amount</label><input class="txnAmountField" type="number" step="0.01" value="' + (t.amount === '' ? '' : Number(t.amount || 0).toFixed(2)) + '" oninput="liveCalc()"></div></div></div>').join(''); syncTransactionTypes(false); updateTransactionTotal() }
function currentClaimType() { let first = document.querySelector('.txnRow .txnTypeField'); return first ? first.value : 'Zelle / P2P' }
function syncTransactionTypes(rerun = true) { let type = currentClaimType(); document.querySelectorAll('.txnRow').forEach((r, i) => { let sel = r.querySelector('.txnTypeField'); if (sel && i > 0) sel.value = type; let hidden = r.querySelector('.txnTypeHidden'); if (hidden) hidden.value = type }); if (rerun) liveCalc() }
function addTransactionRow(t = { date: '', type: null, merchant: '', amount: '', primary: false }) { let txns = readTransactionRows(); txns.push({ date: t.date || '', type: currentClaimType(), merchant: t.merchant || '', amount: t.amount == null ? '' : t.amount, primary: false }); renderTransactionRows(txns) } function duplicateLastTransaction() { let txns = readTransactionRows(); let last = txns[txns.length - 1] || defaultTransaction(); txns.push({ date: last.date, type: currentClaimType(), merchant: last.merchant, amount: '', primary: false }); renderTransactionRows(txns) }
function removeTransactionRow(btn) { let row = btn.closest('.txnRow'); if (row) row.remove(); syncTransactionTypes(false); updateTransactionTotal(); liveCalc() }
function readTransactionRows() { let rows = [...document.querySelectorAll('.txnRow')]; let type = currentClaimType(); return rows.map((r, i) => ({ date: r.querySelector('.txnDateField').value, type: type, merchant: r.querySelector('.txnMerchantField').value, amount: Number(r.querySelector('.txnAmountField').value || 0), primary: i === 0 })).filter(t => t.date || t.merchant || t.amount) }
function transactionTotal(txns) { return txns.reduce((a, t) => a + Math.abs(Number(t.amount || 0)), 0) }
function updateTransactionTotal() { let el = document.getElementById('transactionTotal'); if (el) el.textContent = money(transactionTotal(readTransactionRows())) }
function buildFlaggedTransactions() { let rows = readTransactionRows(); return rows.length ? rows : [defaultTransaction()] }
function flaggedTransactionsHtml(c) { let txns = getFlaggedTransactions(c); let total = transactionTotal(txns); return '<h3>Flagged Transactions In This Claim</h3><p class="muted">This claim includes ' + txns.length + ' disputed transaction(s). Total flagged amount: <strong>' + money(total) + '</strong></p><table><tr><th>Date</th><th>Type</th><th>Merchant / Recipient</th><th>Amount</th><th>Role</th></tr>' + txns.map(t => '<tr class="txFlag"><td>' + t.date + '</td><td>' + t.type + '</td><td>' + t.merchant + '</td><td>' + money(t.amount) + '</td><td>' + (t.primary ? 'Primary' : 'Additional') + '</td></tr>').join('') + '</table>' }
function simulatedAccountHistory(c) { let flagged = getFlaggedTransactions(c).map(t => ({ ...t, flagged: true })); let normal = [{ date: '2026-06-23', type: 'Debit Card POS', merchant: 'Publix #1442', amount: -86.43 }, { date: '2026-06-22', type: 'ACH Credit', merchant: 'Payroll Deposit', amount: 2450.00 }, { date: '2026-06-19', type: 'ATM Withdrawal', merchant: 'ATM Hialeah', amount: -100.00 }, { date: '2026-06-17', type: 'Debit Card POS', merchant: 'Shell Miami', amount: -42.10 }, { date: '2026-06-15', type: 'Online Banking Transfer', merchant: 'Transfer to Savings', amount: -250.00 }]; return [...flagged.map(t => ({ date: t.date, type: t.type, merchant: t.merchant, amount: -Math.abs(Number(t.amount || 0)), flagged: true })), ...normal].sort((a, b) => String(b.date).localeCompare(String(a.date))) }
function openCaseTool(title, subtitle, html) { activeView = 'caseTool'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('caseTool').classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tabs button')[1].classList.add('active'); document.getElementById('caseToolTitle').textContent = title; document.getElementById('caseToolSub').textContent = subtitle || ''; document.getElementById('caseToolBody').innerHTML = html; renderCaseList() } function backToCaseReview() { showHistoryId = null; showCreditPanelId = null; setTabByIndex(1, 'review') } function accountHistoryHtml(c) { let rows = simulatedAccountHistory(c); return '<div class="notice">Demo account history for ' + c.account + '. Flagged claim transactions are highlighted.</div><table><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Flag</th></tr>' + rows.map(r => '<tr class="' + (r.flagged ? 'txFlag' : '') + '"><td>' + r.date + '</td><td>' + r.type + '</td><td>' + r.merchant + '</td><td>' + money(r.amount) + '</td><td>' + (r.flagged ? 'Claim transaction' : '-') + '</td></tr>').join('') + '</table>' }
function toggleAccountHistory() { let c = cur(); if (!c) return; openCaseTool('Account Transaction History', 'Review account activity for ' + c.id + ' - ' + c.customer, accountHistoryHtml(c)) }
function formData() { let txns = buildFlaggedTransactions(); let first = txns[0] || defaultTransaction(); let existing = editCaseId ? cases.find(x => x.id === editCaseId) : null; let autoNotice = overrideMode ? val('noticeDate') : (existing?.noticeDate || currentDateISO()); let autoForeign = overrideMode ? val('foreign') : deriveForeignFromAccount(val('account')); let temp = { source: val('source'), intakeOfficer: val('intakeOfficer'), customer: val('customer'), account: val('account'), txnType: first.type, claimType: val('claimType'), merchant: first.merchant, amount: transactionTotal(txns), txnDate: first.date, noticeDate: autoNotice, openedDate: autoNotice, accountAge: val('accountAge'), foreign: autoForeign, deviceStatus: val('deviceStatus'), prior: Number(val('prior')), statement: val('statement'), flaggedTransactions: txns, manualRegEStatus: val('manualRegEStatus') || 'Auto', manualInitialDays: val('manualInitialDays') || 'Auto', manualExtendedDays: val('manualExtendedDays') || 'Auto', manualRoute: val('manualRoute') || 'Auto', manualOverrideNote: val('manualOverrideNote') || '' }; let calc = classify(temp); let prefix = calc.likelyRegE ? 'REG-E' : 'NON-E'; return { ...temp, id: prefix + '-' + new Date().toISOString().slice(2, 10).replaceAll('-', '') + '-' + Math.floor(1000 + Math.random() * 9000), createdAt: new Date().toISOString(), openedBy: val('intakeOfficer') || 'User', status: 'Officer Review Needed', officerDecision: null, officerComment: '', provisional: false, creditStatus: 'No credit posted', finalDecision: null, managerReviewed: false, auditReady: false, comments: [], events: [eventObj('Case created from ' + val('source') + ' with automatic notice date ' + autoNotice)] } }
function createCase(e) { e.preventDefault(); if (editCaseId) { markCaseViewed(editCaseId); updateExistingCase(); return } let c = formData(); if (!getFlaggedTransactions(c).length || transactionTotal(getFlaggedTransactions(c)) <= 0) { alert('Select at least one disputed transaction from account history before creating the case.'); return } let calc = classify(c); retagCaseId(c); if (calc.mixedRails && (!c.manualRegEStatus || c.manualRegEStatus === 'Auto')) { alert('This claim mixes Reg E and Non Reg E transaction types. Because one claim can only use one transaction type, change the transaction type or create separate claims.'); return; } c.events.push(eventObj('Machine recommendation: ' + calc.route + ', risk ' + calc.score + ', due ' + calc.due10)); c.events.push(eventObj('Claim contains ' + getFlaggedTransactions(c).length + ' flagged transaction(s), total ' + money(c.amount))); autoNotify(c, 'Claim received and queued for officer review.'); c.createdAt = new Date().toISOString(); c.lastViewedAt = new Date().toISOString(); c.lastViewedLabel = now(); cases.unshift(c); selectedId = c.id; render(); setTabByIndex(1, 'review') }

function liveCalc(){updateTransactionTotal();let txns=buildFlaggedTransactions();let first=txns[0]||defaultTransaction();let x={source:val('source'),txnType:first.type,claimType:val('claimType'),amount:transactionTotal(txns),txnDate:first.date,noticeDate:(overrideMode?val('noticeDate'):(editCaseId?(cases.find(x=>x.id===editCaseId)?.noticeDate||currentDateISO()):currentDateISO())),accountAge:val('accountAge'),foreign:(overrideMode?val('foreign'):deriveForeignFromAccount(val('account'))),deviceStatus:val('deviceStatus'),prior:Number(val('prior')),flaggedTransactions:txns,claimDetails:readClaimDetails(),manualRegEStatus:val('manualRegEStatus')||'Auto',manualInitialDays:val('manualInitialDays')||'Auto',manualExtendedDays:val('manualExtendedDays')||'Auto',manualRoute:val('manualRoute')||'Auto',};let c=classify(x);let box=document.getElementById('liveResult');if(box)box.textContent='Likely Reg E: '+(c.likelyRegE?'YES':'NO')+'\nRecommended route: '+c.route+'\nNotice date: '+x.noticeDate+'\nOpened date: '+c.openedDate+'\nProvisional credit deadline: '+c.provisionalCreditDate+' ('+c.initialDays+' business days)'+'\nFinal case deadline: '+c.deadlineDate+' ('+c.extendedDays+' calendar days, maximum allowed)\nTotal claim amount: '+money(transactionTotal(txns))+'\nRisk score: '+c.score+'/100 - '+c.level+'\nCredit recommendation: '+c.creditRecommendation+'\n\nSuggested tasks:\n- '+c.tasks.join('\n- ')+'\n\nReasoning:\n- '+c.reason.join('\n- ')}
function markCaseViewed(id) { let c = cases.find(x => x.id === id); if (!c) return; c.lastViewedAt = new Date().toISOString(); c.lastViewedLabel = now(); }
function selectCase(id) { let c = cases.find(x => x.id === id); if (!c) return; markCaseViewed(id); if (c.auditReady) { openAuditCase(id); return } selectedId = id; setTabByIndex(1, 'review') } function openAuditCase(id) { markCaseViewed(id); selectedAuditId = id; selectedId = id; activeView = 'auditDetailView'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); let view = document.getElementById('auditDetailView'); if (view) view.classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); let btn = [...document.querySelectorAll('.tabs button')].find(b => (b.textContent || '').includes('Closed Cases')); if (btn) btn.classList.add('active'); render() }
function oceanSelfCheck() { let required = ['dashboard', 'recent', 'review', 'chargeback', 'manager', 'audit', 'ledger', 'recovery', 'intake', 'caseForm', 'account', 'caseTxnType', 'claimType', 'accountHistoryBox']; let missing = required.filter(id => !document.getElementById(id)); if (missing.length) { console.warn('O.C.E.A.N missing DOM elements:', missing); return false } return true }
function reviewAccountHistorySidebarHtml(c) {
  if (!c) return '<div class="sideHistory"><h2>Account Transaction History</h2><p class="muted">Select a case to view account history.</p></div>';
  let profile = accountProfile(c.account) || {};
  let history = (profile.history && profile.history.length ? profile.history : getFlaggedTransactions(c)) || [];
  let flagged = new Set(getFlaggedTransactions(c).map(txKey));
  let rows = history.map(t => '<div class="sideTxn ' + (flagged.has(txKey(t)) ? 'flagged' : '') + '"><div><strong>' + t.date + '</strong> ' + (flagged.has(txKey(t)) ? '<span class="badge orange">Disputed</span>' : '') + '</div><div>' + t.type + '</div><div class="muted">' + (t.network ? t.network + ' - ' : '') + t.merchant + '</div><div class="amt">' + money(t.amount) + '</div></div>').join('') || '<p class="muted">No account history available for this account.</p>';
  return '<div class="sideHistory"><h2>Account Transaction History</h2><p class="muted">' + c.customer + '<br>Account ' + c.account + '</p>' + rows + '</div>';
}
function render() {
  save();
  let side = document.getElementById('sideQueue'); let wrap = document.querySelector('.wrap');
  if (side && !side.dataset.originalHtml) side.dataset.originalHtml = side.innerHTML;
  if (side) {
    side.style.display = (activeView === 'dashboard' || activeView === 'recent') ? 'none' : '';
    if (activeView === 'review') {
      side.innerHTML = reviewAccountHistorySidebarHtml(cur()); side.dataset.mode = 'history';
    } else if (side.dataset.mode === 'history') {
      side.innerHTML = side.dataset.originalHtml; side.dataset.mode = 'queue';
    }
  }
  if (wrap) { wrap.style.gridTemplateColumns = (activeView === 'dashboard' || activeView === 'recent') ? '1fr' : '' }
  let qAll = document.getElementById('qAll'), qRegE = document.getElementById('qRegE'), qNonRegE = document.getElementById('qNonRegE'), queueControls = document.getElementById('queueRegEControls'), queueLabel = document.getElementById('queueModeLabel');
  if (qAll) qAll.classList.toggle('active', queueFilter === 'all'); if (qRegE) qRegE.classList.toggle('active', queueFilter === 'regE'); if (qNonRegE) qNonRegE.classList.toggle('active', queueFilter === 'nonRegE');
  if (queueControls) queueControls.style.display = (activeView === 'manager' || activeView === 'audit' || activeView === 'auditDetailView' || activeView === 'ledger' || activeView === 'chargeback' || activeView === 'dashboard' || activeView === 'recent') ? 'none' : 'flex';
  let caseList = document.getElementById('caseList'); if (caseList) caseList.style.display = (activeView === 'manager' || activeView === 'audit' || activeView === 'auditDetailView' || activeView === 'chargeback' || activeView === 'recovery') ? 'none' : 'block';
  let chargebackSearch = document.getElementById('chargebackQueueSearchFilters'); if (chargebackSearch) chargebackSearch.style.display = (activeView === 'chargeback' || activeView === 'manager' || activeView === 'audit' || activeView === 'recovery') ? 'block' : 'none';
  if (queueLabel) queueLabel.textContent = activeView === 'dashboard' ? 'Dashboard View' : activeView === 'recent' ? 'Recent Cases' : activeView === 'manager' ? 'Manager Review Cases' : (activeView === 'audit' || activeView === 'auditDetailView') ? 'Closed Cases / Log' : activeView === 'ledger' ? 'Cases With Provisional Credit' : activeView === 'chargeback' ? 'Chargeback In Process' : activeView === 'recovery' ? 'Pending Recovery' : (queueFilter === 'regE' ? 'Reg E Cases' : queueFilter === 'nonRegE' ? 'Non Reg E Cases' : 'All Cases');
  try { renderCaseList() } catch (e) { console.error('renderCaseList failed', e) } try { renderRecentCases() } catch (e) { console.error('renderRecentCases failed', e) } try { renderDashboard() } catch (e) { console.error('renderDashboard failed', e) } try { renderReview() } catch (e) { console.error('renderReview failed', e) } try { renderLedger() } catch (e) { console.error('renderLedger failed', e) } try { renderChargeback() } catch (e) { console.error('renderChargeback failed', e) } try { renderRecovery() } catch (e) { console.error('renderRecovery failed', e) } try { renderManager() } catch (e) { console.error('renderManager failed', e) } try { renderAudit() } catch (e) { console.error('renderClosedLog failed', e) } try { renderAuditDetail() } catch (e) { console.error('renderClosedDetail failed', e) } try { liveCalc() } catch (e) { console.error('liveCalc failed', e) }
}
function renderCaseList() { let el = document.getElementById('caseList'); if (!el) return; if (['manager', 'audit', 'auditDetailView', 'chargeback', 'recovery'].includes(activeView)) { el.innerHTML = ''; return } let list = visibleQueueCases(); el.innerHTML = list.map(c => { let calc = classify(c); return '<div class="case ' + (c.id === selectedId ? 'active' : '') + '" onclick="' + queueAction(c) + '"><div class="between"><strong>' + c.id + '</strong>' + badge(c) + '</div><div>' + c.customer + '</div><div class="muted">' + c.source + ' - ' + c.account + ' - ' + c.txnType + ' - ' + money(c.amount) + '</div><div class="muted">Notice: ' + c.noticeDate + ' - ' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E') + ' - Risk ' + calc.score + '</div></div>' }).join('') || '<div class="pad muted">No cases match this queue/date filter.</div>' }

function caseOpenedStamp(c) { return c.lastViewedAt || '' }
function recentCases() { return [...cases].filter(c => !!c.lastViewedAt).sort((a, b) => String(caseOpenedStamp(b)).localeCompare(String(caseOpenedStamp(a)))).slice(0, 5) }
function renderRecentCases() { let el = document.getElementById('recentCasesBody'); if (!el) return; let rows = recentCases(); el.innerHTML = '<table><tr><th>Case</th><th>Customer</th><th>Account</th><th>Case Type</th><th>Error Type</th><th>Last Opened</th><th>Status</th><th>Action</th></tr>' + (rows.map(c => '<tr style="cursor:pointer" onclick="selectCase(&quot;' + c.id + '&quot;)" title="Open case"><td>' + c.id + '</td><td>' + c.customer + '</td><td>' + c.account + '</td><td>' + caseTxnType(c) + '</td><td>' + caseClaimType(c) + '</td><td>' + (c.lastViewedLabel || c.lastViewedAt || '') + '</td><td>' + badge(c) + '</td><td><button class="secondary smallBtn" onclick="event.stopPropagation();selectCase(&quot;' + c.id + '&quot;)">Open</button></td></tr>').join('') || '<tr><td colspan="8">No recent cases opened yet. Open/view a case to add it here.</td></tr>') + '</table>'; }
function renderDashboard() { document.getElementById('kOpen').textContent = cases.filter(c => !c.status.includes('Final') && !c.auditReady).length; document.getElementById('kOfficer').textContent = cases.filter(c => c.status === 'Officer Review Needed').length; document.getElementById('kManager').textContent = cases.filter(c => isManagerCase(c) && !c.managerReviewed).length; document.getElementById('kAudit').textContent = cases.filter(c => c.auditReady).length; let rows = applySort(cases.filter(c => !c.auditReady).filter(matchesDashboard), dashboardSort, (c, f) => f === 'caseId' ? c.id : c.noticeDate); document.getElementById('workbench').innerHTML = '<tr><th>Case<button class="sortBtn" onclick="toggleDashboardSort(\'caseId\')">' + sortArrow(dashboardSort, 'caseId') + '</button><input class="filterInput" placeholder="Search case #" value="' + dashboardFilters.caseId + '" oninput="setDashboardFilter(\'caseId\',this.value)"></th><th>Source<input class="filterInput" placeholder="Search source" value="' + dashboardFilters.source + '" oninput="setDashboardFilter(\'source\',this.value)"></th><th>Customer<input class="filterInput" placeholder="Search customer" value="' + dashboardFilters.customer + '" oninput="setDashboardFilter(\'customer\',this.value)"></th><th>Account Number<input class="filterInput" placeholder="Search account" value="' + dashboardFilters.account + '" oninput="setDashboardFilter(\'account\',this.value)"></th><th>Amount</th><th>Case Type</th><th>Error Type</th><th>Status<input class="filterInput" placeholder="Search status" value="' + dashboardFilters.status + '" oninput="setDashboardFilter(\'status\',this.value)"></th><th>Risk</th><th>Notice Date<button class="sortBtn" onclick="toggleDashboardSort(\'noticeDate\')">' + sortArrow(dashboardSort, 'noticeDate') + '</button></th><th>Deadline</th></tr>' + (rows.map(c => { let calc = classify(c); return '<tr style="cursor:pointer" title="Open case" onclick="selectCase(\'' + c.id + '\')"><td>' + c.id + '</td><td>' + c.source + '</td><td>' + c.customer + '</td><td>' + c.account + '</td><td>' + money(c.amount) + '</td><td>' + caseTxnType(c) + '</td><td>' + caseClaimType(c) + '</td><td>' + badge(c) + '<div class="muted mini">' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E') + '</div></td><td><div class="risk"><span style="width:' + calc.score + '%"></span></div><span class="muted">' + calc.score + ' ' + calc.level + '</span></td><td>' + c.noticeDate + '</td><td>' + calc.deadlineDate + '</td></tr>' }).join('') || '<tr><td colspan="11">No dashboard results match your search/date filters.</td></tr>') }
function renderSteps(c) { let steps = ['Intake', 'Investigator Review', 'Investigation', 'Provisional Credit', 'Chargeback In Process', 'Final Decision', 'Manager Close', 'Closed Cases / Log']; let idx = 0; if (c.status === 'Officer Review Needed') idx = 1; if (c.status === 'Investigation Open' || c.status === 'Needs Review' || c.status === 'Ready for Credit Decision') idx = 2; if (c.provisional) idx = 3; if (isChargebackInProcess(c)) idx = 4; if (c.status === 'Ready for Final Decision' || c.status.includes('Final')) idx = 5; if (c.managerReviewed) idx = 6; if (c.auditReady) idx = 7; return '<div class="stepper">' + steps.map((s, i) => '<div class="step ' + (i < idx ? 'done' : i === idx ? 'current' : '') + '">' + s + '</div>').join('') + '</div>' }
function verifyManagerCode(reason) { let code = prompt(reason + '\n\nEnter manager override code:'); if (code === null) return false; if (code !== MANAGER_CODE) { alert('Incorrect manager code. Demo code is MANAGER123.'); return false } return true }
function canModifyCase(c, action) { if (!c.auditReady) return true; return verifyManagerCode('This case is marked Closed Cases / Log and locked. ' + action + ' requires manager override.') }
function loadCaseIntoForm(c) { document.getElementById('source').value = c.source; document.getElementById('intakeOfficer').value = c.intakeOfficer || 'S. Sanz'; document.getElementById('customer').value = c.customer; document.getElementById('account').value = c.account; document.getElementById('claimType').value = c.claimType; document.getElementById('noticeDate').value = c.noticeDate; document.getElementById('accountAge').value = c.accountAge; document.getElementById('foreign').value = c.foreign; document.getElementById('deviceStatus').value = c.deviceStatus; document.getElementById('prior').value = c.prior; document.getElementById('statement').value = c.statement; renderTransactionRows(getFlaggedTransactions(c)); setManualControls(c); liveCalc() }
function startEditCase() { let c = cur(); if (!c) return; if (!canModifyCase(c, 'Editing')) return; markCaseViewed(c.id); editCaseId = c.id; loadCaseIntoForm(c); activeView = 'intake'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('intake').classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); document.querySelector('.plusTab').classList.add('active'); document.getElementById('intakeTitle').textContent = 'Edit Case'; document.getElementById('editBanner').style.display = 'block'; document.getElementById('editBanner').textContent = 'Editing ' + c.id + (c.auditReady ? ' - Audit override mode used.' : ''); document.getElementById('caseSubmitBtn').textContent = 'Save Case Changes'; document.getElementById('cancelEditBtn').style.display = 'inline-block'; render() }

function cancelEdit(shouldRender = true) { editCaseId = null; overrideMode = false; let title = document.getElementById('intakeTitle'); if (title) title.textContent = 'Create New Case'; let banner = document.getElementById('editBanner'); if (banner) { banner.style.display = 'none'; banner.textContent = '' } let btn = document.getElementById('caseSubmitBtn'); if (btn) btn.textContent = 'Create Case & Send to Investigator Review'; let cancel = document.getElementById('cancelEditBtn'); if (cancel) cancel.style.display = 'none'; setManualControls(null); if (shouldRender) render() }
function updateExistingCase() { let c = cases.find(x => x.id === editCaseId); if (!c) return; let wasAudit = c.auditReady; let data = formData(); let calcData = classify(data); if (calcData.mixedRails && (!overrideMode || data.manualRegEStatus === 'Auto')) { alert('This claim mixes Reg E and Non Reg E transaction types. Use investigator override classification or split into separate claims.'); return; } Object.assign(c, { source: data.source, intakeOfficer: data.intakeOfficer, customer: data.customer, account: data.account, txnType: data.txnType, claimType: data.claimType, merchant: data.merchant, amount: data.amount, txnDate: data.txnDate, noticeDate: data.noticeDate, openedDate: data.openedDate || data.noticeDate, accountAge: data.accountAge, foreign: data.foreign, deviceStatus: data.deviceStatus, prior: data.prior, statement: data.statement, flaggedTransactions: data.flaggedTransactions, manualRegEStatus: data.manualRegEStatus, manualInitialDays: data.manualInitialDays, manualExtendedDays: data.manualExtendedDays, manualRoute: data.manualRoute, manualOverrideNote: data.manualOverrideNote }); if (overrideMode) { c.officerDecision = 'Investigator override / manual mode'; c.officerComment = data.manualOverrideNote || 'Manual override saved.'; c.status = 'Investigation Open'; autoNotify(c, 'Your claim is being reviewed after investigator manual review.') } c.amount = transactionTotal(getFlaggedTransactions(c)); let recalced = classify(c); c.events.push(eventObj('Derived Reg E dates refreshed: notice ' + c.noticeDate + ', opened ' + recalced.openedDate + ', provisional credit ' + recalced.provisionalCreditDate + ', deadline ' + recalced.deadlineDate)); retagCaseId(c); c.events.push(eventObj(wasAudit ? 'CLOSED-LOG OVERRIDE: Case edited with manager code' : (overrideMode ? 'Investigator manual override saved' : 'Case edited'))); selectedId = c.id; cancelEdit(false); render(); if (wasAudit) { openAuditCase(c.id) } else { setTabByIndex(1, 'review') } }
function deleteCase() { let c = cur(); if (!c) return; if (!canModifyCase(c, 'Deleting')) return; if (!confirm('Delete case ' + c.id + '? This removes it from this demo database.')) return; let idx = cases.findIndex(x => x.id === c.id); if (idx >= 0) cases.splice(idx, 1); selectedId = cases[0]?.id || null; if (selectedAuditId === c.id) selectedAuditId = null; render(); if (selectedId) setTabByIndex(0, 'dashboard') }
function setManualControls(c) { let show = overrideMode || (c && (c.manualRegEStatus && c.manualRegEStatus !== 'Auto' || c.manualInitialDays && c.manualInitialDays !== 'Auto' || c.manualExtendedDays && c.manualExtendedDays !== 'Auto' || c.manualRoute && c.manualRoute !== 'Auto')); let box = document.getElementById('manualOverrideBox'); if (box) box.style.display = show ? 'block' : 'none'; let mr = document.getElementById('manualRegEStatus'); if (mr) mr.value = c?.manualRegEStatus || 'Auto'; let mi = document.getElementById('manualInitialDays'); if (mi) mi.value = c?.manualInitialDays || 'Auto'; let me = document.getElementById('manualExtendedDays'); if (me) me.value = c?.manualExtendedDays || 'Auto'; let route = document.getElementById('manualRoute'); if (route) route.value = c?.manualRoute || 'Auto'; let note = document.getElementById('manualOverrideNote'); if (note) note.value = c?.manualOverrideNote || ''; let nd = document.getElementById('noticeDate'); if (nd) { nd.readOnly = !show; if (!show && !editCaseId) nd.value = currentDateISO() } let foreign = document.getElementById('foreign'); if (foreign) { foreign.disabled = !show; if (!show) foreign.value = deriveForeignFromAccount(val('account')) } }
function startManualOverride() { let c = cur(); if (!c) return; overrideMode = true; editCaseId = c.id; loadCaseIntoForm(c); activeView = 'intake'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('intake').classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); document.querySelector('.plusTab').classList.add('active'); document.getElementById('intakeTitle').textContent = 'Investigator Override - Manual Case Mode'; document.getElementById('editBanner').style.display = 'block'; document.getElementById('editBanner').textContent = 'Investigator override for ' + c.id + '. Investigator may change Reg E status, deadline settings, route, transactions, dates, and case parameters.'; document.getElementById('caseSubmitBtn').textContent = 'Save Investigator Override'; document.getElementById('cancelEditBtn').style.display = 'inline-block'; setManualControls(c); render() }
function commentAttachmentsHtml(files) { if (!files || !files.length) return ''; return '<div class="muted mini" style="margin-top:6px"><strong>Attachments:</strong><br>' + files.map(f => '- ' + f.name + ' (' + Math.round((f.size || 0) / 1024) + ' KB)').join('<br>') + '</div>' }
function getCommentAttachments() { let input = document.getElementById('commentFiles'); if (!input || !input.files) return []; return Array.from(input.files).map(f => ({ name: f.name, size: f.size, type: f.type || 'unknown' })) }
function finderDatesHtml(c, calc) { return '<h3>Case Timeline</h3><div class="notice">Simple date view: when the bank was told, when the case opened, when provisional credit is due, and the last day to finish the case.</div><table><tr><td>Notice Date</td><td>' + c.noticeDate + '</td></tr><tr><td>Opened Date</td><td>' + calc.openedDate + '</td></tr><tr><td>Provisional Credit Deadline</td><td>' + calc.provisionalCreditDate + ' (' + calc.initialDays + ' business days)</td></tr><tr><td>Final Case Deadline</td><td>' + calc.deadlineDate + ' (' + calc.extendedDays + ' calendar days, maximum allowed)</td></tr></table>' }
function caseParametersHtml(c, calc) { return '<h3>Case Details</h3><table><tr><td>Reg E Status</td><td><strong>' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E / Alternate Workflow') + '</strong></td></tr><tr><td>Manual Override</td><td>' + ((c.manualRegEStatus && c.manualRegEStatus !== 'Auto') || c.manualRoute && c.manualRoute !== 'Auto' ? 'Yes' : 'No') + '</td></tr><tr><td>Manual Route</td><td>' + (c.manualRoute || 'Auto') + '</td></tr><tr><td>Claim Type</td><td>' + c.claimType + '</td></tr><tr><td>Account</td><td>' + c.account + '</td></tr><tr><td>Total Claim Amount</td><td>' + money(c.amount) + '</td></tr><tr><td>Account Age</td><td>' + c.accountAge + '</td></tr><tr><td>Foreign / Outside U.S.</td><td>' + c.foreign + '</td></tr><tr><td>Access Device Status</td><td>' + c.deviceStatus + '</td></tr><tr><td>Prior Disputes Last 90 Days</td><td>' + c.prior + '</td></tr><tr><td>Risk Score</td><td>' + calc.score + '/100 - ' + calc.level + '<div class="risk"><span style="width:' + calc.score + '%"></span></div></td></tr></table>' + finderDatesHtml(c, calc) + '<h3>Customer Statement</h3><div class="box">' + c.statement + '</div>' }

function hasCreditDecision(c) { return !!(c.creditDecisionMade || c.provisional || c.creditRefused) }
function isFinalDecisionPosted(c) { return !!(c && (c.finalOutcomePosted || String(c.status || '').startsWith('Final Decision Made') || String(c.status || '').startsWith('Closed -') || c.auditReady)) }
function commonActionButtons(c) { return '<button class="secondary" onclick="exportSelectedCaseJson()">Export Case JSON</button><button class="secondary" onclick="startEditCase()">Edit Case</button><button class="bad" onclick="deleteCase()">Delete Case</button>' }
function renderCaseActions(c) {
  let top = document.getElementById('caseActionBar');
  let bottom = document.getElementById('caseActionBarBottom');
  if (top) { top.innerHTML = ''; top.classList.add('caseActionTopEmpty') }
  let bar = bottom || top; if (!bar) return;
  if (!c || c.auditReady) { bar.innerHTML = ''; return }
  let html = '';
  if (!c.officerDecision || c.status === 'Officer Review Needed') {
    html = '<h3>Advance Case</h3><button class="good" onclick="officerAgree()">Investigator Agrees</button><button class="warn" onclick="officerOverride()">Investigator Override</button>';
  } else if (!hasCreditDecision(c) && !c.status.includes('Final')) {
    html = '<h3>Advance Case</h3><button class="primary" onclick="postCredit()">Give Provisional Credit</button>' + commonActionButtons(c);
  } else if (isChargebackInProcess(c)) {
    html = '<h3>Advance Case</h3><button class="primary" onclick="openChargebackCase(\'' + c.id + '\')">Manage Chargeback</button>' + commonActionButtons(c);
  } else if (c.status === 'Investigation Open' || c.status === 'Chargeback Filed - Investigation Open' || c.status === 'Needs Review' || c.status === 'Ready for Credit Decision') {
    html = '<h3>Advance Case</h3><button class="dark" onclick="markReadyFinal()">Review Finished</button>' + commonActionButtons(c);
  } else if (c.status === 'Ready for Final Decision') {
    html = '<h3>Advance Case</h3><button class="good" onclick="openFinalDecision()">Final Decision</button>' + commonActionButtons(c);
  } else if (isFinalDecisionPosted(c) && !c.auditReady) {
    html = '<h3>Advance Case</h3><button class="dark" onclick="managerApprove()">Manager Sign-Off & Close Case</button>' + commonActionButtons(c);
  } else {
    html = '<h3>Case Actions</h3>' + commonActionButtons(c);
  }
  bar.innerHTML = html;
}
function renderReview() {
  let c = cur(); if (!c) return;
  if (c.auditReady && activeView === 'review') {
    document.getElementById('rTitle').textContent = 'Closed Case Locked';
    document.getElementById('rSub').textContent = 'This case is complete and is only available in Closed Cases / Log.';
    document.getElementById('workflowSteps').innerHTML = '';
    document.getElementById('reviewBody').innerHTML = '<div class="notice">Closed cases are removed from the Review workflow. Open this case from Closed Cases / Log to view details or use manager override editing.</div>';
    renderCaseActions(c); return;
  }
  let calc = classify(c); let investigatorDone = !!c.officerDecision;
  document.getElementById('rTitle').textContent = c.id + ' - ' + c.customer;
  document.getElementById('rSub').textContent = c.source + ' - ' + c.txnType + ' - ' + c.claimType + ' - ' + money(c.amount);
  document.getElementById('workflowSteps').innerHTML = renderSteps(c);
  let leftPanel = investigatorDone ? caseParametersHtml(c, calc) : '<h3>Machine Recommendation</h3><table><tr><td>Likely Reg E?</td><td><strong>' + (calc.likelyRegE ? 'Yes' : 'No') + '</strong></td></tr><tr><td>Route</td><td>' + calc.route + '</td></tr><tr><td>Risk</td><td>' + calc.score + '/100 - ' + calc.level + '<div class="risk"><span style="width:' + calc.score + '%"></span></div></td></tr><tr><td>Provisional credit deadline</td><td>' + calc.provisionalCreditDate + ' (' + calc.initialDays + ' business days)</td></tr><tr><td>Final case deadline</td><td>' + calc.deadlineDate + ' (' + calc.extendedDays + ' calendar days, maximum allowed)</td></tr><tr><td>Credit recommendation</td><td>' + calc.creditRecommendation + '</td></tr></table><div class="box">Reasoning:\n- ' + calc.reason.join('\n- ') + '\n\nSuggested tasks:\n- ' + calc.tasks.join('\n- ') + '</div>';
  let investigatorBox = '<h3>Investigator Decision</h3><table><tr><td>Decision</td><td>' + (c.officerDecision || 'Pending investigator agreement/override') + '</td></tr><tr><td>Comment</td><td>' + (c.officerComment || 'None yet') + '</td></tr><tr><td>Investigation Status</td><td>' + c.status + '</td></tr><tr><td>Credit Status</td><td>' + c.creditStatus + '</td></tr><tr><td>Final Decision</td><td>' + (c.finalDecision || 'Pending') + '</td></tr></table>' + flaggedTransactionsHtml(c);
  let rightPanel = '<h3>Operational Parameters</h3><table><tr><td>Intake Source</td><td>' + c.source + '</td></tr><tr><td>Intake Investigator</td><td>' + (c.intakeOfficer || 'N/A') + '</td></tr><tr><td>Transaction Type</td><td>' + c.txnType + '</td></tr><tr><td>Manual Override</td><td>' + ((c.manualRegEStatus && c.manualRegEStatus !== 'Auto') || c.manualRoute && c.manualRoute !== 'Auto' ? 'Yes' : 'No') + '</td></tr><tr><td>Manual Route</td><td>' + (c.manualRoute || 'Auto') + '</td></tr><tr><td>Claim Type</td><td>' + c.claimType + '</td></tr><tr><td>Reg E / Non Reg E</td><td>' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E') + '</td></tr><tr><td>Investigator Override</td><td>' + (c.officerDecision && c.officerDecision.toLowerCase().includes('override') ? 'Manual override used' : 'No manual override') + '</td></tr><tr><td>Customer Statement</td><td>' + c.statement + '</td></tr><tr><td>Dates</td><td>Txn: ' + c.txnDate + '<br>Notice: ' + c.noticeDate + '<br>Opened: ' + calc.openedDate + '<br>Provisional credit deadline: ' + calc.provisionalCreditDate + '<br>Final case deadline: ' + calc.deadlineDate + '</td></tr><tr><td>Extras</td><td>Account age: ' + c.accountAge + '<br>Foreign: ' + c.foreign + '<br>Device: ' + c.deviceStatus + '<br>Prior disputes: ' + c.prior + '</td></tr></table><h3>Comments</h3><div class="two"><input id="commentAuthor" placeholder="Investigator name" value="S. Sanz"><input id="commentText" placeholder="Add case comment"></div><label>Attach files to comment</label><input id="commentFiles" type="file" multiple><button class="secondary" onclick="addComment()">Add Comment</button>' + (c.comments.map(cm => '<div class="comment"><strong>' + cm.author + '</strong>' + cm.text + '<div class="muted mini">' + cm.time + '</div>' + commentAttachmentsHtml(cm.attachments) + '</div>').join('') || '<p class="muted">No comments yet.</p>');
  document.getElementById('reviewBody').innerHTML = '<div class="two"><div>' + leftPanel + investigatorBox + '</div><div>' + rightPanel + '</div></div><div class="caseAdvancePanel" id="caseActionBarBottom"></div><hr class="divider"><h3>Case Log</h3>' + c.events.map(e => '<div class="event">' + e.text + '<div class="muted mini">' + e.time + '</div></div>').join('');
  renderCaseActions(c);
}


/* V50 restored GL and ledger helper functions */
const CREDIT_BINS = ['GL-198190 Fraud GL', 'GL-Operations'];
function normalizeGlName(name) {
  let raw = String(name || '').trim(); let n = raw.toLowerCase();
  if (raw.startsWith('GL-198190')) return 'GL-198190 Fraud GL';
  if (raw.startsWith('GL-Operations')) return 'GL-Operations';
  if (n.includes('operation') || n.includes('recovery')) return 'GL-Operations';
  if (n.includes('fraud') || n.includes('reg e') || n.includes('zelle') || n.includes('ach') || n.includes('debit') || n.includes('atm') || n.includes('claims') || n.includes('fednow') || n.includes('rtp')) return 'GL-198190 Fraud GL';
  return 'GL-Operations';
}
function defaultCreditBin(type) { let t = String(type || '').toLowerCase(); if (t.includes('zelle') || t.includes('ach') || t.includes('debit') || t.includes('atm') || t.includes('credit') || t.includes('fraud')) return 'GL-198190 Fraud GL'; return 'GL-Operations' }
function binOptions(selected) { selected = normalizeGlName(selected); return CREDIT_BINS.map(b => '<option ' + (b === selected ? 'selected' : '') + '>' + b + '</option>').join('') }
function ledgerEntries(c) { return c.provisionalLedger || [] }
function entryType(e) { return (e.type || '').toLowerCase() }
function isChargeOffEntry(e) { let t = entryType(e); return t.includes('charge-off') || t.includes('charge off') || t.includes('bank loss') }
function isRecoveryChargeOffEntry(e) { let t = entryType(e); return t.includes('recovery charge-off') || t.includes('unrecovered provisional') }
function isPermanentEntry(e) { let t = entryType(e); return t.includes('finalized customer credit') || t.includes('permanent customer credit') || t.includes('final customer credit') }
function isExternalRecoveryEntry(e) { let t = entryType(e); return t.includes('external recovery') || t.includes('funds recovered') }
function isPendingThirdPartyEntry(e) { let t = entryType(e); return t.includes('pending third-party') || t.includes('pending third party') || t.includes('closed to customer - pending recovery') }
function isRecoveryEntry(e) { let t = entryType(e); return (t.includes('customer recovery') || t.includes('reversal') || (t.includes('recover') && !isExternalRecoveryEntry(e))) && !isPermanentEntry(e) && !isChargeOffEntry(e) && !isPendingThirdPartyEntry(e) }
function isPositiveProvisionalEntry(e) { let t = entryType(e); return Number(e.amount || 0) > 0 && !isChargeOffEntry(e) && !isPermanentEntry(e) && !isRecoveryEntry(e) && !isExternalRecoveryEntry(e) && !isPendingThirdPartyEntry(e) && !t.includes('adjustment correction') }
function ledgerCreditTotal(c) { return ledgerEntries(c).filter(isPositiveProvisionalEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerPermanentTotal(c) { return ledgerEntries(c).filter(isPermanentEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerRecoveryTotal(c) { return ledgerEntries(c).filter(isRecoveryEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerChargeOffTotal(c) { return ledgerEntries(c).filter(isChargeOffEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerPendingThirdPartyTotal(c) { return ledgerEntries(c).filter(isPendingThirdPartyEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerExternalRecoveryTotal(c) { return ledgerEntries(c).filter(isExternalRecoveryEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerRecoveryChargeOffTotal(c) { return ledgerEntries(c).filter(isRecoveryChargeOffEntry).reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0) }
function ledgerActiveProvisional(c) { return Math.max(ledgerCreditTotal(c) - ledgerPermanentTotal(c) - ledgerRecoveryTotal(c) - ledgerRecoveryChargeOffTotal(c), 0) }
function ledgerTotal(c) { return ledgerActiveProvisional(c) + ledgerPermanentTotal(c) + ledgerChargeOffTotal(c) + ledgerPendingThirdPartyTotal(c) - ledgerRecoveryTotal(c) - ledgerExternalRecoveryTotal(c) }
function provisionalBinSummary(c) { let rows = {}; ledgerEntries(c).filter(isPositiveProvisionalEntry).forEach(e => { let bin = normalizeGlName(e.bin || defaultCreditBin(caseTxnType(c))); rows[bin] = (rows[bin] || 0) + Number(e.amount || 0) }); return rows }
function provisionalBinSummaryHtml(c) {
  let rows = provisionalBinSummary(c);
  let keys = Object.keys(rows);
  if (!keys.length) return '<p class="muted">No provisional credit source bin has been posted yet.</p>';
  return '<table><tr><th>Original Provisional Credit Bin</th><th>Amount Issued</th></tr>' + keys.map(k => '<tr><td>' + k + '</td><td>' + money(rows[k]) + '</td></tr>').join('') + '</table>';
}
function postPermanentLedgerUsingSelectedBin(c, amt, result, note, selectedBin, outcome) {
  c.provisionalLedger = c.provisionalLedger || [];
  let amount = Math.abs(Number(amt || 0));
  if (amount <= 0) return;
  let todayStr = new Date().toISOString().slice(0, 10);
  let bin = selectedBin || defaultCreditBin(caseTxnType(c));
  let outcomeText = outcome || 'Charge off as bank loss';
  c.provisionalLedger.push({ date: todayStr, type: 'Finalized customer credit', transactionIndex: null, transaction: null, description: result + ' - ' + note + ' Customer is allowed to keep this credit permanently.', amount: amount, bin: bin, officer: 'Investigator' });
  if (outcomeText === 'Closed to customer - pending recovery') {
    c.provisionalLedger.push({ date: todayStr, type: 'Closed to customer - pending recovery', transactionIndex: null, transaction: null, description: 'Permanent customer credit is expected to be recovered from merchant, network, ACH originator, receiving institution, insurer, or other third party.', amount: amount, bin: bin, officer: 'Investigator' });
    c.events.push(eventObj('Permanent credit posted with pending third-party recovery for ' + money(amount) + '.'));
  } else if (outcomeText === 'Funds recovered') {
    c.provisionalLedger.push({ date: todayStr, type: 'External recovery received', transactionIndex: null, transaction: null, description: 'Permanent customer credit offset by external recovery already received.', amount: amount, bin: bin, officer: 'Investigator' });
    c.events.push(eventObj('Permanent credit posted and external recovery recorded for ' + money(amount) + '.'));
  } else {
    c.provisionalLedger.push({ date: todayStr, type: 'Bank Loss / Charge-Off', transactionIndex: null, transaction: null, description: outcomeText + ' - bank absorbs the finalized customer credit.', amount: amount, bin: bin, officer: 'Investigator' });
    c.events.push(eventObj('Permanent credit posted and bank loss / charge-off recognized for ' + money(amount) + '.'));
  }
}

function postRecoveryLedgerEntry(c, reason, recoveredAmount, chargeOffAmount, recoveryBin, chargeOffBin) {
  c.provisionalLedger = c.provisionalLedger || [];
  let todayStr = new Date().toISOString().slice(0, 10);
  recoveredAmount = Math.abs(Number(recoveredAmount || 0));
  chargeOffAmount = Math.abs(Number(chargeOffAmount || 0));
  if (recoveredAmount > 0) {
    c.provisionalLedger.push({ date: todayStr, type: 'Customer Recovery / Reversal', transactionIndex: null, transaction: null, description: 'Credit recovered or reversed from customer: ' + reason, amount: recoveredAmount, bin: recoveryBin || 'GL-Operations', officer: 'System/Investigator' });
    c.events.push(eventObj('Customer recovery / reversal ledger entry posted for ' + money(recoveredAmount) + '.'));
  }
  if (chargeOffAmount > 0) {
    c.provisionalLedger.push({ date: todayStr, type: 'Recovery Charge-Off / Unrecovered Provisional', transactionIndex: null, transaction: null, description: 'Unrecovered provisional credit recognized as bank loss: ' + reason, amount: chargeOffAmount, bin: chargeOffBin || 'GL-198190 Fraud GL', officer: 'System/Investigator' });
    c.events.push(eventObj('Recovery charge-off ledger entry posted for ' + money(chargeOffAmount) + '.'));
  }
}
function creditLedgerHtml(c) { let entries = c.provisionalLedger || []; if (!entries.length) return '<h3>Credit Ledger</h3><p class="muted">No credit ledger entries yet.</p>'; return '<h3>Credit Ledger</h3><table><tr><th>Date</th><th>Type</th><th>Description</th><th>GL</th><th>Amount</th></tr>' + entries.map(e => '<tr><td>' + e.date + '</td><td>' + e.type + '</td><td>' + e.description + '</td><td>' + e.bin + '</td><td>' + money(e.amount) + '</td></tr>').join('') + '<tr><td colspan="4"><strong>Active provisional credit</strong></td><td><strong>' + money(ledgerActiveProvisional(c)) + '</strong></td></tr><tr><td colspan="4"><strong>Finalized customer credit</strong></td><td><strong>' + money(ledgerPermanentTotal(c)) + '</strong></td></tr><tr><td colspan="4"><strong>Bank loss / charge-off</strong></td><td><strong>' + money(ledgerChargeOffTotal(c)) + '</strong></td></tr><tr><td colspan="4"><strong>Closed to customer - pending recovery</strong></td><td><strong>' + money(ledgerPendingThirdPartyTotal(c)) + '</strong></td></tr><tr><td colspan="4"><strong>External recovery received</strong></td><td><strong>' + money(ledgerExternalRecoveryTotal(c)) + '</strong></td></tr><tr><td colspan="4"><strong>Customer recovery / reversal</strong></td><td><strong>' + money(ledgerRecoveryTotal(c)) + '</strong></td></tr></table>' }

function provisionalPostingHtml(c) {
  let txns = getFlaggedTransactions(c);
  let rows = txns.map((t, i) => '<tr><td><input type="checkbox" id="pcChk' + i + '" checked></td><td>' + t.date + '</td><td>' + t.type + '</td><td>' + t.merchant + '</td><td>' + money(t.amount) + '</td><td><input id="pcAmt' + i + '" type="number" step="0.01" value="' + Number(t.amount || 0).toFixed(2) + '"></td><td><select id="pcBin' + i + '">' + binOptions(defaultCreditBin(t.type)) + '</select></td></tr>').join('');
  return '<div class="notice">Select the disputed transactions that should receive provisional credit. You can also refuse provisional credit for this case if appropriate.</div><table style="margin-top:12px"><tr><th>Credit?</th><th>Date</th><th>Type</th><th>Merchant / Recipient</th><th>Claim Amount</th><th>Credit Amount</th><th>GL</th></tr>' + rows + '</table><h3>Optional Custom Credit</h3><div class="three"><div><label>Custom amount</label><input id="pcCustomAmount" type="number" step="0.01" value="0.00"></div><div><label>Custom GL</label><select id="pcCustomBin">' + binOptions(defaultCreditBin(caseTxnType(c))) + '</select></div><div><label>Officer</label><input id="pcOfficer" value="S. Sanz"></div></div><label>Posting note</label><textarea id="pcNote" rows="3">Provisional credit posted pending final investigation.</textarea><div class="row"><button class="good" onclick="submitProvisionalCredits()">Post Selected Credit</button><button class="bad" onclick="refuseProvisionalCredit()">Refuse Provisional Credit</button><button class="secondary" onclick="backToCaseReview()">Back to Case</button></div>';
}


function addCalendarDaysISO(dateStr, days) { let d = new Date((dateStr || currentDateISO()) + 'T12:00:00'); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString().slice(0, 10) }
function mastercardResponseWindow(filedDate) { let start = addCalendarDaysISO(filedDate, 30); let end = addCalendarDaysISO(filedDate, 50); return { start, end, label: start + ' to ' + end } }
function isChargebackInProcess(c) { return !!(c && c.chargebackFiled && c.chargebackStage === 'Waiting for Mastercard response' && !c.chargebackResolved && !c.auditReady) }
function autoFileMastercardChargeback(c, amount) {
  if (!isCardChargebackCase(c)) return false;
  let filed = currentDateISO();
  let win = mastercardResponseWindow(filed);
  c.chargebackFiled = true;
  c.chargebackNetwork = 'Mastercard';
  c.chargebackFiledDate = filed;
  c.chargebackExpectedStart = win.start;
  c.chargebackExpectedEnd = win.end;
  c.chargebackAmount = Number(amount || transactionTotal(getFlaggedTransactions(c)) || 0);
  c.chargebackStage = 'Waiting for Mastercard response';
  c.chargebackResolved = false;
  c.status = 'Chargeback In Process - Waiting for Mastercard';
  let txns = getFlaggedTransactions(c).filter(t => t.type === 'Debit Card POS' || t.type === 'Credit Card');
  let lines = txns.map(t => '- ' + t.date + ' | ' + (t.network || 'Mastercard') + ' | ' + t.merchant + ' | ' + money(t.amount)).join('\n');
  let letter = 'Mastercard Chargeback Filing Package\nCase: ' + c.id + '\nCustomer: ' + c.customer + '\nAccount: ' + c.account + '\nAmount: ' + money(c.chargebackAmount) + '\nReason: ' + c.claimType + '\nFiled date: ' + filed + '\nExpected Mastercard response window: ' + win.label + '\n\nWorkflow:\n1. O.C.E.A.N confirmed the disputed transaction exists in account history.\n2. O.C.E.A.N opened the Mastercard chargeback claim automatically.\n3. Package was sent to Mastercard.\n4. Mastercard contacts the merchant for representment.\n5. If merchant does not represent, customer keeps the credit.\n6. If merchant represents/funds are returned, bank records chargeback recovery rights against the posted credit.\n\nTransactions:\n' + (lines || '- See selected case transactions');
  c.chargebackLetter = letter;
  c.events.push(eventObj('Mastercard chargeback claim opened automatically after provisional credit.'));
  c.events.push(eventObj('Chargeback package sent to Mastercard; waiting for Mastercard response between ' + win.label + '.'));
  c.comments.push(commentObj('O.C.E.A.N Chargeback', letter));
  autoNotify(c, 'Mastercard chargeback claim opened automatically. Case moved to Chargeback In Process while Mastercard contacts the merchant for representment.');
  return true;
}

function chargebackStatusHtml(c) {
  if (!isCardChargebackCase(c)) return '';
  let win = (c.chargebackExpectedStart && c.chargebackExpectedEnd) ? (c.chargebackExpectedStart + ' to ' + c.chargebackExpectedEnd) : 'Pending filing';
  let actions = '';
  if (isChargebackInProcess(c)) {
    actions = '<div class="row"><button class="good" onclick="recordMastercardNoRepresentment()">Mastercard: No Representment</button><button class="primary" onclick="recordMastercardRepresentment()">Mastercard: Merchant Represented / Funds Recovered</button></div>';
  }
  return '<h3>Chargeback Stage</h3><div class="notice">Chargeback workflow: O.C.E.A.N verifies the disputed card transaction, opens the Mastercard chargeback, sends the package to Mastercard, and waits while Mastercard contacts the merchant for representment.</div><table><tr><td>Network</td><td>' + (c.chargebackNetwork || 'Mastercard') + '</td></tr><tr><td>Status</td><td><strong>' + (c.chargebackStage || 'Not filed yet') + '</strong></td></tr><tr><td>Filed date</td><td>' + (c.chargebackFiledDate || 'Pending provisional credit') + '</td></tr><tr><td>Expected Mastercard response</td><td>' + win + ' <span class="muted">(30–50 day estimate)</span></td></tr><tr><td>Amount</td><td>' + money(c.chargebackAmount || 0) + '</td></tr></table>' + actions + (c.chargebackLetter ? '<div class="box">' + c.chargebackLetter + '</div>' : '');
}
function postCredit() {
  let c = cur();
  if (!c) return;
  if (!requireOfficer(c)) return;
  if (hasCreditDecision(c)) { alert('A provisional credit decision has already been made for this case. Use the Provisional Ledger adjustment workflow if a correction is needed.'); return; }
  let total = transactionTotal(getFlaggedTransactions(c));
  if (total < 200) {
    c.provisionalLedger = c.provisionalLedger || [];
    c.provisionalLedger.push({ date: new Date().toISOString().slice(0, 10), type: 'Provisional credit issued - low value loss', transactionIndex: null, transaction: null, description: 'Automatic provisional credit under $200 threshold; reported to GL-198190 Fraud GL.', amount: total, bin: 'GL-198190 Fraud GL', officer: 'O.C.E.A.N Auto' });
    c.provisional = true; c.creditDecisionMade = true; c.creditRefused = false; c.creditStatus = 'Automatic provisional credit posted: ' + money(total) + ' from GL-198190 Fraud GL';
    c.events.push(eventObj('Automatic provisional credit posted for claim under $200: ' + money(total) + '.'));
    c.comments.push(commentObj('O.C.E.A.N System', 'Automatic provisional credit was posted because the claim amount is under $200. The amount was reported to the GL-198190 Fraud GL.'));
    autoNotify(c, 'Provisional credit notice generated and sent automatically by O.C.E.A.N.');
    autoFileMastercardChargeback(c, total);
    render(); return;
  }
  openCaseTool('Post Provisional Credit', 'Select the transactions and GLs for provisional credit on ' + c.id + '.', provisionalPostingHtml(c));
}
function submitProvisionalCredits() {
  let c = cur(); if (!c) return;
  let txns = getFlaggedTransactions(c); let posted = 0; let entries = 0; let todayStr = new Date().toISOString().slice(0, 10); let officer = (document.getElementById('pcOfficer') || {}).value || 'Officer'; let note = (document.getElementById('pcNote') || {}).value || 'Provisional credit posted pending final investigation.';
  c.provisionalLedger = c.provisionalLedger || [];
  txns.forEach((t, i) => { let chk = document.getElementById('pcChk' + i); if (chk && chk.checked) { let amt = Number((document.getElementById('pcAmt' + i) || {}).value || 0); if (amt > 0) { let bin = (document.getElementById('pcBin' + i) || {}).value || defaultCreditBin(t.type); c.provisionalLedger.push({ date: todayStr, type: 'Provisional credit issued', transactionIndex: i, transaction: t, description: note, amount: amt, bin: bin, officer: officer }); posted += amt; entries++; } } });
  let custom = Number((document.getElementById('pcCustomAmount') || {}).value || 0); if (custom > 0) { let bin = (document.getElementById('pcCustomBin') || {}).value || defaultCreditBin(caseTxnType(c)); c.provisionalLedger.push({ date: todayStr, type: 'Custom provisional credit issued', transactionIndex: null, transaction: null, description: note, amount: custom, bin: bin, officer: officer }); posted += custom; entries++; }
  if (!entries) { alert('Select at least one transaction or enter a custom amount, or use Refuse Provisional Credit.'); return; }
  c.provisional = true; c.creditDecisionMade = true; c.creditRefused = false; c.creditStatus = 'Provisional credit posted: ' + money(posted) + '; active exposure ' + money(ledgerActiveProvisional(c));
  c.events.push(eventObj('Provisional credit posted: ' + money(posted) + ' across ' + entries + ' ledger entr' + (entries === 1 ? 'y' : 'ies') + '.'));
  c.comments.push(commentObj(officer, 'Provisional credit posted. ' + note));
  autoNotify(c, 'Provisional credit letter generated and sent automatically by O.C.E.A.N.');
  autoFileMastercardChargeback(c, posted);
  save(); render(); backToCaseReview();
}
function refuseProvisionalCredit() {
  let c = cur(); if (!c) return;
  let reason = prompt('Reason for refusing provisional credit:', 'Provisional credit refused based on case facts and current policy review.');
  if (reason === null) return;
  c.creditDecisionMade = true; c.creditRefused = true; c.provisional = false; c.creditStatus = 'Provisional credit refused';
  c.events.push(eventObj('Provisional credit refused. Reason: ' + reason));
  c.comments.push(commentObj('Officer', reason));
  autoNotify(c, 'Provisional credit decision notice generated automatically by O.C.E.A.N.');
  save(); render(); backToCaseReview();
}
function adjustmentHtml(c) {
  return '<div class="notice">Use this to correct a provisional credit posting mistake. Adjustments are added as new ledger entries so the history stays intact.</div>' + creditLedgerHtml(c) + '<h3>Post Adjustment</h3><div class="three"><div><label>Adjustment amount</label><input id="adjAmount" type="number" step="0.01" value="0.00"></div><div><label>Funding / loss bin</label><select id="adjBin">' + binOptions(defaultCreditBin(caseTxnType(c))) + '</select></div><div><label>Officer</label><input id="adjOfficer" value="S. Sanz"></div></div><label>Adjustment reason</label><textarea id="adjReason" rows="3">Correction to provisional credit ledger.</textarea><div class="row"><button class="primary" onclick="submitProvisionalAdjustment()">Post Adjustment</button><button class="secondary" onclick="setTabByIndex(5,\'ledger\')">Back to Ledger</button><button class="secondary" onclick="selectCase(\'' + c.id + '\')">Go to Case</button></div>';
}
function openProvisionalAdjustment(caseId) {
  let c = cases.find(x => x.id === caseId); if (!c) return; if (!canAdjustCredit(c)) { alert('Credit adjustments are locked for this case. Only open cases with active provisional credit can be adjusted.'); return } selectedId = c.id; openCaseTool('Provisional Credit Adjustment', 'Correct provisional credit activity for ' + c.id + ' - ' + c.customer, adjustmentHtml(c));
}
function submitProvisionalAdjustment() {
  let c = cur(); if (!c) return; if (!canAdjustCredit(c)) { alert('Credit adjustments are locked for this case.'); return } let amt = Number((document.getElementById('adjAmount') || {}).value || 0); if (!amt) { alert('Enter a positive amount for additional credit or a negative amount for a reversal/correction.'); return; } let bin = (document.getElementById('adjBin') || {}).value || defaultCreditBin(caseTxnType(c)); let officer = (document.getElementById('adjOfficer') || {}).value || 'Officer'; let reason = (document.getElementById('adjReason') || {}).value || 'Correction to provisional credit ledger.'; c.provisionalLedger = c.provisionalLedger || []; c.provisionalLedger.push({ date: new Date().toISOString().slice(0, 10), type: amt < 0 ? 'Credit adjustment / reversal' : 'Credit adjustment / additional provisional credit', transactionIndex: null, transaction: null, description: reason, amount: amt, bin: bin, officer: officer }); c.provisional = ledgerCreditTotal(c) > 0; c.creditDecisionMade = true; c.creditStatus = 'Credit adjusted; active provisional exposure ' + money(ledgerActiveProvisional(c)); c.events.push(eventObj('Provisional credit adjustment posted: ' + money(amt) + '. Reason: ' + reason)); c.comments.push(commentObj(officer, 'Provisional credit adjustment posted: ' + money(amt) + '. ' + reason)); autoNotify(c, 'Customer credit correction notice generated automatically by O.C.E.A.N.'); save(); render(); openProvisionalAdjustment(c.id);
}

function addToBinTotals(binTotals, bin, amount) { bin = bin || 'Unassigned Bin'; binTotals[bin] = (binTotals[bin] || 0) + Number(amount || 0) }
function currentBinTotals() { let binTotals = {}; cases.forEach(c => { let active = ledgerActiveProvisional(c); let provByBin = provisionalBinSummary(c); let provTotal = Object.values(provByBin).reduce((a, v) => a + Number(v || 0), 0); if (active > 0 && provTotal > 0) { Object.entries(provByBin).forEach(([bin, val]) => addToBinTotals(binTotals, bin, active * (Number(val || 0) / provTotal))) } ledgerEntries(c).forEach(e => { if (isPermanentEntry(e)) addToBinTotals(binTotals, e.bin, Math.abs(Number(e.amount || 0))); else if (isChargeOffEntry(e)) addToBinTotals(binTotals, e.bin, Math.abs(Number(e.amount || 0))); else if (isPendingThirdPartyEntry(e)) addToBinTotals(binTotals, e.bin, Math.abs(Number(e.amount || 0))); else if (isExternalRecoveryEntry(e)) addToBinTotals(binTotals, e.bin, -Math.abs(Number(e.amount || 0))); else if (isRecoveryEntry(e)) addToBinTotals(binTotals, e.bin, -Math.abs(Number(e.amount || 0))); }); }); return binTotals }

function isCaseClosedForLedger(c) { return !!(c && c.auditReady) }
function ledgerNetCreditIssued(c) { return ledgerEntries(c).filter(e => { let t = entryType(e); return t.includes('provisional credit issued') || t.includes('custom provisional credit issued') || t.includes('credit adjustment') }).reduce((a, e) => a + Number(e.amount || 0), 0) }
function ledgerRecoveredTotalAny(c) { return ledgerExternalRecoveryTotal(c) + ledgerRecoveryTotal(c) }
function ledgerFinalResolvedTotal(c) { return Math.min(Math.max(ledgerNetCreditIssued(c), 0), ledgerPermanentTotal(c) + ledgerChargeOffTotal(c) + ledgerPendingThirdPartyTotal(c) + ledgerRecoveredTotalAny(c) + ledgerRecoveryChargeOffTotal(c)) }
function ledgerOpenCreditAtRiskForCase(c) { return Math.max(ledgerNetCreditIssued(c) - ledgerFinalResolvedTotal(c), 0) }
function postedCreditExposure(c) { return Math.max(ledgerNetCreditIssued(c), ledgerCreditTotal(c), 0) }
function ledgerTotalExposure() { return cases.reduce((a, c) => a + postedCreditExposure(c), 0) }
function ledgerCreditAtRisk() { return cases.filter(c => !isCaseClosedForLedger(c)).reduce((a, c) => a + ledgerOpenCreditAtRiskForCase(c), 0) }
function ledgerClosedRecovered(c) { let exposure = postedCreditExposure(c); let recovered = ledgerRecoveredTotalAny(c); return Math.min(Math.max(recovered, 0), Math.max(exposure, 0)) }
function ledgerLossForClosedCase(c) { if (!isCaseClosedForLedger(c)) return 0; let exposure = postedCreditExposure(c); let recovered = ledgerClosedRecovered(c); if (recovered > 0) return 0; let explicitLoss = ledgerChargeOffTotal(c); if (explicitLoss > 0) return Math.min(explicitLoss, exposure || explicitLoss); return Math.max(exposure, 0) }
function ledgerLosses() { return cases.filter(isCaseClosedForLedger).reduce((a, c) => a + ledgerLossForClosedCase(c), 0) }
function ledgerFundsRecoveredClosed() { return cases.filter(isCaseClosedForLedger).reduce((a, c) => a + ledgerClosedRecovered(c), 0) }
function canAdjustCredit(c) { return !!(c && !c.auditReady && c.provisional && !c.status.includes('Final') && c.status !== 'Ready for Final Decision' && ledgerOpenCreditAtRiskForCase(c) > 0) }

function dedupeLedgerRows(rows) { let seen = new Set(); return rows.filter(r => { let key = [r.caseId, r.entry.date, r.entry.type, String(r.entry.description || ''), String(r.entry.bin || ''), String(r.entry.amount || 0)].join('|'); if (seen.has(key)) return false; seen.add(key); return true }) }
function renderLedger() { let el = document.getElementById('ledgerBody'); if (!el) return; let totalExposure = ledgerTotalExposure(); let creditAtRisk = ledgerCreditAtRisk(); let losses = ledgerLosses(); let recovered = ledgerFundsRecoveredClosed(); let ledgerRows = []; cases.forEach(c => (c.provisionalLedger || []).forEach(e => ledgerRows.push({ caseId: c.id, customer: c.customer, account: c.account, claimTotal: transactionTotal(getFlaggedTransactions(c)), entry: e, caseObj: c }))); let historyRows = applySort(dedupeLedgerRows(ledgerRows.filter(matchesLedgerRow)), ledgerSort, (r, f) => f === 'caseId' ? r.caseId : r.entry.date); let adjustableCount = cases.filter(canAdjustCredit).length; el.innerHTML = '<div class="four"><div class="card kpi"><span class="muted">Total Ledger Exposure</span><strong>' + money(totalExposure) + '</strong></div><div class="card kpi"><span class="muted">Credit at Risk</span><strong>' + money(creditAtRisk) + '</strong></div><div class="card kpi"><span class="muted">Losses</span><strong>' + money(losses) + '</strong></div><div class="card kpi"><span class="muted">Funds Recovered</span><strong>' + money(recovered) + '</strong></div></div><div class="notice">Ledger entries are shown once per posted event. Open a case for the full timeline and supporting notes.' + (adjustableCount ? '<br>There are ' + adjustableCount + ' open cases with adjustable credit.' : '') + '</div><h3>Ledger Activity</h3><table><tr><th>Date<button class="sortBtn" onclick="toggleLedgerSort(&quot;date&quot;)">' + sortArrow(ledgerSort, 'date') + '</button></th><th>Case<button class="sortBtn" onclick="toggleLedgerSort(&quot;caseId&quot;)">' + sortArrow(ledgerSort, 'caseId') + '</button><input class="filterInput" placeholder="Search case #" value="' + ledgerFilters.caseId + '" oninput="setLedgerFilter(&quot;caseId&quot;,this.value)"></th><th>Customer<input class="filterInput" placeholder="Search customer" value="' + ledgerFilters.customer + '" oninput="setLedgerFilter(&quot;customer&quot;,this.value)"></th><th>Type</th><th>Entry Summary</th><th>Amount<input class="filterInput" placeholder="Search amount" value="' + ledgerFilters.amount + '" oninput="setLedgerFilter(&quot;amount&quot;,this.value)"></th><th>GL</th><th>Action</th></tr>' + (historyRows.map(r => '<tr><td>' + r.entry.date + '</td><td>' + r.caseId + '</td><td>' + r.customer + '</td><td>' + r.entry.type + '</td><td>' + String(r.entry.description || '').slice(0, 90) + (String(r.entry.description || '').length > 90 ? '…' : '') + '</td><td>' + money(r.entry.amount) + '</td><td>' + (normalizeGlName(r.entry.bin)) + '</td><td><button class="secondary smallBtn" onclick="selectCase(&quot;' + r.caseId + '&quot;)">Open Case</button></td></tr>').join('') || '<tr><td colspan="8">No ledger history rows match your filters.</td></tr>') + '</table>' }
function requireOfficer(c) { if (!c.officerDecision) { alert('Investigator must agree with or override the machine recommendation before investigation actions.'); return false } return true } function officerAgree() { let c = cur(), calc = classify(c); let note = prompt('Investigator comment for agreement:', 'I agree with the machine recommendation: ' + calc.route + '.'); if (note === null) return; c.officerDecision = 'Investigator agreed with machine'; c.officerComment = note; c.status = 'Investigation Open'; c.openedDate = c.openedDate || c.noticeDate; c.events.push(eventObj('Investigator agreed with machine recommendation')); c.events.push(eventObj('Investigation started')); autoNotify(c, 'Your claim is being reviewed by the disputes team.'); render() } function officerOverride() { startManualOverride() } function markReadyFinal() { let c = cur(); if (isFinalDecisionPosted(c)) { alert('This case already has a final decision posted.'); return } if (!requireOfficer(c)) return; if (isChargebackInProcess(c)) { alert('This card case is waiting for Mastercard. Resolve the chargeback response before finishing the investigation.'); return } if (!hasCreditDecision(c)) { alert('Make a provisional credit decision before finishing the review.'); return } let note = prompt('Investigation review summary:', 'Evidence reviewed; ready for final decision.'); if (!note) return; c.status = 'Ready for Final Decision'; c.events.push(eventObj('Investigation review finished: ' + note)); c.comments.push(commentObj('Investigator', note)); render() }
function openFinalDecision() {
  let c = cur();
  if (!c) return;
  if (!requireOfficer(c)) return;
  if (isFinalDecisionPosted(c)) { alert('A final decision has already been posted for this case. Final ledger outcomes are locked to prevent duplicate posting.'); return }
  let exposure = Math.max(ledgerNetCreditIssued(c), ledgerCreditTotal(c), transactionTotal(getFlaggedTransactions(c)), 0);
  openCaseTool('Final Decision', 'Choose one final outcome. The ledger posts one final outcome entry so recovered funds, losses, and pending recovery are not duplicated.', renderSimpleFinalDecisionPanel(c, exposure));
}
function finalOutcomeHelpText(outcome) {
  if (outcome === 'Recover credit given') return 'Use when the bank recovered/reversed the credit already given to the customer. This increases Funds Recovered once the case is closed.';
  if (outcome === 'Customer keeps credit') return 'Use when the customer keeps the credit and the bank is taking the loss. This increases Losses once the case is closed.';
  return 'Use when the customer is closed out and keeps the credit for now, but the bank is still waiting on outside recovery. This does not count as recovered funds unless recovery is later posted.';
}
function renderSimpleFinalDecisionPanel(c, exposure) {
  let alreadyRecovered = ledgerRecoveredTotalAny(c);
  let remaining = Math.max(Number(exposure || 0) - alreadyRecovered, 0);
  return '<div class="notice">Pick the one thing that happened. The old split between customer outcome and bank accounting outcome has been removed to prevent duplicate ledger entries.</div>'
    + '<table style="margin-top:12px"><tr><td>Total claim amount</td><td><strong>' + money(transactionTotal(getFlaggedTransactions(c))) + '</strong></td></tr><tr><td>Credit issued / ledger exposure</td><td><strong>' + money(exposure) + '</strong></td></tr><tr><td>Funds already recorded as recovered</td><td><strong>' + money(alreadyRecovered) + '</strong></td></tr><tr><td>Remaining unresolved amount</td><td><strong>' + money(remaining) + '</strong></td></tr></table>'
    + '<h3>Final Outcome</h3>'
    + '<div class="two"><div><label>What happened?</label><select id="finalSimpleOutcome" onchange="syncSimpleFinalDecision(' + Number(exposure || 0).toFixed(2) + ')"><option>Recover credit given</option><option>Customer keeps credit</option><option>Customer keeps credit - pending recovery</option></select></div><div><label>Decision amount</label><input id="finalDecisionAmount" type="number" step="0.01" value="' + Number(exposure || 0).toFixed(2) + '" oninput="syncSimpleFinalDecision(' + Number(exposure || 0).toFixed(2) + ')"></div></div>'
    + '<div id="finalOutcomeHelp" class="notice">' + finalOutcomeHelpText('Recover credit given') + '</div>'
    + '<div class="two"><div><label>Recovered amount to post now</label><input id="finalRecoveredAmount" type="number" step="0.01" value="' + Number(remaining || 0).toFixed(2) + '" oninput="syncSimpleFinalDecision(' + Number(exposure || 0).toFixed(2) + ')"></div><div><label>GL</label><select id="finalAccountingBin">' + binOptions(defaultCreditBin(caseTxnType(c))) + '</select></div></div>'
    + '<label>Final decision note</label><textarea id="finalDecisionNote" rows="4">Final decision completed. Outcome selected based on investigation results.</textarea>'
    + '<div class="row"><button class="good" onclick="submitSimpleFinalDecision()">Post Final Decision</button><button class="secondary" onclick="backToCaseReview()">Cancel</button></div>';
}
function syncSimpleFinalDecision(exposure) {
  let outcome = document.getElementById('finalSimpleOutcome')?.value || 'Recover credit given';
  let amount = Number(document.getElementById('finalDecisionAmount')?.value || 0);
  if (amount < 0) amount = 0;
  let help = document.getElementById('finalOutcomeHelp'); if (help) help.textContent = finalOutcomeHelpText(outcome);
  let rec = document.getElementById('finalRecoveredAmount');
  if (rec) {
    if (outcome === 'Recover credit given') {
      let c = cur(); let already = ledgerRecoveredTotalAny(c); let remaining = Math.max(amount - already, 0);
      if (!rec.matches(':focus')) rec.value = remaining.toFixed(2);
      rec.disabled = false;
    } else {
      rec.value = '0.00'; rec.disabled = true;
    }
  }
}
function submitSimpleFinalDecision() {
  let c = cur(); if (!c) return;
  if (isFinalDecisionPosted(c)) { alert('A final decision has already been posted for this case.'); return }
  let outcome = document.getElementById('finalSimpleOutcome').value;
  let amount = Number(document.getElementById('finalDecisionAmount').value || 0);
  if (amount <= 0) { alert('Enter the final decision amount.'); return }
  let bin = normalizeGlName(document.getElementById('finalAccountingBin').value || defaultCreditBin(caseTxnType(c)));
  let note = document.getElementById('finalDecisionNote').value || 'Final decision completed.';
  let date = currentDateISO();
  c.provisionalLedger = c.provisionalLedger || [];
  let alreadyRecovered = ledgerRecoveredTotalAny(c);
  if (outcome === 'Recover credit given') {
    let recovered = Number(document.getElementById('finalRecoveredAmount').value || 0);
    if (recovered < 0) recovered = 0;
    let maxAdditional = Math.max(amount - alreadyRecovered, 0);
    if (recovered > maxAdditional) recovered = maxAdditional;
    if (recovered > 0) c.provisionalLedger.push({ date, type: 'Funds Recovered', amount: recovered, bin: 'GL-Operations', description: note + ' Final outcome: recover credit given.' });
    c.finalDecision = 'Recover credit given';
    c.status = 'Final Decision Made - Credit Recovered';
    c.creditStatus = 'Credit recovered ' + money(Math.min(amount, alreadyRecovered + recovered)) + ' of ' + money(amount) + '.';
    autoNotify(c, 'Final recovery notice generated and sent; recovered funds have been recorded once in the ledger.');
    c.events.push(eventObj('Final decision posted: recover credit given. Additional recovered posted: ' + money(recovered) + '.'));
  } else if (outcome === 'Customer keeps credit') {
    c.provisionalLedger.push({ date, type: 'Bank Loss / Charge-Off', amount, bin, description: note + ' Final outcome: customer keeps credit.' });
    c.finalDecision = 'Customer keeps credit';
    c.status = 'Final Decision Made - Customer Keeps Credit';
    c.creditStatus = 'Customer keeps credit; loss recorded ' + money(amount) + '.';
    autoNotify(c, 'Final approval notice generated and sent; customer keeps the credit.');
    c.events.push(eventObj('Final decision posted: customer keeps credit. Loss recorded ' + money(amount) + '.'));
  } else {
    c.provisionalLedger.push({ date, type: 'Closed to Customer - Pending Recovery', amount, bin, description: note + ' Final outcome: customer keeps credit while bank recovery remains pending.' });
    c.finalDecision = 'Customer keeps credit - pending recovery';
    c.status = 'Final Decision Made - Pending Recovery';
    c.creditStatus = 'Customer closed; pending recovery ' + money(amount) + '.';
    autoNotify(c, 'Customer closure notice generated and sent; recovery remains pending on the bank side.');
    c.events.push(eventObj('Final decision posted: customer keeps credit with pending recovery ' + money(amount) + '.'));
  }
  c.finalOutcomePosted = true;
  c.finalOutcomeAmount = amount;
  c.finalOutcomeType = outcome;
  c.events.push(eventObj('Case moved to manager review queue'));
  c.comments.push(commentObj('Final Decision', note + ' Outcome: ' + outcome + '. Amount: ' + money(amount) + '.'));
  save(); render(); backToCaseReview();
}
function openFinalPermanentDecision() { openFinalDecision() } function openFinalRecoveryDecision() { openFinalDecision() } function submitUnifiedFinalDecision() { submitSimpleFinalDecision() }
function managerApprove() { let c = cur(); if (!c.status.includes('Final')) { alert('Manager sign-off should occur after final decision.'); return } let note = prompt('Manager close comment:', 'Manager reviewed final decision, ledger, customer notices, and chargeback/recovery documentation. Case closed.'); if (note === null) return; c.managerReviewed = true; c.auditReady = true; c.closedDate = currentDateISO(); c.status = 'Closed - Manager Signed Off'; c.events.push(eventObj('Manager sign-off completed and case moved to Closed Cases / Log: ' + note)); c.events.push(eventObj('Reg E retention control: closed case log retains evidence of compliance for at least 2 years.')); c.comments.push(commentObj('Manager', note)); selectedAuditId = c.id; selectedId = c.id; save(); render(); openAuditCase(c.id) }
function markAuditReady() { managerApprove() }
function addComment() { let c = cur(); let author = document.getElementById('commentAuthor').value || 'Officer'; let text = document.getElementById('commentText').value; let attachments = getCommentAttachments(); if (!text && !attachments.length) { alert('Enter a comment or attach at least one file.'); return } c.comments.push({ ...commentObj(author, text || 'File attachment added'), attachments }); c.events.push(eventObj('Comment added by ' + author + (attachments.length ? ' with ' + attachments.length + ' attachment(s)' : ''))); render() }


function openChargebackCase(id) { markCaseViewed(id); selectedId = id; activeView = 'chargeback'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('chargeback').classList.add('active'); document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active')); let btn = [...document.querySelectorAll('.tabs button')].find(b => b.textContent.includes('Chargeback')); if (btn) btn.classList.add('active'); render() }
function matchesChargebackCase(c) {
  let v = { caseId: c.id, customer: c.customer, account: c.account, amount: String(c.chargebackAmount || 0) + ' ' + money(c.chargebackAmount || 0) };
  return Object.entries(chargebackFilters).every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f));
}
function chargebackCasePanel(c) {
  let win = (c.chargebackExpectedStart && c.chargebackExpectedEnd) ? (c.chargebackExpectedStart + ' to ' + c.chargebackExpectedEnd) : 'Not calculated';
  return compactCaseCard(c, { title: c.id, subtitle: c.customer + ' • ' + c.account, amount: money(c.chargebackAmount || 0), status: c.chargebackStage || c.status, meta: [c.chargebackNetwork || 'Mastercard', win + ' (30–50 days)'], footer: c.chargebackFiledDate ? ('Filed ' + c.chargebackFiledDate) : 'Mastercard response pending', badgeText: 'Chargeback', badgeClass: 'orange', actions: '<button class="good smallBtn" onclick="event.stopPropagation();selectedId=\'' + c.id + '\';recordMastercardNoRepresentment()">No representment</button><button class="primary smallBtn" onclick="event.stopPropagation();selectedId=\'' + c.id + '\';recordMastercardRepresentment()">Recovered</button><button class="secondary smallBtn" onclick="event.stopPropagation();selectCase(\'' + c.id + '\')">Open case</button>', openHandler: "selectCase('" + c.id + "')" });
}
function renderChargeback() {
  let el = document.getElementById('chargebackBody');
  if (!el) return;
  let rows = getChargebackQueueCases(cases, chargebackFilters);
  el.innerHTML = '<div class="notice">Cases enter this queue automatically after provisional credit is posted on a Mastercard debit/credit card dispute. Expected response is calculated as 30–50 calendar days from the filing date.</div>'
    + (rows.length ? rows.map(chargebackCasePanel).join('') : '<div class="notice">No Mastercard chargebacks are currently waiting for response.</div>');
}

function compactCaseCard(c, opts) {
  opts = opts || {};
  let title = opts.title || c.id;
  let subtitle = opts.subtitle || (c.customer + ' • ' + c.account);
  let amount = opts.amount || money(c.amount);
  let status = opts.status || c.status;
  let meta = (opts.meta || []).filter(Boolean).join(' · ');
  let footer = opts.footer || '';
  let handler = opts.openHandler || "selectCase('" + c.id + "')";
  let badgeText = opts.badgeText || '';
  let badgeClass = opts.badgeClass || '';
  let actions = opts.actions || '';
  let badgeHtml = badgeText ? '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' : badge(c);
  return '<div class="card pad" style="margin-top:12px;cursor:pointer" onclick="' + handler + '">'
    + '<div class="between"><div><strong>' + title + '</strong> ' + badgeHtml
    + '<div class="muted">' + subtitle + '</div></div>'
    + '<div style="text-align:right"><strong>' + amount + '</strong>'
    + (meta ? '<div class="muted mini">' + meta + '</div>' : '')
    + '</div></div>'
    + (footer ? '<div class="muted mini" style="margin-top:6px">' + footer + '</div>' : '')
    + (actions ? '<div class="row" style="margin-top:8px">' + actions + '</div>' : '')
    + '</div>';
}

function renderCompactCaseCards(containerId, rows, emptyText, cardHtmlFn) {
  let el = document.getElementById(containerId);
  if (!el) return;
  let resolvedRows = Array.isArray(rows) ? rows : [];
  el.innerHTML = resolvedRows.length
    ? resolvedRows.map(c => cardHtmlFn(c)).join('')
    : (emptyText ? '<div class="notice">' + emptyText + '</div>' : '<div class="notice">No matching cases.</div>');
}
function recordMastercardNoRepresentment() {
  let c = cur(); if (!c) return;
  let note = prompt('Mastercard response note:', 'Mastercard returned no merchant representment. Customer keeps the provisional credit.');
  if (note === null) return;
  c.chargebackResolved = true;
  c.chargebackStage = 'Resolved - No merchant representment';
  c.chargebackResolvedDate = currentDateISO();
  c.status = 'Ready for Final Decision';
  c.events.push(eventObj('Mastercard response recorded: no merchant representment. Customer keeps credit.'));
  c.comments.push(commentObj('Mastercard Response', note));
  autoNotify(c, 'Mastercard completed chargeback review with no merchant representment. Case is ready for final customer-credit decision.');
  save(); render(); selectCase(c.id);
}
function recordMastercardRepresentment() {
  let c = cur(); if (!c) return;
  let amount = Number(prompt('Amount Mastercard/merchant returned or confirmed recoverable:', String(c.chargebackAmount || transactionTotal(getFlaggedTransactions(c)) || 0)) || 0);
  if (amount < 0) return;
  let note = prompt('Mastercard response note:', 'Merchant represented / funds recovered through Mastercard chargeback. Bank has chargeback recovery rights against the posted provisional credit.');
  if (note === null) return;
  c.chargebackResolved = true;
  c.chargebackStage = 'Resolved - Merchant represented / funds recovered';
  c.chargebackResolvedDate = currentDateISO();
  c.chargebackRecoveredAmount = amount;
  c.provisionalLedger = c.provisionalLedger || [];
  if (amount > 0) c.provisionalLedger.push({ date: currentDateISO(), type: 'Funds Recovered', transactionIndex: null, transaction: null, description: 'Mastercard chargeback response: merchant represented/funds recovered. ' + note, amount: amount, bin: 'GL-Operations', officer: 'O.C.E.A.N Chargeback' });
  c.status = 'Ready for Final Decision';
  c.events.push(eventObj('Mastercard response recorded: merchant represented/funds recovered ' + money(amount) + '.'));
  c.comments.push(commentObj('Mastercard Response', note + ' Recovered amount: ' + money(amount)));
  autoNotify(c, 'Mastercard completed chargeback review and funds were recovered or confirmed recoverable. Case is ready for final decision.');
  save(); render(); selectCase(c.id);
}
function matchesRecoveryCase(c) {
  let v = { caseId: c.id, customer: c.customer, account: c.account, amount: String(ledgerPendingThirdPartyTotal(c)) + ' ' + money(ledgerPendingThirdPartyTotal(c)) };
  return Object.entries(recoveryFilters).every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(f));
}
function renderRecovery() {
  let rows = cases.filter(c => ledgerPendingThirdPartyTotal(c) > 0).filter(matchesRecoveryCase);
  renderCompactCaseCards('recoveryBody', rows, 'No pending recovery cases match the current filters.', (c) => compactCaseCard(c, { title: c.id, subtitle: c.customer + ' • ' + c.account, amount: money(ledgerPendingThirdPartyTotal(c)), status: c.status, meta: [c.txnType || caseTxnType(c), c.status], footer: 'Pending third-party recovery', openHandler: "selectCase('" + c.id + "')" }));
}
function renderManager() {
  let rows = applySort(cases.filter(isManagerCase).filter(matchesManager), managerSort, (c, f) => f === 'caseId' ? c.id : c.noticeDate);
  renderCompactCaseCards('managerQueue', rows, 'No manager review cases are available.', (c) => compactCaseCard(c, { title: c.id, subtitle: c.customer + ' • ' + c.account, amount: money(c.amount), status: c.finalDecision || c.status, meta: [c.noticeDate, c.txnType || caseTxnType(c)], footer: c.finalDecision ? c.finalDecision : c.status, openHandler: "selectCase('" + c.id + "')" }));
}

function renderAudit() {
  let rows = applySort(cases.filter(isAuditCase).filter(matchesAudit), auditSort, (c, f) => f === 'caseId' ? c.id : c.noticeDate);
  renderCompactCaseCards('auditTable', rows, 'No closed cases are available.', (c) => { let calc = classify(c); return compactCaseCard(c, { title: c.id, subtitle: c.customer + ' • ' + c.account, amount: money(c.amount), status: c.status, meta: [c.lastViewedLabel || c.lastViewedAt || c.noticeDate, (calc.likelyRegE ? 'Reg E' : 'Non Reg E')], badgeText: c.auditReady ? 'Closed' : 'Review', badgeClass: c.auditReady ? 'green' : 'orange', footer: caseTxnType(c), openHandler: "openAuditCase('" + c.id + "')" }) });
}

function renderAuditDetail() { let c = cases.find(x => x.id === selectedAuditId); let el = document.getElementById('auditDetailFull') || document.getElementById('auditDetail'); if (!el) return; if (!c) { el.innerHTML = '<div class="notice auditDetail">Select a case from the closed case table or audit queue to view detailed logs.</div>'; return } let calc = classify(c); el.innerHTML = '<div class="between"><div><h3>Closed Case Log: ' + c.id + ' - ' + c.customer + '</h3><p class="muted">Account: ' + c.account + ' - ' + c.source + ' - ' + (calc.likelyRegE ? 'Reg E' : 'Non Reg E') + ' - Notice: ' + c.noticeDate + '</p></div><div class="row"><button class="secondary" onclick="startEditCase()">Manager Edit / Override</button><button class="secondary" onclick="activeView=\'audit\';selectedAuditId=null;document.querySelectorAll(\'.view\').forEach(v=>v.classList.remove(\'active\'));document.getElementById(\'audit\').classList.add(\'active\');render()">Back to Closed Cases / Log</button></div></div>' + finderDatesHtml(c, calc) + '<table><tr><td>Status</td><td>' + c.status + '</td></tr><tr><td>Final decision</td><td>' + (c.finalDecision || 'Pending') + '</td></tr><tr><td>Credit status</td><td>' + c.creditStatus + '</td></tr><tr><td>Manager reviewed</td><td>' + (c.managerReviewed ? 'Yes' : 'No') + '</td></tr><tr><td>Audit ready</td><td>' + (c.auditReady ? 'Yes' : 'No') + '</td></tr></table>' + flaggedTransactionsHtml(c) + creditLedgerHtml(c) + '<h4>Events</h4>' + c.events.map(e => '<div class="event">' + e.text + '<div class="muted mini">' + e.time + '</div></div>').join('') + '<h4>Comments</h4>' + (c.comments.map(cm => '<div class="comment"><strong>' + cm.author + '</strong>' + cm.text + '<div class="muted mini">' + cm.time + '</div>' + commentAttachmentsHtml(cm.attachments) + '</div>').join('') || '<p class="muted">No comments.</p>') }
function resetNewCaseForm() { let c = document.getElementById('customer'); if (c) c.value = 'New Demo Customer'; let a = document.getElementById('account'); if (a) a.value = '111'; let n = document.getElementById('noticeDate'); if (n) n.value = currentDateISO(); let st = document.getElementById('statement'); if (st) st.value = 'Customer says they did not authorize this transaction.'; loadAccountFromInput(false); renderTransactionRows([defaultTransaction()]); setManualControls(null); liveCalc(); }
function resetDemo() { if (confirm('Reset all demo cases?')) { cases = JSON.parse(JSON.stringify(seed)); selectedId = cases[0].id; selectedAuditId = null; editCaseId = null; queueFilter = 'all'; dashboardFilters = { caseId: '', source: '', customer: '', account: '', status: '', txnType: '', claimType: '', minAmount: '', maxAmount: '' }; auditFilters = { caseId: '', source: '', customer: '', account: '', status: '', txnType: '', claimType: '', dailyDate: '', minAmount: '', maxAmount: '', amount: '' }; ledgerFilters = { caseId: '', customer: '', account: '', amount: '' }; recoveryFilters = { caseId: '', customer: '', account: '', amount: '' }; chargebackFilters = { caseId: '', customer: '', account: '', amount: '' }; managerFilters = { caseId: '', customer: '', account: '', amount: '', status: '' }; queueSort = { field: 'noticeDate', direction: 'desc' }; dashboardSort = { field: 'noticeDate', direction: 'desc' }; auditSort = { field: 'noticeDate', direction: 'desc' }; managerSort = { field: 'noticeDate', direction: 'desc' }; ledgerSort = { field: 'date', direction: 'desc' };['queueDateFrom', 'queueDateTo', 'queueMinAmount', 'queueMaxAmount', 'dashboardDateFrom', 'dashboardDateTo', 'dashboardMinAmount', 'dashboardMaxAmount', 'auditDailyDateFilter', 'auditMinAmount', 'auditMaxAmount'].forEach(id => { let el = document.getElementById(id); if (el) el.value = '' }); save(); render() } }
/* V40 intake upgrade: account lookup, case-type workflow, and transaction selection from account history */
const MOCK_ACCOUNTS = {
  '5550001234': {
    customer: 'Sofia Ramirez', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Still in possession', prior: 0, phone: '(305) 555-0198', email: 'sofia.ramirez@example.com', history: [
      { date: '2026-06-22', type: 'Zelle / P2P', merchant: 'Zelle to J. Morales', amount: 450.00 },
      { date: '2026-06-21', type: 'Zelle / P2P', merchant: 'Zelle to Unknown Recipient', amount: 225.00 },
      { date: '2026-06-19', type: 'ACH Debit', merchant: 'UTILITY AUTOPAY ACH', amount: 118.40 },
      { date: '2026-06-18', type: 'Debit Card POS', merchant: 'MIAMI GROCERS', amount: 76.21 },
      { date: '2026-06-17', type: 'Online Banking Transfer', merchant: 'Online transfer to savings', amount: 300.00 }
    ]
  },
  '3928149002': {
    customer: 'Maria Alvarez', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Still in possession', prior: 0, phone: '(305) 555-0101', email: 'maria.alvarez@example.com', history: [
      { date: '2026-06-19', type: 'Debit Card POS', merchant: 'SUNSHINE ELECTRONICS ONLINE', amount: 212.44 },
      { date: '2026-06-18', type: 'Debit Card POS', merchant: 'SUNSHINE ELECTRONICS MIAMI', amount: 884.27 },
      { date: '2026-06-17', type: 'Debit Card POS', merchant: 'PUBLIX #1442', amount: 86.43 },
      { date: '2026-06-15', type: 'ACH Debit', merchant: 'FPL AUTOPAY', amount: 148.09 },
      { date: '2026-06-14', type: 'Zelle / P2P', merchant: 'Zelle to Ana P.', amount: 55.00 }
    ]
  },
  '7741200381': {
    customer: 'Darnell Brown', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Unknown', prior: 1, phone: '(305) 555-0133', email: 'darnell.brown@example.com', history: [
      { date: '2026-06-17', type: 'ATM Withdrawal', merchant: 'ATM HIALEAH', amount: 300.00 },
      { date: '2026-06-16', type: 'ATM Withdrawal', merchant: 'ATM DOWNTOWN MIAMI', amount: 100.00 },
      { date: '2026-06-15', type: 'Debit Card POS', merchant: 'TARGET NORTH MIAMI', amount: 54.12 },
      { date: '2026-06-14', type: 'ACH Debit', merchant: 'CAR LOAN ACH', amount: 288.90 }
    ]
  },
  '6088123001': {
    customer: 'Jordan Lee', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Unknown', prior: 0, phone: '(305) 555-0166', email: 'jordan.lee@example.com', history: [
      { date: '2026-06-14', type: 'Check', merchant: 'Local Contractor', amount: 1200.00 },
      { date: '2026-06-12', type: 'Debit Card POS', merchant: 'HOME SUPPLY WAREHOUSE', amount: 88.01 },
      { date: '2026-06-10', type: 'Wire Transfer', merchant: 'Domestic Wire Transfer', amount: 2500.00 }
    ]
  },
  '111': {
    customer: 'Santiago S', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Still in possession', prior: 0, phone: '(305) 555-0111', email: 'santiago.s@example.com', history: [
      { date: '2026-06-23', type: 'Zelle / P2P', merchant: 'Zelle to Unknown Recipient', amount: 375.00 },
      { date: '2026-06-22', type: 'Zelle / P2P', merchant: 'Zelle to Marketplace Seller', amount: 150.00 },
      { date: '2026-06-21', type: 'Debit Card POS', merchant: 'OCEAN MART MIAMI', amount: 42.18 },
      { date: '2026-06-20', type: 'ACH Debit', merchant: 'STREAMING ACH PAY', amount: 19.99 }
    ]
  },
  '222': {
    customer: 'Bryce Lewis', accountAge: 'New account under 30 days', foreign: 'No', deviceStatus: 'Unknown', prior: 1, phone: '(305) 555-0222', email: 'bryce.lewis@example.com', history: [
      { date: '2026-06-23', type: 'ACH Debit', merchant: 'GYM MEMBERSHIP ACH', amount: 89.50 },
      { date: '2026-06-22', type: 'ACH Debit', merchant: 'ONLINE LENDER ACH', amount: 310.00 },
      { date: '2026-06-21', type: 'ATM Withdrawal', merchant: 'ATM BRICKELL', amount: 200.00 },
      { date: '2026-06-20', type: 'Debit Card POS', merchant: 'FUEL STATION 81', amount: 63.41 }
    ]
  },
  '333': {
    customer: 'Gian Castro', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Lost', prior: 2, phone: '(305) 555-0333', email: 'gian.castro@example.com', history: [
      { date: '2026-06-23', type: 'ATM Withdrawal', merchant: 'ATM DOWNTOWN MIAMI', amount: 500.00 },
      { date: '2026-06-23', type: 'ATM Withdrawal', merchant: 'ATM DOWNTOWN MIAMI', amount: 300.00 },
      { date: '2026-06-22', type: 'Debit Card POS', merchant: 'ELECTRONICS OUTLET', amount: 740.22 },
      { date: '2026-06-20', type: 'Online Banking Transfer', merchant: 'Online transfer to external account', amount: 650.00 }
    ]
  },
  '444': {
    customer: 'Pilar Marotta', accountAge: 'Over 30 days', foreign: 'Yes', deviceStatus: 'Stolen', prior: 0, phone: '(305) 555-0444', email: 'pilar.marotta@example.com', history: [
      { date: '2026-06-24', type: 'Debit Card POS', merchant: 'INTERNATIONAL ONLINE SHOP', amount: 445.75 },
      { date: '2026-06-23', type: 'Debit Card POS', merchant: 'AIRPORT DUTY FREE', amount: 120.40 },
      { date: '2026-06-22', type: 'Credit Card', merchant: 'HOTEL RESORT CHARGE', amount: 980.00 },
      { date: '2026-06-21', type: 'ACH Debit', merchant: 'INSURANCE ACH', amount: 210.15 }
    ]
  },
  '555': {
    customer: 'Jiya Uttam', accountAge: 'Over 30 days', foreign: 'No', deviceStatus: 'Still in possession', prior: 0, phone: '(305) 555-0555', email: 'jiya.uttam@example.com', history: [
      { date: '2026-06-24', type: 'Credit Card', merchant: 'ONLINE FURNITURE STORE', amount: 620.00 },
      { date: '2026-06-22', type: 'Debit Card POS', merchant: 'BEAUTY SUPPLY MIAMI', amount: 138.62 },
      { date: '2026-06-21', type: 'Zelle / P2P', merchant: 'Zelle to J. Patel', amount: 80.00 },
      { date: '2026-06-20', type: 'Check', merchant: 'CHECK #1044', amount: 350.00 }
    ]
  }
};
Object.assign(MOCK_ACCOUNTS['5550001234'], { ssn: '***-**-1234' });
Object.assign(MOCK_ACCOUNTS['3928149002'], { ssn: '***-**-9002' });
Object.assign(MOCK_ACCOUNTS['7741200381'], { ssn: '***-**-0381' });
Object.assign(MOCK_ACCOUNTS['6088123001'], { taxId: '**-***3001' });
Object.assign(MOCK_ACCOUNTS['111'], { ssn: '***-**-0111' });
Object.assign(MOCK_ACCOUNTS['222'], { ssn: '***-**-0222' });
Object.assign(MOCK_ACCOUNTS['333'], { ssn: '***-**-0333' });
Object.assign(MOCK_ACCOUNTS['444'], { ssn: '', taxId: '' });
Object.assign(MOCK_ACCOUNTS['555'], { ssn: '***-**-0555' });
Object.values(MOCK_ACCOUNTS).forEach(a => (a.history || []).forEach(t => { if (t.type === 'Debit Card POS' || t.type === 'Credit Card') t.network = t.network || 'Mastercard' }));
let currentAccountHistory = [];
function claimTypeDefaultsForCaseType(t) {
  if (t === 'ACH Debit') return 'Unauthorized transaction';
  if (t === 'ATM Withdrawal') return 'ATM cash not received';
  if (t === 'Debit Card POS') return 'Unauthorized transaction';
  if (t === 'Zelle / P2P') return 'Unauthorized transaction';
  if (t === 'Check') return 'Service not received';
  if (t === 'Credit Card') return 'Service not received';
  return document.getElementById('claimType')?.value || 'Unauthorized transaction';
}
function setCaseTypeWorkflow() {
  let type = val('caseTxnType') || 'Zelle / P2P';
  let guide = document.getElementById('caseTypeGuide');
  if (guide) {
    let reg = ['Zelle / P2P', 'ACH Debit', 'Debit Card POS', 'ATM Withdrawal', 'Online Banking Transfer'].includes(type);
    guide.innerHTML = '<strong>' + type + ' claim selected.</strong><br>' + (reg ? 'This unlocks the Reg E-style review path when the error type qualifies.' : 'This is normally routed outside the Reg E workflow in this demo.') + ' The transaction history below is filtered to ' + type + ' so one claim cannot mix transaction types.';
  }
  renderAccountHistory(currentAccountHistory, []);
  liveCalc();
}
function loadAccountFromInput(showMessage) {
  let acct = val('account').trim();
  let data = MOCK_ACCOUNTS[acct];
  let profile = document.getElementById('accountProfileBox');
  if (!data) {
    currentAccountHistory = [];
    if (profile) profile.innerHTML = 'No demo account profile found for <strong>' + acct + '</strong>. Try 111, 222, 333, 444, 555, 5550001234, 3928149002, 7741200381, or 6088123001.';
    renderAccountHistory([], []);
    if (showMessage) alert('No demo account found. Try 111, 222, 333, 444, 555, or one of the seeded demo account numbers.');
    liveCalc(); return;
  }
  document.getElementById('customer').value = data.customer;
  document.getElementById('accountAge').value = data.accountAge;
  document.getElementById('foreign').value = deriveForeignFromAccount(acct);
  document.getElementById('deviceStatus').value = data.deviceStatus;
  document.getElementById('prior').value = data.prior;
  currentAccountHistory = data.history.slice();
  if (profile) profile.innerHTML = '<strong>' + data.customer + '</strong><br>Account: ' + acct + '<br>Phone: ' + data.phone + ' | Email: ' + data.email + '<br>Account age: ' + data.accountAge + ' | Prior disputes: ' + data.prior + '<br>KYC identity: ' + (accountHasTaxIdentity(acct) ? 'SSN/Tax ID on file' : 'No SSN/Tax ID on file - foreign/outside U.S.');
  renderAccountHistory(currentAccountHistory, []);
  setCaseTypeWorkflow();
}
function txKey(t) { return [t.date, t.type, t.merchant, Number(t.amount || 0).toFixed(2)].join('|') }
function renderAccountHistory(history, selectedKeys = []) {
  let box = document.getElementById('accountHistoryBox'); if (!box) return;
  let type = val('caseTxnType') || 'Zelle / P2P';
  let rows = (history || []).filter(t => t.type === type);
  if (!rows.length) { box.innerHTML = '<p class="muted">No ' + type + ' transactions found for this account history. Choose another case type or load a different account.</p>'; updateTransactionTotal(); return; }
  box.innerHTML = '<table><tr><th>Select</th><th>Date</th><th>Type</th><th>Network</th><th>Merchant / Recipient</th><th>Amount</th></tr>' + rows.map((t, i) => { let key = txKey(t); return '<tr><td><input class="historyTxnCheck" type="checkbox" ' + (selectedKeys.includes(key) ? 'checked' : '') + ' data-date="' + t.date + '" data-type="' + t.type + '" data-network="' + (t.network || '') + '" data-merchant="' + String(t.merchant).replace(/"/g, '&quot;') + '" data-amount="' + Number(t.amount || 0) + '" onchange="updateTransactionTotal();liveCalc()"></td><td>' + t.date + '</td><td>' + t.type + '</td><td>' + (t.network || '') + '</td><td>' + t.merchant + '</td><td>' + money(t.amount) + '</td></tr>' }).join('') + '</table>';
  updateTransactionTotal();
}
function readTransactionRows() {
  let checks = [...document.querySelectorAll('.historyTxnCheck:checked')];
  return checks.map((el, i) => ({ date: el.dataset.date, type: el.dataset.type, merchant: el.dataset.merchant, amount: Number(el.dataset.amount || 0), network: el.dataset.network || '', primary: i === 0 }));
}
function buildFlaggedTransactions() { return readTransactionRows(); }
function updateTransactionTotal() { let el = document.getElementById('transactionTotal'); if (el) el.textContent = money(transactionTotal(readTransactionRows())) }
function renderTransactionRows(txns = [defaultTransaction()]) {
  let acct = val('account') || '5550001234';
  let data = MOCK_ACCOUNTS[acct];
  if (data) { currentAccountHistory = data.history.slice(); }
  let selected = (txns || []).map(txKey);
  let type = (txns && txns[0] && txns[0].type) || (val('caseTxnType') || 'Zelle / P2P');
  let typeEl = document.getElementById('caseTxnType'); if (typeEl) typeEl.value = type;
  renderAccountHistory(currentAccountHistory, selected);
  setCaseTypeWorkflow();
}
function addTransactionRow() { alert('Transactions are now selected from account history. Load an account and select the disputed transactions instead of manually adding rows.'); }
function duplicateLastTransaction() { alert('Transactions are now selected from account history. Use the checkboxes to select multiple transactions from the same account history.'); }
const originalCreateCaseV40 = createCase;
createCase = function (e) {
  e.preventDefault();
  if (editCaseId) { markCaseViewed(editCaseId); updateExistingCase(); return; }
  if (!readTransactionRows().length) { alert('Select at least one disputed transaction from the account history before creating the case.'); return; }
  originalCreateCaseV40(e);
};
const originalLiveCalcV40 = liveCalc;
liveCalc = function () {
  updateTransactionTotal();
  originalLiveCalcV40();
};
const originalResetNewCaseFormV40 = resetNewCaseForm;
resetNewCaseForm = function () {
  let a = document.getElementById('account'); if (a) a.value = '111';
  let n = document.getElementById('noticeDate'); if (n) n.value = currentDateISO();
  let st = document.getElementById('statement'); if (st) st.value = 'Customer says they did not authorize the selected transaction(s).';
  setManualControls(null); loadAccountFromInput(false); setCaseTypeWorkflow();
};
const originalLoadCaseIntoFormV40 = loadCaseIntoForm;
loadCaseIntoForm = function (c) {
  originalLoadCaseIntoFormV40(c);
  let typeEl = document.getElementById('caseTxnType'); if (typeEl) typeEl.value = caseTxnType(c);
  currentAccountHistory = (MOCK_ACCOUNTS[c.account]?.history || getFlaggedTransactions(c)).slice();
  renderTransactionRows(getFlaggedTransactions(c));
  setCaseTypeWorkflow();
};



/* V49 stability overrides: reliable case creation, provisional credit screen, and workflow routing */
function switchToView(id) {
  activeView = id;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  let view = document.getElementById(id); if (view) view.classList.add('active');
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  let labels = { dashboard: 'Dashboard', review: 'Review', caseTool: 'Review', chargeback: 'Chargeback', manager: 'Manager', audit: 'Closed Cases', auditDetailView: 'Closed Cases', ledger: 'Provisional Ledger', recovery: 'Pending Recovery', rules: 'Rules', intake: '+' };
  let label = labels[id] || '';
  let btn = [...document.querySelectorAll('.tabs button')].find(b => (b.textContent || '').includes(label));
  if (btn) btn.classList.add('active');
}
function goReview(id) { if (id) selectedId = id; switchToView('review'); render(); }
createCase = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  if (editCaseId) { markCaseViewed(editCaseId); updateExistingCase(); return; }
  let txns = readTransactionRows();
  if (!txns.length || transactionTotal(txns) <= 0) { alert('Select at least one disputed transaction from the account history before creating the case.'); return; }
  let c = formData();
  if (!getFlaggedTransactions(c).length) { c.flaggedTransactions = txns; c.amount = transactionTotal(txns); }
  let calc = classify(c);
  if (calc.mixedRails && (!c.manualRegEStatus || c.manualRegEStatus === 'Auto')) { alert('This claim mixes Reg E and Non Reg E transaction types. Create separate claims or use investigator override.'); return; }
  retagCaseId(c);
  c.events.push(eventObj('Machine recommendation: ' + calc.route + ', risk ' + calc.score + ', provisional credit due ' + calc.due10));
  c.events.push(eventObj('Claim contains ' + getFlaggedTransactions(c).length + ' selected disputed transaction(s), total ' + money(c.amount)));
  autoNotify(c, 'Claim received and queued for investigator review.');
  cases.unshift(c); selectedId = c.id; save(); goReview(c.id);
};
postCredit = function () {
  let c = cur(); if (!c) return; if (!requireOfficer(c)) return;
  if (hasCreditDecision(c)) { alert('A provisional credit decision has already been made for this case. Use the Provisional Ledger adjustment workflow if a correction is needed.'); return; }
  let total = transactionTotal(getFlaggedTransactions(c));
  if (total <= 0) { alert('This case has no selected disputed transaction amount. Edit the case and select at least one transaction.'); return; }
  let sub = total < 200 ? 'Low-value claim: provisional credit defaults to GL-198190 Fraud GL. Review and post the selected credit.' : 'Select the transactions and GLs for provisional credit on ' + c.id + '.';
  openCaseTool('Post Provisional Credit', sub, provisionalPostingHtml(c));
};
const originalSubmitProvisionalCreditsV49 = submitProvisionalCredits;
submitProvisionalCredits = function () {
  originalSubmitProvisionalCreditsV49();
  let c = cur();
  if (c && isChargebackInProcess(c)) { openChargebackCase(c.id); }
};
const originalRefuseProvisionalCreditV49 = refuseProvisionalCredit;
refuseProvisionalCredit = function () { originalRefuseProvisionalCreditV49(); let c = cur(); if (c) goReview(c.id); };

loadAccountFromInput(false); render();


/* V41 conditional affidavit-style intake workflow */
const CLAIM_WORKFLOWS = {
  'Zelle / P2P': {
    defaultType: 'Fraud complaint',
    guide: 'Zelle / P2P selected. Choose the complaint category, then select the disputed Zelle transactions from account history.',
    options: ['Scam complaint', 'Fraud complaint', 'General payment related complaint', 'Enrollment issue', 'Zelle product issue', 'Servicing issue'],
    fields: function (type) {
      if (type === 'Scam complaint') return '<div class="two"><div><label>Customer sent payment?</label><select id="detailCustomerSent"><option>Yes - customer participated</option><option>No - customer denies sending</option><option>Unknown</option></select></div><div><label>Recipient relationship</label><select id="detailRecipientKnown"><option>Unknown recipient</option><option>Known recipient</option><option>Business / seller</option><option>Imposter / impersonation</option></select></div></div><label>Scam summary</label><textarea id="detailScamSummary" rows="3" placeholder="Briefly describe the scam or inducement."></textarea>';
      if (type === 'Fraud complaint') return '<div class="two"><div><label>Customer authorized transfer?</label><select id="detailAuthorized"><option>No</option><option>Yes</option><option>Unknown</option></select></div><div><label>Credentials compromised?</label><select id="detailCredentials"><option>Unknown</option><option>No</option><option>Yes</option></select></div></div><label>Fraud details</label><textarea id="detailFraudDetails" rows="3" placeholder="Describe unauthorized access, device concerns, or recipient details."></textarea>';
      if (type === 'Enrollment issue') return '<div class="two"><div><label>Enrollment problem</label><select id="detailEnrollmentIssue"><option>Unable to enroll</option><option>Wrong token / phone / email</option><option>Profile already enrolled</option><option>Other</option></select></div><div><label>Impacted token</label><input id="detailImpactedToken" placeholder="Phone or email, if available"></div></div>';
      if (type === 'Zelle product issue') return '<label>Product issue details</label><textarea id="detailProductIssue" rows="3" placeholder="Describe app, product, or payment functionality issue."></textarea>';
      if (type === 'Servicing issue') return '<label>Servicing issue details</label><textarea id="detailServicingIssue" rows="3" placeholder="Describe servicing, support, or communication issue."></textarea>';
      return '<label>Payment complaint details</label><textarea id="detailGeneralComplaint" rows="3" placeholder="Describe the payment-related complaint."></textarea>';
    }
  },
  'ATM Withdrawal': {
    defaultType: 'Not authorized',
    guide: 'ATM selected. Choose the affidavit reason. Only ATM transactions can be selected for this claim.',
    options: ['Not authorized', 'Transaction posted twice', 'Received partial funds; account debited full amount', 'Did not receive funds; account was debited', 'Did not receive credit for deposit', 'Received partial credit for deposit', 'Other'],
    fields: function (type) {
      if (type === 'Not authorized') return '<div class="two"><div><label>Card status</label><select id="detailCardStatus" onchange="renderConditionalCardDate()"><option>Card still in possession</option><option>Lost card</option><option>Stolen card</option></select></div><div id="conditionalCardDate"></div></div>';
      if (type === 'Received partial funds; account debited full amount') return '<div class="two"><div><label>Amount received</label><input id="detailPartialAmount" type="number" step="0.01" placeholder="0.00"></div><div><label>ATM location details</label><input id="detailAtmLocation" placeholder="Optional"></div></div>';
      if (type === 'Received partial credit for deposit') return '<div class="two"><div><label>Credit amount received</label><input id="detailPartialCredit" type="number" step="0.01" placeholder="0.00"></div><div><label>Deposit type</label><select id="detailDepositType"><option>Cash</option><option>Check</option><option>Mixed deposit</option></select></div></div>';
      if (type === 'Other') return '<label>Other ATM issue</label><textarea id="detailOtherAtm" rows="3"></textarea>';
      return '<label>ATM issue details</label><textarea id="detailAtmDetails" rows="3" placeholder="Add any ATM journal, receipt, or cash-dispense details."></textarea>';
    }
  },
  'Debit Card POS': {
    defaultType: 'Not authorized',
    guide: 'Debit card selected. Choose the card dispute reason and select only debit card transactions.',
    options: ['Not authorized', 'Price adjustment not on statement', 'Merchandise not received / defective', 'Participated but returned merchandise / canceled service'],
    fields: function (type) {
      if (type === 'Not authorized') return '<div class="two"><div><label>Card status</label><select id="detailCardStatus" onchange="renderConditionalCardDate()"><option>Card still in possession</option><option>Lost card</option><option>Stolen card</option></select></div><div id="conditionalCardDate"></div></div>';
      if (type === 'Price adjustment not on statement') return '<div class="two"><div><label>Expected adjustment amount</label><input id="detailExpectedAdjustment" type="number" step="0.01" placeholder="0.00"></div><div><label>Merchant promised date</label><input id="detailMerchantPromisedDate" type="date"></div></div>';
      if (type === 'Merchandise not received / defective') return '<div class="two"><div><label>Issue</label><select id="detailMerchIssue"><option>Merchandise not received</option><option>Defective merchandise</option><option>Wrong merchandise</option></select></div><div><label>Expected delivery / service date</label><input id="detailExpectedDate" type="date"></div></div>';
      return '<div class="two"><div><label>Customer action</label><select id="detailCustomerAction"><option>Returned merchandise</option><option>Canceled service</option><option>Attempted merchant resolution</option></select></div><div><label>Return / cancellation date</label><input id="detailCancelDate" type="date"></div></div>';
    }
  },
  'Credit Card': {
    defaultType: 'Not authorized',
    guide: 'Credit card selected. This demo routes credit card disputes outside Reg E, but captures affidavit-style details.',
    options: ['Not authorized', 'Price adjustment not on statement', 'Merchandise not received / defective', 'Participated but returned merchandise / canceled service'],
    fields: function (type) { return CLAIM_WORKFLOWS['Debit Card POS'].fields(type) }
  },
  'ACH Debit': {
    defaultType: 'Not authorized',
    guide: 'ACH selected. ACH unauthorized claims use a focused authorization workflow.',
    options: ['Not authorized'],
    fields: function () { return '<div class="two"><div><label>Company / originator known?</label><select id="detailOriginatorKnown"><option>Unknown</option><option>Known</option></select></div><div><label>Authorization revoked?</label><select id="detailAuthorizationRevoked"><option>No</option><option>Yes</option><option>Unknown</option></select></div></div><label>ACH authorization details</label><textarea id="detailAchDetails" rows="3" placeholder="Describe why the ACH was not authorized or when authorization was revoked."></textarea>' }
  },
  'Online Banking Transfer': {
    defaultType: 'Not authorized',
    guide: 'Online banking transfer selected. Capture authorization and credential-access facts.',
    options: ['Not authorized', 'Customer-authorized scam', 'Incorrect amount', 'Duplicate transaction'],
    fields: function () { return '<div class="two"><div><label>Login/device concern</label><select id="detailLoginConcern"><option>Unknown</option><option>New device</option><option>Known device</option><option>Credentials compromised</option></select></div><div><label>Customer recognized recipient?</label><select id="detailRecipientRecognized"><option>No</option><option>Yes</option><option>Unknown</option></select></div></div>' }
  },
  'Wire Transfer': {
    defaultType: 'Not authorized',
    guide: 'Wire selected. This demo normally routes wires outside Reg E while capturing investigation details.',
    options: ['Not authorized', 'Customer-authorized scam', 'Incorrect amount', 'Other'],
    fields: function () { return '<label>Wire issue details</label><textarea id="detailWireDetails" rows="3"></textarea>' }
  },
  'Check': {
    defaultType: 'Service not received',
    guide: 'Check selected. This demo normally routes checks outside Reg E.',
    options: ['Not authorized', 'Service not received', 'Incorrect amount', 'Other'],
    fields: function () { return '<label>Check issue details</label><textarea id="detailCheckDetails" rows="3"></textarea>' }
  }
};
function allClaimOptions() { let set = new Set(); Object.values(CLAIM_WORKFLOWS).forEach(w => (w.options || []).forEach(o => set.add(o))); return [...set].sort(); }
function populateClaimFilters() { ['queueClaimTypeFilter', 'dashboardClaimTypeFilter', 'auditClaimTypeFilter'].forEach(id => { let el = document.getElementById(id); if (!el) return; let cur = el.value; el.innerHTML = '<option value="">All error types</option>' + allClaimOptions().map(o => '<option>' + o + '</option>').join(''); if ([...el.options].some(o => o.value === cur)) el.value = cur; }); }
function workflowForType(t) { return CLAIM_WORKFLOWS[t] || CLAIM_WORKFLOWS['Zelle / P2P']; }
function populateClaimTypeSelect(preserve) { let type = val('caseTxnType') || 'Zelle / P2P'; let wf = workflowForType(type); let el = document.getElementById('claimType'); if (!el) return; let old = preserve || el.value || wf.defaultType; el.innerHTML = wf.options.map(o => '<option>' + o + '</option>').join(''); el.value = wf.options.includes(old) ? old : wf.defaultType; }
function renderConditionalCardDate() { let holder = document.getElementById('conditionalCardDate'); if (!holder) return; let s = val('detailCardStatus') || 'Card still in possession'; if (s === 'Lost card') holder.innerHTML = '<label>Date card was lost</label><input id="detailLostDate" type="date">'; else if (s === 'Stolen card') holder.innerHTML = '<label>Date card was stolen</label><input id="detailStolenDate" type="date">'; else holder.innerHTML = '<label>Card date</label><input class="locked" readonly value="No lost/stolen date needed">'; }
function renderClaimDynamicFields() { let type = val('caseTxnType') || 'Zelle / P2P'; let claim = val('claimType') || workflowForType(type).defaultType; let box = document.getElementById('claimDynamicFields'); if (!box) return; box.innerHTML = '<h3 style="margin-top:0">Claim Questions</h3><p class="muted">Only fields needed for ' + type + ' / ' + claim + ' are shown.</p>' + workflowForType(type).fields(claim); renderConditionalCardDate(); }
function readClaimDetails() { let box = document.getElementById('claimDynamicFields'); let details = {}; if (!box) return details; box.querySelectorAll('input,select,textarea').forEach(el => { if (el.id) details[el.id] = el.value; }); return details; }
function fillClaimDetails(details) { details = details || {}; Object.keys(details).forEach(id => { let el = document.getElementById(id); if (el) el.value = details[id]; }); renderConditionalCardDate(); Object.keys(details).forEach(id => { let el = document.getElementById(id); if (el) el.value = details[id]; }); }
function claimDetailsHtml(c) { let d = c.claimDetails || {}; let keys = Object.keys(d).filter(k => d[k] !== '' && d[k] != null); if (!keys.length) return ''; let labelMap = { detailCustomerSent: 'Customer sent payment', detailRecipientKnown: 'Recipient relationship', detailScamSummary: 'Scam summary', detailAuthorized: 'Customer authorized transfer', detailCredentials: 'Credentials compromised', detailFraudDetails: 'Fraud details', detailEnrollmentIssue: 'Enrollment problem', detailImpactedToken: 'Impacted token', detailProductIssue: 'Product issue details', detailServicingIssue: 'Servicing issue details', detailGeneralComplaint: 'Payment complaint details', detailCardStatus: 'Card status', detailLostDate: 'Date card was lost', detailStolenDate: 'Date card was stolen', detailPartialAmount: 'Amount received', detailAtmLocation: 'ATM location details', detailPartialCredit: 'Credit amount received', detailDepositType: 'Deposit type', detailOtherAtm: 'Other ATM issue', detailAtmDetails: 'ATM issue details', detailExpectedAdjustment: 'Expected adjustment amount', detailMerchantPromisedDate: 'Merchant promised date', detailMerchIssue: 'Merchandise issue', detailExpectedDate: 'Expected delivery/service date', detailCustomerAction: 'Customer action', detailCancelDate: 'Return/cancellation date', detailOriginatorKnown: 'Company/originator known', detailAuthorizationRevoked: 'Authorization revoked', detailAchDetails: 'ACH authorization details', detailLoginConcern: 'Login/device concern', detailRecipientRecognized: 'Customer recognized recipient', detailWireDetails: 'Wire issue details', detailCheckDetails: 'Check issue details' }; return '<h3>Claim-Specific Details</h3><table>' + keys.map(k => '<tr><td>' + (labelMap[k] || k) + '</td><td>' + d[k] + '</td></tr>').join('') + '</table>'; }
const baseSetCaseTypeWorkflowV41 = setCaseTypeWorkflow;
setCaseTypeWorkflow = function () {
  let type = val('caseTxnType') || 'Zelle / P2P';
  populateClaimTypeSelect();
  renderClaimDynamicFields();
  let guide = document.getElementById('caseTypeGuide');
  if (guide) { guide.innerHTML = '<strong>' + type + ' claim selected.</strong><br>' + workflowForType(type).guide + '<br><span class="muted">Next step: choose the matching error type, then select the disputed transaction(s) from account history. Claims cannot mix transaction types.</span>'; }
  let selectedKeys = readTransactionRows().map(txKey);
  renderAccountHistory(currentAccountHistory, selectedKeys);
  liveCalc();
};
const baseFormDataV41 = formData;
formData = function () { let c = baseFormDataV41(); c.claimType = val('claimType'); c.claimDetails = readClaimDetails(); return c; };
const baseCaseParametersHtmlV41 = caseParametersHtml;
caseParametersHtml = function (c, calc) { return baseCaseParametersHtmlV41(c, calc) + claimDetailsHtml(c); };
const baseUpdateExistingCaseV41 = updateExistingCase;
updateExistingCase = function () {
  let c = cases.find(x => x.id === editCaseId); if (!c) { return baseUpdateExistingCaseV41(); }
  let details = readClaimDetails();
  baseUpdateExistingCaseV41();
  let updated = cases.find(x => x.id === selectedId) || cases.find(x => x.id === editCaseId) || c;
  updated.claimDetails = details;
  updated.events = updated.events || [];
  updated.events.push(eventObj('Claim-specific affidavit fields updated.'));
  save(); render();
};
const baseNormalizeImportedCaseV41 = normalizeImportedCase;
normalizeImportedCase = function (raw) { let c = baseNormalizeImportedCaseV41(raw); c.claimDetails = raw.claimDetails || raw.affidavitDetails || {}; return c; };
const baseLoadCaseIntoFormV41 = loadCaseIntoForm;
loadCaseIntoForm = function (c) {
  baseLoadCaseIntoFormV41(c);
  let typeEl = document.getElementById('caseTxnType'); if (typeEl) typeEl.value = caseTxnType(c);
  populateClaimTypeSelect(c.claimType);
  let claimEl = document.getElementById('claimType'); if (claimEl) claimEl.value = (workflowForType(caseTxnType(c)).options.includes(c.claimType) ? c.claimType : workflowForType(caseTxnType(c)).defaultType);
  renderClaimDynamicFields();
  fillClaimDetails(c.claimDetails || {});
  currentAccountHistory = (MOCK_ACCOUNTS[c.account]?.history || getFlaggedTransactions(c)).slice();
  renderTransactionRows(getFlaggedTransactions(c));
  updateTransactionTotal(); liveCalc();
};
const baseResetNewCaseFormV41 = resetNewCaseForm;
resetNewCaseForm = function () { baseResetNewCaseFormV41(); populateClaimTypeSelect(); renderClaimDynamicFields(); populateClaimFilters(); };
populateClaimFilters(); populateClaimTypeSelect(); renderClaimDynamicFields();
