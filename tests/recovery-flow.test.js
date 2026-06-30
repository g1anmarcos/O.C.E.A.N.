const test = require('node:test');
const assert = require('node:assert/strict');
const { isPendingRecoveryCase, getPendingRecoveryAmount, getPendingRecoveryCreditAtRisk, isAuthorizedZelleFraudComplaint, resolvePendingRecovery } = require('../recovery-flow');

function makeCase(overrides = {}) {
  return {
    id: 'REG-E-9001',
    customer: 'Ada Lovelace',
    account: '1234567890',
    status: 'Final Decision Made - Pending Recovery',
    auditReady: false,
    finalDecision: 'Customer keeps credit - pending recovery',
    provisionalLedger: [
      {
        date: '2026-06-25',
        type: 'Closed to Customer - Pending Recovery',
        amount: 250,
        description: 'Pending recovery in progress',
      },
    ],
    ...overrides,
  };
}

test('pending recovery cases are detected and report their unresolved amount', () => {
  const caseData = makeCase();

  assert.equal(isPendingRecoveryCase(caseData), true);
  assert.equal(getPendingRecoveryAmount(caseData), 250);
});

test('pending recovery cases surface from decision metadata even without a legacy ledger entry', () => {
  const caseData = makeCase({ provisionalLedger: [], status: 'Final Decision Made - Pending Recovery', recoveryDecisionPending: true, amount: 150 });

  assert.equal(isPendingRecoveryCase(caseData), true);
  assert.equal(getPendingRecoveryAmount(caseData), 150);
  assert.equal(getPendingRecoveryCreditAtRisk(caseData), 150);
});

test('funds recovered closes the pending recovery and records a recovered ledger entry', () => {
  const caseData = makeCase();
  const updated = resolvePendingRecovery(caseData, 'recovered', 250, 'Merchant returned funds');

  assert.equal(updated.auditReady, true);
  assert.equal(updated.managerReviewed, true);
  assert.equal(updated.status, 'Closed - Funds Recovered');
  assert.equal(updated.finalDecision, 'Funds recovered');
  assert.equal(updated.creditStatus, 'Pending recovery resolved: funds recovered');
  assert.equal(updated.provisionalLedger.some((entry) => entry.type === 'Funds Recovered'), true);
});

test('not recovered closes the pending recovery and records a loss', () => {
  const caseData = makeCase();
  const updated = resolvePendingRecovery(caseData, 'not-recovered', 250, 'Recovery unsuccessful');

  assert.equal(updated.auditReady, true);
  assert.equal(updated.managerReviewed, true);
  assert.equal(updated.status, 'Closed - Not Recovered');
  assert.equal(updated.finalDecision, 'Not recovered');
  assert.equal(updated.creditStatus, 'Pending recovery resolved: funds not recovered');
  assert.equal(updated.provisionalLedger.some((entry) => entry.type === 'Bank Loss / Charge-Off'), true);
});

test('manager-closed pending recovery remains visible in the pending recovery queue', () => {
  const caseData = makeCase({ auditReady: true, recoveryDecisionPending: true });

  assert.equal(isPendingRecoveryCase(caseData), true);
  assert.equal(getPendingRecoveryAmount(caseData), 250);
  assert.equal(getPendingRecoveryCreditAtRisk(caseData), 250);
});

test('authorized zelle fraud complaints are treated as non-reg-e', () => {
  const caseData = {
    claimType: 'Fraud complaint',
    txnType: 'Zelle / P2P',
    flaggedTransactions: [{ type: 'Zelle / P2P', amount: 100 }],
    claimDetails: { detailAuthorized: 'Yes' },
  };

  assert.equal(isAuthorizedZelleFraudComplaint(caseData), true);
});
