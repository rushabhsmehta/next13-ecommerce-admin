const assert = require('node:assert/strict');
const test = require('node:test');
require('ts-node/register/transpile-only');

const {
  resolveAccountingAccountFields,
} = require('./tour-package-query-accounting-helpers');
const {
  tourPackageQueryAccountingRequestSchema,
} = require('./tour-package-query-accounting-schema');

test('accounting request schema accepts serialized bank and cash payloads', () => {
  const result = tourPackageQueryAccountingRequestSchema.safeParse({
    paymentDetails: [
      {
        paymentDate: '2026-03-08T10:00:00.000Z',
        amount: '1250.50',
        accountId: 'bank-1',
        accountType: 'bank',
        supplierId: 'supplier-1',
        transactionId: 'txn-1',
        note: 'wire',
      },
    ],
    incomeDetails: [
      {
        incomeDate: '2026-03-08T11:00:00.000Z',
        amount: 500,
        accountId: 'cash-1',
        accountType: 'cash',
        incomeCategoryId: 'income-1',
        description: 'walk-in',
      },
    ],
  });

  assert.equal(result.success, true);
});

test('accounting request schema rejects malformed numeric payloads', () => {
  const result = tourPackageQueryAccountingRequestSchema.safeParse({
    paymentDetails: [
      {
        paymentDate: null,
        amount: null,
        accountType: 'bank',
      },
    ],
  });

  assert.equal(result.success, false);
});

test('resolveAccountingAccountFields maps bank accountId into bankAccountId', () => {
  assert.deepEqual(
    resolveAccountingAccountFields({
      accountType: 'bank',
      accountId: 'bank-123',
      cashAccountId: 'cash-old',
    }),
    {
      bankAccountId: 'bank-123',
      cashAccountId: null,
    }
  );
});

test('resolveAccountingAccountFields maps cash accountId into cashAccountId', () => {
  assert.deepEqual(
    resolveAccountingAccountFields({
      accountType: 'cash',
      accountId: 'cash-123',
      bankAccountId: 'bank-old',
    }),
    {
      bankAccountId: null,
      cashAccountId: 'cash-123',
    }
  );
});

test('resolveAccountingAccountFields preserves explicit ids when accountType is unknown', () => {
  assert.deepEqual(
    resolveAccountingAccountFields({
      accountType: 'unknown',
      bankAccountId: 'bank-keep',
      cashAccountId: 'cash-keep',
    }),
    {
      bankAccountId: 'bank-keep',
      cashAccountId: 'cash-keep',
    }
  );
});
