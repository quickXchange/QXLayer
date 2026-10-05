import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeSelection, selectVisible, deselectVisible } from './selection-state';
import { gtDec, isCalendarDate, isDec, isInt } from './ui-validate';

test('ordinary selection never includes rows outside the current filter or page', () => {
  const selected = new Set(['a', 'b']);
  assert.deepEqual(computeSelection(selected, ['b', 'c']).ids, ['b']);
  assert.deepEqual(computeSelection(selected, ['d']).ids, []);
});

test('payment-method selection persists across filters in the same dataset', () => {
  const view = computeSelection(new Set(['a', 'b']), ['b', 'c'], ['a', 'b', 'c']);
  assert.deepEqual(view.ids, ['a', 'b']);
  assert.equal(view.hidden, 1);
  assert.equal(view.some, true);
  assert.equal(view.all, false);
});

test('select filtered adds to persistent selection rather than replacing it', () => {
  assert.deepEqual([...selectVisible(new Set(['a']), ['b', 'c'], true)], ['a', 'b', 'c']);
  assert.deepEqual([...selectVisible(new Set(['a']), ['b', 'c'], false)], ['b', 'c']);
});

test('deselect filtered leaves hidden selected methods unchanged', () => {
  const before = new Set(['a', 'b', 'c']);
  assert.deepEqual([...deselectVisible(before, ['b', 'c'])], ['a']);
  assert.deepEqual([...before], ['a', 'b', 'c']);
});

test('deleted or revoked rows cannot stay selected', () => {
  assert.deepEqual(computeSelection(new Set(['a', 'deleted']), ['a'], ['a', 'b']).ids, ['a']);
});

test('all and indeterminate checkbox states count only visible selections', () => {
  const all = computeSelection(new Set(['a', 'b', 'c']), ['b', 'c'], ['a', 'b', 'c']);
  assert.equal(all.all, true);
  assert.equal(all.some, false);
  const hiddenOnly = computeSelection(new Set(['a']), ['b'], ['a', 'b']);
  assert.equal(hiddenOnly.all, false);
  assert.equal(hiddenOnly.some, false);
  assert.equal(hiddenOnly.hidden, 1);
});

test('empty filtered results retain persistent selection but never check select all', () => {
  const empty = computeSelection(new Set(['a']), [], ['a']);
  assert.equal(empty.all, false);
  assert.equal(empty.some, false);
  assert.equal(empty.hidden, 1);
});

test('decimal fields reject negative, exponent, whitespace and excessive precision', () => {
  for (const value of ['-1', '1e3', ' 1', '1 ', '', 'NaN', '1.1234567890123456789', '1234567890123456789']) assert.equal(isDec(value), false);
  for (const value of ['0', '1234.50', '0.123456789012345678']) assert.equal(isDec(value), true);
});

test('decimal limit comparison stays exact beyond floating-point precision', () => {
  assert.equal(gtDec('100000000000000000.000000000000000001', '100000000000000000'), true);
  assert.equal(gtDec('1.000000000000000001', '1.000000000000000002'), false);
});

test('bulk precision and basis-point fields enforce integer bounds', () => {
  assert.equal(isInt(18, 18), true);
  for (const value of [-1, 19, 1.5, NaN]) assert.equal(isInt(value, 18), false);
  assert.equal(isInt(5000, 5000), true);
  assert.equal(isInt(5001, 5000), false);
});

test('order date filters reject impossible dates and accept valid leap days', () => {
  assert.equal(isCalendarDate('2026-02-30'), false);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-10-05'), true);
});
