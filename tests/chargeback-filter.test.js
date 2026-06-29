const test = require('node:test');
const assert = require('node:assert/strict');
const { getChargebackFilteredCases, getQueueCasesForView, matchesChargebackCase, getChargebackQueueCases } = require('../chargeback-filter.js');

function makeCase(overrides = {}) {
  return {
    id: 'REG-E-1001',
    customer: 'Ada Lovelace',
    account: '1234567890',
    chargebackFiled: true,
    chargebackStage: 'Waiting for Mastercard response',
    chargebackResolved: false,
    auditReady: false,
    chargebackAmount: 250,
    ...overrides,
  };
}

test('chargeback filters apply to both the queue and the chargeback panel', () => {
  const cases = [
    makeCase(),
    makeCase({ id: 'REG-E-1002', customer: 'Grace Hopper', account: '2222222222', chargebackAmount: 1000 }),
    makeCase({ id: 'REG-E-1003', customer: 'Alan Turing', account: '3333333333', chargebackResolved: true }),
  ];

  const filters = { caseId: 'reg-e-1001', customer: 'ada', account: '123', amount: '250' };
  const filtered = getChargebackFilteredCases(cases, filters);
  const queueViewCases = getQueueCasesForView(cases, 'chargeback', filters);

  assert.deepStrictEqual(filtered.map((c) => c.id), ['REG-E-1001']);
  assert.deepStrictEqual(queueViewCases.map((c) => c.id), ['REG-E-1001']);
  assert.equal(matchesChargebackCase(cases[0], filters), true);
  assert.equal(matchesChargebackCase(cases[1], filters), false);
});

test('chargeback queue helper returns only cases waiting for Mastercard response', () => {
  const cases = [
    makeCase(),
    makeCase({ id: 'REG-E-1002', customer: 'Grace Hopper', account: '2222222222', chargebackAmount: 1000 }),
    makeCase({ id: 'REG-E-1003', customer: 'Alan Turing', account: '3333333333', chargebackStage: 'Resolved - No merchant representment' }),
  ];

  const queued = getChargebackQueueCases(cases, { caseId: 'reg-e-1001' });

  assert.deepStrictEqual(queued.map((c) => c.id), ['REG-E-1001']);
});
