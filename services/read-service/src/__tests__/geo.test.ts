import { isLatLon, parseLimit } from '../geo';

describe('geo helpers', () => {
  it('validates latitude/longitude ranges', () => {
    expect(isLatLon(0, 0)).toBe(true);
    expect(isLatLon(90, 180)).toBe(true);
    expect(isLatLon(-90, -180)).toBe(true);
    expect(isLatLon(91, 0)).toBe(false);
    expect(isLatLon(0, 181)).toBe(false);
  });

  it('parses and bounds limits', () => {
    expect(parseLimit('10', 50, 200)).toBe(10);
    expect(parseLimit('0', 50, 200)).toBe(50);
    expect(parseLimit('500', 50, 200)).toBe(200);
    expect(parseLimit(undefined, 50, 200)).toBe(50);
  });
});
