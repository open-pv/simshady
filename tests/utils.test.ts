import { describe, expect, test } from 'vitest';
import * as utils from '../src/utils';

describe('Test functionalities from utils.ts: ', () => {
  test('isValidUrl returns true for valid url', () => {
    expect(utils.isValidUrl('https://example.org')).toBe(true);
  });
  test('isValidUrl returns false for wrong url', () => {
    expect(utils.isValidUrl('this is not an url')).toBe(false);
  });
});
