/**
 * Editorial gallery rhythm. A repeating band of five placements on a 12-column grid gives an
 * asymmetric, hung-on-a-wall feel while keeping reading order left-to-right, top-to-bottom.
 * Mostly portrait ratios, because tattoo photography is almost always shot vertically.
 */
const DESKTOP = [
  'lg:col-start-1 lg:col-span-5',
  'lg:col-start-7 lg:col-span-3 lg:mt-[18%]',
  'lg:col-start-10 lg:col-span-3 lg:mt-[42%]',
  'lg:col-start-2 lg:col-span-4 lg:-mt-[6%]',
  'lg:col-start-7 lg:col-span-6 lg:mt-[10%]',
];
const DESKTOP_ASPECT = ['lg:aspect-[4/5]', 'lg:aspect-[3/4]', 'lg:aspect-[4/5]', 'lg:aspect-square', 'lg:aspect-[5/4]'];

// Tablet/mobile: a wide piece, then a pair, repeating.
const SMALL = ['col-span-12', 'col-span-6', 'col-span-6'];
const SMALL_ASPECT = ['aspect-[4/5] sm:aspect-[5/4]', 'aspect-[3/4]', 'aspect-[3/4]'];

export function placement(i: number) {
  const d = i % DESKTOP.length;
  const s = i % SMALL.length;
  return {
    cell: `${SMALL[s]} ${DESKTOP[d]}`,
    aspect: `${SMALL_ASPECT[s]} ${DESKTOP_ASPECT[d]}`,
    sizes: d === 4 || d === 0 ? '(min-width: 1024px) 45vw, 100vw' : '(min-width: 1024px) 26vw, 50vw',
  };
}
