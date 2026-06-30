function getPendingRecoveryAmount(c) {
  if (!c) return 0;

  const pendingEntries = Array.isArray(c.provisionalLedger)
    ? c.provisionalLedger.filter((entry) => String(entry.type || '').toLowerCase().includes('pending recovery'))
    : [];
  const ledgerAmount = pendingEntries.reduce((total, entry) => total + Number(entry.amount || 0), 0);

  if (ledgerAmount > 0) return ledgerAmount;

  const fallbackAmount = Number(c.pendingRecoveryAmount || c.recoveryAmount || c.amount || 0);
  return Number.isFinite(fallbackAmount) && fallbackAmount > 0 ? fallbackAmount : 0;
}

function getPendingRecoveryCreditAtRisk(c) {
  if (!isPendingRecoveryCase(c)) return 0;
  return Math.max(getPendingRecoveryAmount(c), 0);
}

function isPendingRecoveryCase(c) {
  // Only treat a case as a pending-recovery case when the final decision
  // explicitly recorded the 'Customer keeps credit - pending recovery'
  // outcome. This prevents other ledger entries or transient flags from
  // enabling the pending-recovery UI/features unexpectedly.
  const finalDecision = String(c?.finalDecision || c?.finalOutcomeType || '').toLowerCase();
  return !!(finalDecision.includes('customer keeps credit - pending recovery'));
}

function isAuthorizedZelleFraudComplaint(c) {
  const claim = String(c?.claimType || c?.errorType || '').toLowerCase();
  const txns = Array.isArray(c?.flaggedTransactions) && c.flaggedTransactions.length
    ? c.flaggedTransactions
    : (c?.txnType ? [{ type: c.txnType }] : []);
  const txnTypes = [...new Set(txns.map((t) => String(t?.type || '')).filter(Boolean))];
  const details = c?.claimDetails || {};
  const customerAuthorized = details.detailAuthorized === 'Yes' || details.detailCustomerSent === 'Yes - customer participated';
  const isFraudComplaint = claim.includes('fraud') || claim.includes('fraud complaint');
  const isZelle = txnTypes.includes('Zelle / P2P');
  return isFraudComplaint && isZelle && customerAuthorized;
}

function resolvePendingRecovery(c, outcome, amount, note) {
  const safeAmount = Math.abs(Number(amount || getPendingRecoveryAmount(c) || 0));
  const nextCase = { ...c, provisionalLedger: Array.isArray(c.provisionalLedger) ? [...c.provisionalLedger] : [] };

  nextCase.provisionalLedger = nextCase.provisionalLedger.filter(
    (entry) => !String(entry.type || '').toLowerCase().includes('pending recovery') || Number(entry.amount || 0) <= 0,
  );

  if (outcome === 'recovered') {
    nextCase.provisionalLedger.push({
      date: new Date().toISOString().slice(0, 10),
      type: 'Funds Recovered',
      amount: safeAmount,
      description: note || 'Funds recovered from pending recovery workflow.',
      bin: 'GL-Operations',
      officer: 'O.C.E.A.N Recovery',
    });
    nextCase.status = 'Closed - Funds Recovered';
    nextCase.finalDecision = 'Funds recovered';
    nextCase.creditStatus = 'Pending recovery resolved: funds recovered';
  } else {
    nextCase.provisionalLedger.push({
      date: new Date().toISOString().slice(0, 10),
      type: 'Bank Loss / Charge-Off',
      amount: safeAmount,
      description: note || 'Funds not recovered from pending recovery workflow.',
      bin: 'GL-198190 Fraud GL',
      officer: 'O.C.E.A.N Recovery',
    });
    nextCase.status = 'Closed - Not Recovered';
    nextCase.finalDecision = 'Not recovered';
    nextCase.creditStatus = 'Pending recovery resolved: funds not recovered';
  }

  nextCase.managerReviewed = true;
  nextCase.auditReady = true;
  nextCase.recoveryDecisionPending = false;
  nextCase.closedDate = new Date().toISOString().slice(0, 10);
  nextCase.events = Array.isArray(nextCase.events) ? [...nextCase.events] : [];
  nextCase.events.push({
    time: new Date().toISOString(),
    text: outcome === 'recovered' ? 'Pending recovery resolved: funds recovered.' : 'Pending recovery resolved: funds not recovered.',
  });

  return nextCase;
}

const recoveryFlow = {
  getPendingRecoveryAmount,
  getPendingRecoveryCreditAtRisk,
  isPendingRecoveryCase,
  isAuthorizedZelleFraudComplaint,
  resolvePendingRecovery,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = recoveryFlow;
}

if (typeof window !== 'undefined') {
  window.recoveryFlow = recoveryFlow;
}
