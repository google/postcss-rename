/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import postcss from 'postcss';
import plugin, {Options} from '../src';
import {toShortName} from '../src/minimal-renamer';

async function run(input: string, options?: Options): Promise<postcss.Result> {
  return await postcss([plugin(options)]).process(input, {from: undefined});
}

function assertPostcss(result: postcss.Result, output: string): void {
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

/**
 * Compiles `input` with postcss and asserts that the output map equals
 * `expected`.
 */
async function assertMapEquals(
  input: string,
  expected: {[key: string]: string},
  options: Options = {}
): Promise<void> {
  await run(input, {
    ...options,
    outputMapCallback: map => expect(map).toEqual(expected),
  });
}

const INPUT = '.container, .full-height .image.full-width {}';

describe('with strategy "none"', () => {
  it('does nothing with no options', async () => {
    assertPostcss(await run(INPUT), INPUT);
  });

  it('does nothing with an explicit strategy', async () => {
    assertPostcss(await run(INPUT, {strategy: 'none'}), INPUT);
  });

  describe('in by-whole mode', () => {
    it('adds a prefix', async () => {
      assertPostcss(
        await run(INPUT, {prefix: 'pf-'}),
        '.pf-container, .pf-full-height .pf-image.pf-full-width {}'
      );
    });

    it('emits an output map', async () => {
      await assertMapEquals(INPUT, {
        container: 'container',
        'full-height': 'full-height',
        image: 'image',
        'full-width': 'full-width',
      });
    });

    it('omits excluded names from the output map', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          image: 'image',
          'full-width': 'full-width',
        },
        {except: ['full-height']}
      );
    });

    it('includes the prefix in the output map', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'pf-container',
          'full-height': 'pf-full-height',
          image: 'pf-image',
          'full-width': 'pf-full-width',
        },
        {prefix: 'pf-'}
      );
    });
  });

  describe('in by-part mode', () => {
    it('emits each part in an output map in by-part mode', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          full: 'full',
          height: 'height',
          image: 'image',
          width: 'width',
        },
        {by: 'part'}
      );
    });

    it('omits part that only appear in excluded names from the output map', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          full: 'full',
          image: 'image',
          width: 'width',
        },
        {except: ['full-height'], by: 'part'}
      );
    });

    it("doesn't include the prefix in the output map", async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          full: 'full',
          height: 'height',
          image: 'image',
          width: 'width',
        },
        {prefix: 'pf-', by: 'part'}
      );
    });
  });
});

describe('with strategy "debug"', () => {
  describe('in by-whole mode', () => {
    it('adds underscores after every name', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'debug'}),
        '.container_, .full-height_ .image_.full-width_ {}'
      );
    });

    it('maps original names to underscored names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container_',
          'full-height': 'full-height_',
          image: 'image_',
          'full-width': 'full-width_',
        },
        {strategy: 'debug'}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'debug', except: ['full-height']}),
        '.container_, .full-height .image_.full-width_ {}'
      );
    });

    it("doesn't map ID selectors by default", async () => {
      assertPostcss(
        await run('#container, #full-height, #image.full-width {}', {
          strategy: 'debug',
        }),
        '#container, #full-height, #image.full-width_ {}'
      );
    });

    it('maps ID selectors with ids: true', async () => {
      assertPostcss(
        await run('#container, #full-height, #image.full-width {}', {
          strategy: 'debug',
          ids: true,
        }),
        '#container_, #full-height_, #image_.full-width_ {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('adds underscores after every part', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'debug', by: 'part'}),
        '.container_, .full_-height_ .image_.full_-width_ {}'
      );
    });

    it('adds a prefix after underscoring', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'debug', prefix: 'pf-', by: 'part'}),
        '.pf-container_, .pf-full_-height_ .pf-image_.pf-full_-width_ {}'
      );
    });

    it('maps original names to underscored names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container_',
          full: 'full_',
          height: 'height_',
          image: 'image_',
          width: 'width_',
        },
        {strategy: 'debug', by: 'part'}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          strategy: 'debug',
          except: ['full-height'],
          by: 'part',
        }),
        '.container_, .full-height .image_.full_-width_ {}'
      );
    });
  });
});

describe('with strategy "minimal"', () => {
  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', async () => {
      assertPostcss(await run(INPUT, {strategy: 'minimal'}), '.a, .b .c.d {}');
    });

    it('adds a prefix after minimizing', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', prefix: 'pf-'}),
        '.pf-a, .pf-b .pf-c.pf-d {}'
      );
    });

    it('maps original names to minimized names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'a',
          'full-height': 'b',
          image: 'c',
          'full-width': 'd',
        },
        {strategy: 'minimal'}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', except: ['full-height']}),
        '.a, .full-height .b.c {}'
      );
    });

    it("doesn't produce a name that would be excluded", async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', except: ['b']}),
        '.a, .c .d.e {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', by: 'part'}),
        '.a, .b-c .d.b-e {}'
      );
    });

    it('adds a prefix after minimizing', async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', prefix: 'pf-', by: 'part'}),
        '.pf-a, .pf-b-c .pf-d.pf-b-e {}'
      );
    });

    it('maps original names to minimized names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'a',
          full: 'b',
          height: 'c',
          image: 'd',
          width: 'e',
        },
        {strategy: 'minimal', by: 'part'}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          strategy: 'minimal',
          except: ['full-height'],
          by: 'part',
        }),
        '.a, .full-height .b.c-d {}'
      );
    });

    it("doesn't produce a name that would be excluded", async () => {
      assertPostcss(
        await run(INPUT, {strategy: 'minimal', except: ['b'], by: 'part'}),
        '.a, .c-d .e.c-f {}'
      );
    });
  });

  describe('toShortName()', () => {
    it('produces the right results around the two-character boundary', () => {
      expect(toShortName(52)).toEqual('_');
      expect(toShortName(53)).toEqual('aa');
      expect(toShortName(54)).toEqual('ba');
      expect(toShortName(55)).toEqual('ca');
    });

    it('produces the right results around the three-character boundary', () => {
      expect(toShortName(3390)).toEqual('Z_');
      expect(toShortName(3391)).toEqual('__');
      expect(toShortName(3392)).toEqual('aaa');
      expect(toShortName(3393)).toEqual('baa');
      expect(toShortName(3394)).toEqual('caa');
    });
  });
});

describe('with a custom strategy', () => {
  const strategy = name => name.substring(name.length - 2, name.length);

  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', async () => {
      assertPostcss(await run(INPUT, {strategy}), '.er, .ht .ge.th {}');
    });

    it('adds a prefix after renaming', async () => {
      assertPostcss(
        await run(INPUT, {strategy, prefix: 'pf-'}),
        '.pf-er, .pf-ht .pf-ge.pf-th {}'
      );
    });

    it('maps original names to renamed names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'er',
          'full-height': 'ht',
          image: 'ge',
          'full-width': 'th',
        },
        {strategy}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {strategy, except: ['full-height']}),
        '.er, .full-height .ge.th {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {strategy, by: 'part'}),
        '.er, .ll-ht .ge.ll-th {}'
      );
    });

    it('adds a prefix after renaming', async () => {
      assertPostcss(
        await run(INPUT, {strategy, prefix: 'pf-', by: 'part'}),
        '.pf-er, .pf-ll-ht .pf-ge.pf-ll-th {}'
      );
    });

    it('maps original names to renamed names', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'er',
          full: 'll',
          height: 'ht',
          image: 'ge',
          width: 'th',
        },
        {strategy, by: 'part'}
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          strategy,
          except: ['full-height'],
          by: 'part',
        }),
        '.er, .full-height .ge.ll-th {}'
      );
    });
  });
});
