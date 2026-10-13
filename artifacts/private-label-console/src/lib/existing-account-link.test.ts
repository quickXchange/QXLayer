import assert from 'node:assert/strict';
import test from 'node:test';
import { existingAccountProofReturnUrl, signInDestination } from './existing-account-link';

test('Clerk proof returns to the exact linking route on the same Staging origin', () => {
  const origin = 'https://qxlayer-staging-example.vercel.app';
  assert.equal(existingAccountProofReturnUrl('/', origin), `${origin}/account/link-existing`);
  assert.equal(existingAccountProofReturnUrl('/console/', origin), `${origin}/console/account/link-existing`);
  assert.throws(() => existingAccountProofReturnUrl('//evil.invalid', origin));
});

test('authentication continuation allows only the fixed linking route', () => {
  assert.equal(signInDestination('?next=%2Faccount%2Flink-existing'), '/account/link-existing');
  for (const search of ['', '?next=https://evil.invalid', '?next=//evil.invalid', '?next=/account/link-existing/extra',
    '?next=%252Faccount%252Flink-existing', '?next=/admin?role=super_admin']) {
    assert.equal(signInDestination(search), '/admin');
  }
});
