import assert from 'node:assert/strict';
import test from 'node:test';
import { toUserMessage } from '../src/services/httpClient.js';

test('reports a definitive payment provider failure without implying a charge', () => {
  const message = toUserMessage({
    isAxiosError: true,
    response: {
      status: 502,
      data: { outcomeUnknown: false },
      headers: {},
    },
  });

  assert.match(message, /No payment was taken/);
});
