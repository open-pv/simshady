import {describe, expect, test} from 'vitest';
import * as sun from '../src/sun';

describe('Sample the right number of positions: ', () => {
    const N = 50;
    let vectors = sun.getRandomSunVectors(N, 0, 0);
    test('Correct number of positions.', () => {
      expect(vectors.length).toStrictEqual(3 * N);
    });

    test('Sun is always above the horizon.', () => {
        for(let i = 0; i < N; i++) {
            let z = vectors[3 * i + 2];
            expect(z).toBeGreaterThan(0);
        }
    })
  });
