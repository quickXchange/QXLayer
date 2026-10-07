import test from 'node:test';
import assert from 'node:assert/strict';
import { customerQueriesAllowed } from './demo-query-policy';

test('Demo launch intent blocks all customer queries even before the principal refreshes', () => {
  assert.equal(customerQueriesAllowed(false, 'read-only'), false);
  assert.equal(customerQueriesAllowed(undefined, 'read-only'), false);
  assert.equal(customerQueriesAllowed(true, null), false);
  assert.equal(customerQueriesAllowed(true, 'read-only'), false);
  assert.equal(customerQueriesAllowed(false, null), true);
});
