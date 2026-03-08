const assert = require('node:assert/strict');
const test = require('node:test');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
require('ts-node/register/transpile-only');

const {
  handleTourPackageQueryAccountingPatch,
} = require('./tour-package-query-accounting-route');

test('route helper returns 400 with flattened errors for invalid accounting payloads', async () => {
  const response = await handleTourPackageQueryAccountingPatch({
    userId: 'user-1',
    tourPackageQueryId: 'tpq-1',
    body: {
      paymentDetails: [
        {
          paymentDate: null,
          amount: null,
          accountType: 'bank',
        },
      ],
    },
    findTourPackageQueryById: async () => ({ id: 'tpq-1' }),
    replaceTourPackageQueryAccounting: async () => {
      throw new Error('replace should not be called for invalid payloads');
    },
  });

  assert.equal(response.status, 400);

  const json = await response.json();
  assert.equal(json.message, 'Invalid accounting payload');
  assert.ok(json.errors);
  assert.ok(Array.isArray(json.errors.formErrors));
  assert.ok(json.errors.fieldErrors.paymentDetails);
});

test('route helper calls persistence with validated payload and returns success', async () => {
  let receivedCall = null;

  const response = await handleTourPackageQueryAccountingPatch({
    userId: 'user-1',
    tourPackageQueryId: 'tpq-2',
    body: {
      paymentDetails: [
        {
          paymentDate: '2026-03-08T10:00:00.000Z',
          amount: '1250.50',
          accountId: 'bank-1',
          accountType: 'bank',
          supplierId: 'supplier-1',
        },
      ],
    },
    findTourPackageQueryById: async () => ({ id: 'tpq-2' }),
    replaceTourPackageQueryAccounting: async (tourPackageQueryId, payload) => {
      receivedCall = { tourPackageQueryId, payload };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(receivedCall, {
    tourPackageQueryId: 'tpq-2',
    payload: {
      paymentDetails: [
        {
          paymentDate: '2026-03-08T10:00:00.000Z',
          amount: '1250.50',
          accountId: 'bank-1',
          accountType: 'bank',
          supplierId: 'supplier-1',
        },
      ],
    },
  });

  const json = await response.json();
  assert.equal(json.message, 'Accounting details updated successfully');
});
