const assert = require('node:assert/strict');
const test = require('node:test');

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  baseUrl: '.',
});
require('ts-node/register/transpile-only');
require('tsconfig-paths').register({
  baseUrl: process.cwd(),
  paths: {
    '@/*': ['src/*'],
  },
});

const { createTourQueryWithDependencies } = require('./tour-queries');

function createDeps(overrides = {}) {
  const calls = [];
  let createdData = null;

  const deps = {
    prismadb: {
      location: {
        findFirst: async () => ({ id: 'location-1', label: 'Goa' }),
      },
      hotel: {
        findMany: async () => [{ id: 'hotel-1', name: 'Sea View Resort' }],
      },
      tourPackage: {
        findUnique: async () => ({ id: 'package-1', tourPackageName: 'Goa Classic' }),
      },
      packageVariant: {
        findMany: async (args) => {
          const requestedIds = Array.isArray(args?.where?.id?.in) ? args.where.id.in : [];
          const allVariants = [
            { id: 'variant-1', tourPackageId: 'package-1' },
            { id: 'variant-2', tourPackageId: 'package-1' },
          ];
          return allVariants.filter((variant) => {
            if (requestedIds.length > 0 && !requestedIds.includes(variant.id)) {
              return false;
            }
            if (args?.where?.tourPackageId && variant.tourPackageId !== args.where.tourPackageId) {
              return false;
            }
            return true;
          });
        },
      },
      tourPackageQuery: {
        create: async (args) => {
          calls.push({ model: 'tourPackageQuery', method: 'create', args });
          createdData = args.data;
          return { id: 'query-1' };
        },
        update: async (args) => {
          calls.push({ model: 'tourPackageQuery', method: 'update', args });
          return { id: 'query-1' };
        },
        findUnique: async () => ({
          id: 'query-1',
          ...createdData,
          location: { id: 'location-1', label: 'Goa' },
          itineraries: [
            {
              id: 'itin-1',
              dayNumber: 1,
            },
          ],
          queryVariantSnapshots: [
            {
              id: 'snapshot-1',
            },
          ],
        }),
        delete: async (args) => {
          calls.push({ model: 'tourPackageQuery', method: 'delete', args });
          return { id: 'query-1' };
        },
      },
      itinerary: {
        create: async (args) => {
          calls.push({ model: 'itinerary', method: 'create', args });
          if (overrides.itineraryCreateError) {
            throw overrides.itineraryCreateError;
          }
          return { id: 'itin-1' };
        },
      },
      activity: {
        create: async (args) => {
          calls.push({ model: 'activity', method: 'create', args });
          return { id: 'activity-1' };
        },
      },
      roomAllocation: {
        create: async (args) => {
          calls.push({ model: 'roomAllocation', method: 'create', args });
          return { id: 'room-allocation-1' };
        },
      },
      roomType: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({ id: 'custom-room-type' }),
      },
      occupancyType: {
        findMany: async () => [],
      },
      mealPlan: {
        findMany: async () => [],
      },
      inquiry: {
        update: async () => ({}),
      },
    },
    dateToUtc: (value) => new Date(`${value}T00:00:00.000Z`),
    createVariantSnapshots: async (queryId, variantIds, options) => {
      calls.push({
        model: 'variantSnapshots',
        method: 'createVariantSnapshots',
        args: { queryId, variantIds, options },
      });
      if (overrides.snapshotError) {
        throw overrides.snapshotError;
      }
      return { success: true, count: variantIds.length };
    },
    calls,
  };

  return {
    ...deps,
    ...overrides,
    prismadb: {
      ...deps.prismadb,
      ...(overrides.prismadb || {}),
    },
    calls,
  };
}

test('createTourQueryWithDependencies persists policy fields and snapshots package variants', async () => {
  const deps = createDeps();

  const result = await createTourQueryWithDependencies(deps, {
    customerName: 'Alice',
    locationId: 'location-1',
    tourPackageId: 'package-1',
    selectedVariantIds: ['variant-1'],
    tourPackageQueryName: 'Goa Honeymoon 4N5D',
    numDaysNight: '4 Nights / 5 Days',
    tourCategory: 'Domestic',
    tourPackageQueryType: 'Honeymoon',
    numAdults: '2',
    tourStartsFrom: '2026-03-24',
    tourEndsOn: '2026-03-28',
    remarks: 'Window seat requested',
    totalPrice: '99999',
    inclusions: ['Breakfast', 'Transfers'],
    exclusions: ['Airfare'],
    importantNotes: ['Bring ID'],
    paymentPolicy: ['50% advance'],
    usefulTip: ['Pack light'],
    cancellationPolicy: ['Non-refundable'],
    airlineCancellationPolicy: ['Airline rules apply'],
    termsconditions: ['Standard terms'],
    kitchenGroupPolicy: ['No outside food'],
    itineraries: [
      {
        dayNumber: 1,
        itineraryTitle: 'Day 1: Arrival',
        itineraryDescription: 'Arrival and transfer to hotel',
        hotelName: 'Sea View Resort',
        activities: [],
        roomAllocations: [],
      },
    ],
  });

  const createCall = deps.calls.find((entry) => entry.model === 'tourPackageQuery' && entry.method === 'create');
  assert.ok(createCall);
  assert.deepEqual(createCall.args.data.inclusions, ['Breakfast', 'Transfers']);
  assert.deepEqual(createCall.args.data.usefulTip, ['Pack light']);
  assert.deepEqual(createCall.args.data.airlineCancellationPolicy, ['Airline rules apply']);
  assert.deepEqual(createCall.args.data.termsconditions, ['Standard terms']);
  assert.deepEqual(createCall.args.data.kitchenGroupPolicy, ['No outside food']);
  assert.equal(createCall.args.data.selectedTemplateId, 'package-1');
  assert.equal(createCall.args.data.selectedTemplateType, 'tourPackage');
  assert.equal(createCall.args.data.tourPackageTemplateName, 'Goa Classic');

  const variantSnapshotCall = deps.calls.find((entry) => entry.model === 'variantSnapshots');
  assert.ok(variantSnapshotCall);
  assert.equal(variantSnapshotCall.args.queryId, 'query-1');
  assert.deepEqual(variantSnapshotCall.args.variantIds, ['variant-1']);
  assert.equal(variantSnapshotCall.args.options.tourPackageId, 'package-1');

  assert.equal(result.id, 'query-1');
  assert.deepEqual(result.usefulTip, ['Pack light']);
});

test('createTourQueryWithDependencies rolls back when itinerary creation fails', async () => {
  const deps = createDeps({
    itineraryCreateError: new Error('itinerary boom'),
  });

  await assert.rejects(
    () =>
      createTourQueryWithDependencies(deps, {
        customerName: 'Alice',
        locationId: 'location-1',
        tourPackageId: 'package-1',
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: 'Day 1',
            activities: [],
            roomAllocations: [],
          },
        ],
      }),
    /itinerary boom/
  );

  const deleteCall = deps.calls.find((entry) => entry.model === 'tourPackageQuery' && entry.method === 'delete');
  assert.ok(deleteCall);
  assert.equal(deps.calls.some((entry) => entry.model === 'variantSnapshots'), false);
});

test('createTourQueryWithDependencies rolls back when snapshot creation fails', async () => {
  const deps = createDeps({
    snapshotError: new Error('snapshot boom'),
  });

  await assert.rejects(
    () =>
      createTourQueryWithDependencies(deps, {
        customerName: 'Alice',
        locationId: 'location-1',
        tourPackageId: 'package-1',
        selectedVariantIds: ['variant-1'],
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: 'Day 1',
            activities: [],
            roomAllocations: [],
          },
        ],
      }),
    /snapshot boom/
  );

  const deleteCall = deps.calls.find((entry) => entry.model === 'tourPackageQuery' && entry.method === 'delete');
  assert.ok(deleteCall);
});

test('createTourQueryWithDependencies rejects invalid tour package ids', async () => {
  const deps = createDeps({
    prismadb: {
      tourPackage: {
        findUnique: async () => null,
      },
    },
  });

  await assert.rejects(
    () =>
      createTourQueryWithDependencies(deps, {
        customerName: 'Alice',
        locationId: 'location-1',
        tourPackageId: 'missing-package',
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: 'Day 1',
            activities: [],
            roomAllocations: [],
          },
        ],
      }),
    /missing-package/
  );

  assert.equal(deps.calls.some((entry) => entry.model === 'tourPackageQuery' && entry.method === 'create'), false);
});

test('createTourQueryWithDependencies rejects mixed-package variant ids', async () => {
  const deps = createDeps({
    prismadb: {
      packageVariant: {
        findMany: async () => [{ id: 'variant-1' }],
      },
    },
  });

  await assert.rejects(
    () =>
      createTourQueryWithDependencies(deps, {
        customerName: 'Alice',
        locationId: 'location-1',
        tourPackageId: 'package-1',
        selectedVariantIds: ['variant-1', 'variant-2'],
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: 'Day 1',
            activities: [],
            roomAllocations: [],
          },
        ],
      }),
    /variant-2/
  );

  assert.equal(deps.calls.some((entry) => entry.model === 'tourPackageQuery' && entry.method === 'create'), false);
});

test('createTourQueryWithDependencies rejects variant ids when no package is provided', async () => {
  const deps = createDeps();

  await assert.rejects(
    () =>
      createTourQueryWithDependencies(deps, {
        customerName: 'Alice',
        locationId: 'location-1',
        selectedVariantIds: ['variant-1'],
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: 'Day 1',
            activities: [],
            roomAllocations: [],
          },
        ],
      }),
    /tourPackageId is required/
  );
});
