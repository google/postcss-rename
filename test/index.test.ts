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

import plugin = require('../src');
import postcss, {LazyResult} from 'postcss';
import {toShortName} from '../src/minimal-renamer';

function run(input: string, options?: plugin.Options): LazyResult {
  return postcss([plugin(options)]).process(input, {from: undefined});
}

function assertPostcss(result: LazyResult, output: string): void {
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

/**
 * Compiles `input` with postcss and asserts that the output map equals
 * `expected`.
 */
function assertMapEquals(
  input: string,
  expected: {[key: string]: string},
  options: plugin.Options = {}
): void {
  run(input, {
    ...options,
    outputMapCallback: map => expect(map).toEqual(expected),
  });
}

const INPUT = '.container, .full-height .image.full-width {}';

const KEYFRAMES = `
@-webkit-keyframes name {
  from {opacity: 0}
  0.1% {opacity: 0.1}
  90% {opacity: 0.9}
  to {opacity: 1}
}

@keyframes name {
  from {opacity: 0}
  0.1% {opacity: 0.1}
  90% {opacity: 0.9}
  to {opacity: 1}
}`;

describe('with strategy "none"', () => {
  it('does nothing with no options', () => {
    assertPostcss(run(INPUT), INPUT);
  });

  it('does nothing with an explicit strategy', () => {
    assertPostcss(run(INPUT, {strategy: 'none'}), INPUT);
  });

  describe('in by-whole mode', () => {
    it('adds a prefix', () => {
      assertPostcss(
        run(INPUT, {prefix: 'pf-'}),
        '.pf-container, .pf-full-height .pf-image.pf-full-width {}'
      );
    });

    it('emits an output map', () => {
      assertMapEquals(INPUT, {
        container: 'container',
        'full-height': 'full-height',
        image: 'image',
        'full-width': 'full-width',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        INPUT,
        {
          container: 'container',
          image: 'image',
          'full-width': 'full-width',
        },
        {except: ['full-height']}
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        INPUT,
        {
          container: 'container',
          image: 'image',
        },
        {except: [/full/]}
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
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
    it('emits each part in an output map in by-part mode', () => {
      assertMapEquals(
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

    it('omits part that only appear in excluded names from the output map', () => {
      assertMapEquals(
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

    it('omits part that only appear in excluded regexes from the output map', () => {
      assertMapEquals(
        INPUT,
        {
          container: 'container',
          full: 'full',
          image: 'image',
          width: 'width',
          height: 'height',
        },
        {except: ['full-.*'], by: 'part'}
      );
    });

    it("doesn't include the prefix in the output map", () => {
      assertMapEquals(
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

  it("doesn't modify keyframes", () => {
    assertPostcss(run(KEYFRAMES), KEYFRAMES);
  });
});

describe('with strategy "debug"', () => {
  describe('in by-whole mode', () => {
    it('adds underscores after every name', () => {
      assertPostcss(
        run(INPUT, {strategy: 'debug'}),
        '.container_, .full-height_ .image_.full-width_ {}'
      );
    });

    it('maps original names to underscored names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {strategy: 'debug', except: ['full-height']}),
        '.container_, .full-height .image_.full-width_ {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {strategy: 'debug', except: [/full/]}),
        '.container_, .full-height .image_.full-width {}'
      );
    });

    it("doesn't map ID selectors by default", () => {
      assertPostcss(
        run('#container, #full-height, #image.full-width {}', {
          strategy: 'debug',
        }),
        '#container, #full-height, #image.full-width_ {}'
      );
    });

    it('maps ID selectors with ids: true', () => {
      assertPostcss(
        run('#container, #full-height, #image.full-width {}', {
          strategy: 'debug',
          ids: true,
        }),
        '#container_, #full-height_, #image_.full-width_ {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('adds underscores after every part', () => {
      assertPostcss(
        run(INPUT, {strategy: 'debug', by: 'part'}),
        '.container_, .full_-height_ .image_.full_-width_ {}'
      );
    });

    it('adds a prefix after underscoring', () => {
      assertPostcss(
        run(INPUT, {strategy: 'debug', prefix: 'pf-', by: 'part'}),
        '.pf-container_, .pf-full_-height_ .pf-image_.pf-full_-width_ {}'
      );
    });

    it('maps original names to underscored names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {
          strategy: 'debug',
          except: ['full-height'],
          by: 'part',
        }),
        '.container_, .full-height .image_.full_-width_ {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {
          strategy: 'debug',
          except: [/full/],
          by: 'part',
        }),
        '.container_, .full-height .image_.full-width {}'
      );
    });

    it("doesn't map excluded parts", () => {
      assertPostcss(
        run(INPUT, {
          strategy: 'debug',
          except: ['full'],
          by: 'part',
        }),
        '.container_, .full-height_ .image_.full-width_ {}'
      );
    });
  });

  it("doesn't modify keyframes", () => {
    assertPostcss(run(KEYFRAMES, {strategy: 'debug'}), KEYFRAMES);
  });
});

describe('with strategy "minimal"', () => {
  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', () => {
      assertPostcss(run(INPUT, {strategy: 'minimal'}), '.a, .b .c.d {}');
    });

    it('adds a prefix after minimizing', () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', prefix: 'pf-'}),
        '.pf-a, .pf-b .pf-c.pf-d {}'
      );
    });

    it('maps original names to minimized names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: ['full-height']}),
        '.a, .full-height .b.c {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: [/full/]}),
        '.a, .full-height .b.full-width {}'
      );
    });

    it("doesn't produce a name that would be excluded", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: ['b']}),
        '.a, .c .d.e {}'
      );
    });

    it("doesn't produce a name that would be excluded with regexes", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: [/^a|b$/]}),
        '.c, .d .e.f {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', by: 'part'}),
        '.a, .b-c .d.b-e {}'
      );
    });

    it('adds a prefix after minimizing', () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', prefix: 'pf-', by: 'part'}),
        '.pf-a, .pf-b-c .pf-d.pf-b-e {}'
      );
    });

    it('maps original names to minimized names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {
          strategy: 'minimal',
          except: ['full-height'],
          by: 'part',
        }),
        '.a, .full-height .b.c-d {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {
          strategy: 'minimal',
          except: [/full/],
          by: 'part',
        }),
        '.a, .full-height .b.full-width {}'
      );
    });

    it("doesn't produce a name that would be excluded", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: ['b'], by: 'part'}),
        '.a, .c-d .e.c-f {}'
      );
    });

    it("doesn't produce a name that would be with regexes", () => {
      assertPostcss(
        run(INPUT, {strategy: 'minimal', except: [/^a|b$/], by: 'part'}),
        '.c, .d-e .f.d-g {}'
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

  it("doesn't modify keyframes", () => {
    assertPostcss(run(KEYFRAMES, {strategy: 'minimal'}), KEYFRAMES);
  });
});

describe('with a custom strategy', () => {
  const strategy = name => name.substring(name.length - 2, name.length);

  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', () => {
      assertPostcss(run(INPUT, {strategy}), '.er, .ht .ge.th {}');
    });

    it('adds a prefix after renaming', () => {
      assertPostcss(
        run(INPUT, {strategy, prefix: 'pf-'}),
        '.pf-er, .pf-ht .pf-ge.pf-th {}'
      );
    });

    it('maps original names to renamed names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {strategy, except: ['full-height']}),
        '.er, .full-height .ge.th {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {strategy, except: [/full/]}),
        '.er, .full-height .ge.full-width {}'
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', () => {
      assertPostcss(
        run(INPUT, {strategy, by: 'part'}),
        '.er, .ll-ht .ge.ll-th {}'
      );
    });

    it('adds a prefix after renaming', () => {
      assertPostcss(
        run(INPUT, {strategy, prefix: 'pf-', by: 'part'}),
        '.pf-er, .pf-ll-ht .pf-ge.pf-ll-th {}'
      );
    });

    it('maps original names to renamed names', () => {
      assertMapEquals(
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

    it("doesn't map excluded names", () => {
      assertPostcss(
        run(INPUT, {
          strategy,
          except: ['full-height'],
          by: 'part',
        }),
        '.er, .full-height .ge.ll-th {}'
      );
    });

    it("doesn't map excluded regexes", () => {
      assertPostcss(
        run(INPUT, {
          strategy,
          except: [/full/],
          by: 'part',
        }),
        '.er, .full-height .ge.full-width {}'
      );
    });
  });

  it("doesn't modify keyframes", () => {
    assertPostcss(run(KEYFRAMES, {strategy}), KEYFRAMES);
  });
});
