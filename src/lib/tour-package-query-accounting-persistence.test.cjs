const assert = require('node:assert/strict');
const test = require('node:test');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
require('ts-node/register/transpile-only');

const {
  replaceTourPackageQueryAccountingWithDependencies,
} = require('./tour-package-query-accounting-persistence');

function createModel(name, callLog, createResult = { id: `${name}-created` }) {
  return {
    async deleteMany(args) {
      callLog.push({ model: name, method: 'deleteMany', args });
      return { count: 1 };
    },
    async create(args) {
      callLog.push({ model: name, method: 'create', args });
      return createResult;
    },
  };
}

function createDependencies(callLog, overrides = {}) {
  return {
    prismadb: {
      purchaseItem: createModel('purchaseItem', callLog),
      purchaseDetail: createModel('purchaseDetail', callLog, { id: 'purchase-detail-1' }),
      saleItem: createModel('saleItem', callLog),
      saleDetail: createModel('saleDetail', callLog, { id: 'sale-detail-1' }),
      paymentDetail: createModel('paymentDetail', callLog),
      receiptDetail: createModel('receiptDetail', callLog),
      expenseDetail: createModel('expenseDetail', callLog),
      incomeDetail: createModel('incomeDetail', callLog),
      ...overrides,
    },
    dateToUtc: (value) => (value ? new Date(value) : null),
  };
}

test('persistence helper deletes then recreates purchase details and items in order', async () => {
  const callLog = [];
  const dependencies = createDependencies(callLog, {
    purchaseDetail: createModel('purchaseDetail', callLog, { id: 'purchase-detail-1' }),
  });

  await replaceTourPackageQueryAccountingWithDependencies(dependencies, 'tpq-1', {
    purchaseDetails: [
      {
        supplierId: 'supplier-1',
        purchaseDate: '2026-03-08T10:00:00.000Z',
        price: '1500.25',
        gstAmount: '270.05',
        gstPercentage: '18',
        description: 'hotel block',
        items: [
          {
            productName: 'Room',
            quantity: '2',
            pricePerUnit: '750.125',
            totalAmount: '1500.25',
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    callLog.map((entry) => `${entry.model}.${entry.method}`),
    [
      'purchaseItem.deleteMany',
      'purchaseDetail.deleteMany',
      'purchaseDetail.create',
      'purchaseItem.create',
    ]
  );

  const purchaseCreate = callLog.find((entry) => entry.model === 'purchaseDetail' && entry.method === 'create');
  assert.equal(purchaseCreate.args.data.tourPackageQueryId, 'tpq-1');
  assert.equal(purchaseCreate.args.data.price, 1500.25);
  assert.equal(purchaseCreate.args.data.gstAmount, 270.05);
  assert.equal(purchaseCreate.args.data.gstPercentage, 18);

  const purchaseItemCreate = callLog.find((entry) => entry.model === 'purchaseItem' && entry.method === 'create');
  assert.equal(purchaseItemCreate.args.data.purchaseDetailId, 'purchase-detail-1');
  assert.equal(purchaseItemCreate.args.data.quantity, 2);
  assert.equal(purchaseItemCreate.args.data.pricePerUnit, 750.125);
});

test('persistence helper deletes then recreates sale details and items in order', async () => {
  const callLog = [];
  const dependencies = createDependencies(callLog, {
    saleDetail: createModel('saleDetail', callLog, { id: 'sale-detail-1' }),
  });

  await replaceTourPackageQueryAccountingWithDependencies(dependencies, 'tpq-sale', {
    saleDetails: [
      {
        customerId: 'customer-1',
        saleDate: '2026-03-08T12:00:00.000Z',
        salePrice: '2200.75',
        gstAmount: '396.14',
        gstPercentage: '18',
        description: 'package sale',
        items: [
          {
            productName: 'Tour Package',
            quantity: '1',
            pricePerUnit: '2200.75',
            totalAmount: '2200.75',
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    callLog.map((entry) => `${entry.model}.${entry.method}`),
    [
      'saleItem.deleteMany',
      'saleDetail.deleteMany',
      'saleDetail.create',
      'saleItem.create',
    ]
  );

  const saleCreate = callLog.find((entry) => entry.model === 'saleDetail' && entry.method === 'create');
  assert.equal(saleCreate.args.data.tourPackageQueryId, 'tpq-sale');
  assert.equal(saleCreate.args.data.salePrice, 2200.75);
  assert.equal(saleCreate.args.data.gstAmount, 396.14);
  assert.equal(saleCreate.args.data.gstPercentage, 18);

  const saleItemCreate = callLog.find((entry) => entry.model === 'saleItem' && entry.method === 'create');
  assert.equal(saleItemCreate.args.data.saleDetailId, 'sale-detail-1');
  assert.equal(saleItemCreate.args.data.quantity, 1);
  assert.equal(saleItemCreate.args.data.totalAmount, 2200.75);
});

test('persistence helper maps bank and cash account ids onto account-bound transactions', async () => {
  const callLog = [];
  const dependencies = createDependencies(callLog);

  await replaceTourPackageQueryAccountingWithDependencies(dependencies, 'tpq-2', {
    paymentDetails: [
      {
        paymentDate: '2026-03-08T10:00:00.000Z',
        amount: '1000',
        accountType: 'bank',
        accountId: 'bank-1',
        supplierId: 'supplier-1',
      },
    ],
    receiptDetails: [
      {
        receiptDate: '2026-03-08T11:00:00.000Z',
        amount: '900',
        accountType: 'cash',
        accountId: 'cash-1',
        customerId: 'customer-1',
      },
    ],
  });

  const paymentCreate = callLog.find((entry) => entry.model === 'paymentDetail' && entry.method === 'create');
  assert.deepEqual(
    {
      bankAccountId: paymentCreate.args.data.bankAccountId,
      cashAccountId: paymentCreate.args.data.cashAccountId,
      amount: paymentCreate.args.data.amount,
    },
    {
      bankAccountId: 'bank-1',
      cashAccountId: null,
      amount: 1000,
    }
  );

  const receiptCreate = callLog.find((entry) => entry.model === 'receiptDetail' && entry.method === 'create');
  assert.deepEqual(
    {
      bankAccountId: receiptCreate.args.data.bankAccountId,
      cashAccountId: receiptCreate.args.data.cashAccountId,
      amount: receiptCreate.args.data.amount,
    },
    {
      bankAccountId: null,
      cashAccountId: 'cash-1',
      amount: 900,
    }
  );
});

test('persistence helper normalizes expense and income entries with account routing and category ids', async () => {
  const callLog = [];
  const dependencies = createDependencies(callLog);

  await replaceTourPackageQueryAccountingWithDependencies(dependencies, 'tpq-3', {
    expenseDetails: [
      {
        expenseDate: '2026-03-08T13:00:00.000Z',
        amount: '450.5',
        expenseCategoryId: 'expense-cat-1',
        accountType: 'bank',
        accountId: 'bank-22',
        description: 'visa fees',
      },
    ],
    incomeDetails: [
      {
        incomeDate: '2026-03-08T14:00:00.000Z',
        amount: '875.25',
        incomeCategoryId: 'income-cat-1',
        accountType: 'cash',
        accountId: 'cash-22',
        description: 'service fee',
      },
    ],
  });

  assert.deepEqual(
    callLog.map((entry) => `${entry.model}.${entry.method}`),
    [
      'expenseDetail.deleteMany',
      'expenseDetail.create',
      'incomeDetail.deleteMany',
      'incomeDetail.create',
    ]
  );

  const expenseCreate = callLog.find((entry) => entry.model === 'expenseDetail' && entry.method === 'create');
  assert.deepEqual(
    {
      amount: expenseCreate.args.data.amount,
      expenseCategoryId: expenseCreate.args.data.expenseCategoryId,
      bankAccountId: expenseCreate.args.data.bankAccountId,
      cashAccountId: expenseCreate.args.data.cashAccountId,
    },
    {
      amount: 450.5,
      expenseCategoryId: 'expense-cat-1',
      bankAccountId: 'bank-22',
      cashAccountId: null,
    }
  );

  const incomeCreate = callLog.find((entry) => entry.model === 'incomeDetail' && entry.method === 'create');
  assert.deepEqual(
    {
      amount: incomeCreate.args.data.amount,
      incomeCategoryId: incomeCreate.args.data.incomeCategoryId,
      bankAccountId: incomeCreate.args.data.bankAccountId,
      cashAccountId: incomeCreate.args.data.cashAccountId,
    },
    {
      amount: 875.25,
      incomeCategoryId: 'income-cat-1',
      bankAccountId: null,
      cashAccountId: 'cash-22',
    }
  );
});
