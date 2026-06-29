function isChargebackInProcess(c) {
  return !!(c && c.chargebackFiled && c.chargebackStage === 'Waiting for Mastercard response' && !c.chargebackResolved && !c.auditReady);
}

function matchesChargebackCase(c, filters = {}) {
  const v = {
    caseId: c.id,
    customer: c.customer,
    account: c.account,
    amount: `${String(c.chargebackAmount || 0)} ${'$' + Number(c.chargebackAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };

  return Object.entries(filters).every(([k, f]) => !f || String(v[k] || '').toLowerCase().includes(String(f).toLowerCase()));
}

function getChargebackFilteredCases(cases, filters = {}) {
  return cases.filter(isChargebackInProcess).filter((c) => matchesChargebackCase(c, filters));
}

function getChargebackQueueCases(cases, filters = {}) {
  return getChargebackFilteredCases(cases, filters);
}

function getQueueCasesForView(cases, activeView, filters = {}) {
  if (activeView !== 'chargeback') {
    return cases;
  }

  return getChargebackFilteredCases(cases, filters);
}

module.exports = {
  isChargebackInProcess,
  matchesChargebackCase,
  getChargebackFilteredCases,
  getChargebackQueueCases,
  getQueueCasesForView,
};
