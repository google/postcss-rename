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

import { promises as fs } from 'fs';
import postcss from 'postcss';
import plugin, { Options } from '../src';
import { toShortName } from '../src/minimal-renamer';

async function run(input: string, options?: Options): Promise<postcss.Result> {
  return await postcss([plugin(options)]).process(input, { from: undefined });
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
  expected: { [key: string]: string },
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
    assertPostcss(await run(INPUT, { strategy: 'none' }), INPUT);
  });

  it('adds a prefix', async () => {
    assertPostcss(
      await run(INPUT, { prefix: 'pf-' }),
      '.pf-container, .pf-full-height .pf-image.pf-full-width {}'
    );
  });

  it('emits an output map', async () => {
    await assertMapEquals(INPUT, {
      container: 'container',
      full: 'full',
      height: 'height',
      image: 'image',
      width: 'width',
    });
  });

  it('omits parts that only appear in excluded names from the output map', async () => {
    await assertMapEquals(
      INPUT,
      {
        container: 'container',
        full: 'full',
        image: 'image',
        width: 'width',
      },
      { except: ['full-height'] }
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
      { prefix: 'pf-' }
    );
  });
});

describe('with strategy "debug"', () => {
  it('adds underscores after every part', async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'debug' }),
      '.container_, .full_-height_ .image_.full_-width_ {}'
    );
  });

  it('adds a prefix after underscoring', async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'debug', prefix: 'pf-' }),
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
      { strategy: 'debug' }
    );
  });

  it("doesn't map excluded names", async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'debug', except: ['full-height'] }),
      '.container_, .full-height .image_.full_-width_ {}'
    );
  });
});

describe('with strategy "minimal"', () => {
  it('maps parts to the shortest possible strings', async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'minimal' }),
      '.a, .b-c .d.b-e {}'
    );
  });

  it('adds a prefix after minimizing', async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'minimal', prefix: 'pf-' }),
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
      { strategy: 'minimal' }
    );
  });

  it("doesn't map excluded names", async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'minimal', except: ['full-height'] }),
      '.a, .full-height .b.c-d {}'
    );
  });

  it("doesn't produce a name that would be excluded", async () => {
    assertPostcss(
      await run(INPUT, { strategy: 'minimal', except: ['b'] }),
      '.a, .c-d .e.c-f {}'
    );
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
