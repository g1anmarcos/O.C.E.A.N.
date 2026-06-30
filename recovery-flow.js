function getPendingRecoveryAmount(c) {
  if (!c || !Array.isArray(c.provisionalLedger)) return 0;

  return c.provisionalLedger
    .filter((entry) => String(entry.type || '').toLowerCase().includes('pending recovery'))
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function getPendingRecoveryCreditAtRisk(c) {
  if (!isPendingRecoveryCase(c)) return 0;
  return Math.max(getPendingRecoveryAmount(c), 0);
}

function isPendingRecoveryCase(c) {
  return !!(c && getPendingRecoveryAmount(c) > 0 && (!c.auditReady || !!c.recoveryDecisionPending));
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
  resolvePendingRecovery,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = recoveryFlow;
}

if (typeof window !== 'undefined') {
  window.recoveryFlow = recoveryFlow;
}
