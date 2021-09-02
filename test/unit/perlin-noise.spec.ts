import { ExcaliburMatchers, ensureImagesLoaded } from 'excalibur-jasmine';
import { PerlinDrawer2D, PerlinGenerator } from '@excalibur-perlin';

describe('Perlin Noise', () => {
  let generator: PerlinGenerator;
  beforeEach(() => {
    jasmine.addMatchers(ExcaliburMatchers);
    generator = new PerlinGenerator({
      seed: 515,
      octaves: 15,
      frequency: 2,
      amplitude: 0.5,
      persistance: 0.5
    });
  });

  it('is defined', () => {
    expect(PerlinGenerator).toBeDefined();
    expect(PerlinDrawer2D).toBeDefined();
  });

  it('can be constructed with defaults', () => {
    const generator = new PerlinGenerator();
    expect(generator.persistance).toBe(0.5);
    expect(generator.amplitude).toBe(1);
    expect(generator.frequency).toBe(1);
    expect(generator.octaves).toBe(1);
  });

  it('can be constructed with non-defaults', () => {
    const generator = new PerlinGenerator({
      seed: 10,
      persistance: 11,
      amplitude: 12,
      frequency: 13,
      octaves: 14
    });

    expect(generator.persistance).toBe(11);
    expect(generator.amplitude).toBe(12);
    expect(generator.frequency).toBe(13);
    expect(generator.octaves).toBe(14);
  });

  it('points are the same at whole numbers ', () => {
    for (let i = 0; i < 100; i++) {
      expect(generator.noise(i)).toBe(generator.noise(i + 1));
      expect(generator.noise(i, i)).toBe(generator.noise(i + 1, i + 1));
      expect(generator.noise(i, i, i)).toBe(generator.noise(i + 1, i + 1, i + 1));
    }
  });

  it('can generate a sequence of numbers', () => {
    const seq = generator.sequence(10);
    expect(seq.length).toBe(10);
  });
});
