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
import postcss, {Result} from 'postcss';
import {toShortName} from '../src/minimal-renamer';

async function run(input: string, options?: plugin.Options): Promise<Result> {
  return await postcss([plugin(options)]).process(input, {from: undefined});
}

function assertPostcss(result: Result, output: string): void {
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
  options: plugin.Options = {},
): Promise<void> {
  const {classRenamingOptions = {}, variableRenamingOptions = {}} = options;
  const outputMapCallback = (map) => expect(map).toEqual(expected);

  await run(input, {
    classRenamingOptions: {...classRenamingOptions, outputMapCallback},
    variableRenamingOptions: {...variableRenamingOptions, outputMapCallback},
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
  it('does nothing with no options', async () => {
    assertPostcss(await run(INPUT), INPUT);
  });

  it('does nothing with an explicit strategy', async () => {
    assertPostcss(
      await run(INPUT, {classRenamingOptions: {strategy: 'none'}}),
      INPUT,
    );
  });

  describe('in by-whole mode', () => {
    it('adds a prefix', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {prefix: 'pf-'}}),
        '.pf-container, .pf-full-height .pf-image.pf-full-width {}',
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
        {classRenamingOptions: {except: ['full-height']}},
      );
    });

    it('omits excluded regexes from the output map', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          image: 'image',
        },
        {classRenamingOptions: {except: [/full/]}},
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
        {classRenamingOptions: {prefix: 'pf-'}},
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
        {classRenamingOptions: {by: 'part'}},
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
        {classRenamingOptions: {except: ['full-height'], by: 'part'}},
      );
    });

    it('omits part that only appear in excluded regexes from the output map', async () => {
      await assertMapEquals(
        INPUT,
        {
          container: 'container',
          full: 'full',
          image: 'image',
          width: 'width',
          height: 'height',
        },
        {classRenamingOptions: {except: ['full-.*'], by: 'part'}},
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
        {classRenamingOptions: {prefix: 'pf-', by: 'part'}},
      );
    });
  });

  it("doesn't modify keyframes", async () => {
    assertPostcss(await run(KEYFRAMES), KEYFRAMES);
  });
});

describe('with strategy "debug"', () => {
  describe('in by-whole mode', () => {
    it('adds underscores after every name', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy: 'debug'}}),
        '.container_, .full-height_ .image_.full-width_ {}',
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
        {classRenamingOptions: {strategy: 'debug'}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'debug', except: ['full-height']},
        }),
        '.container_, .full-height .image_.full-width_ {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'debug', except: [/full/]},
        }),
        '.container_, .full-height .image_.full-width {}',
      );
    });

    it("doesn't map ID selectors by default", async () => {
      assertPostcss(
        await run('#container, #full-height, #image.full-width {}', {
          classRenamingOptions: {
            strategy: 'debug',
          },
        }),
        '#container, #full-height, #image.full-width_ {}',
      );
    });

    it('maps ID selectors with ids: true', async () => {
      assertPostcss(
        await run('#container, #full-height, #image.full-width {}', {
          classRenamingOptions: {
            strategy: 'debug',
            ids: true,
          },
        }),
        '#container_, #full-height_, #image_.full-width_ {}',
      );
    });
  });

  describe('in by-part mode', () => {
    it('adds underscores after every part', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'debug', by: 'part'},
        }),
        '.container_, .full_-height_ .image_.full_-width_ {}',
      );
    });

    it('adds a prefix after underscoring', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'debug', prefix: 'pf-', by: 'part'},
        }),
        '.pf-container_, .pf-full_-height_ .pf-image_.pf-full_-width_ {}',
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
        {classRenamingOptions: {strategy: 'debug', by: 'part'}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'debug',
            except: ['full-height'],
            by: 'part',
          },
        }),
        '.container_, .full-height .image_.full_-width_ {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'debug',
            except: [/full/],
            by: 'part',
          },
        }),
        '.container_, .full-height .image_.full-width {}',
      );
    });

    it("doesn't map excluded parts", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'debug',
            except: ['full'],
            by: 'part',
          },
        }),
        '.container_, .full-height_ .image_.full-width_ {}',
      );
    });
  });

  it("doesn't modify keyframes", async () => {
    assertPostcss(
      await run(KEYFRAMES, {classRenamingOptions: {strategy: 'debug'}}),
      KEYFRAMES,
    );
  });
});

describe('with strategy "minimal"', () => {
  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy: 'minimal'}}),
        '.a, .b .c.d {}',
      );
    });

    it('adds a prefix after minimizing', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', prefix: 'pf-'},
        }),
        '.pf-a, .pf-b .pf-c.pf-d {}',
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
        {classRenamingOptions: {strategy: 'minimal'}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', except: ['full-height']},
        }),
        '.a, .full-height .b.c {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', except: [/full/]},
        }),
        '.a, .full-height .b.full-width {}',
      );
    });

    it("doesn't produce a name that would be excluded", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', except: ['b']},
        }),
        '.a, .c .d.e {}',
      );
    });

    it("doesn't produce a name that would be excluded with regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', except: [/^a|b$/]},
        }),
        '.c, .d .e.f {}',
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy: 'minimal', by: 'part'},
        }),
        '.a, .b-c .d.b-e {}',
      );
    });

    it('adds a prefix after minimizing', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'minimal',
            prefix: 'pf-',
            by: 'part',
          },
        }),
        '.pf-a, .pf-b-c .pf-d.pf-b-e {}',
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
        {classRenamingOptions: {strategy: 'minimal', by: 'part'}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'minimal',
            except: ['full-height'],
            by: 'part',
          },
        }),
        '.a, .full-height .b.c-d {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'minimal',
            except: [/full/],
            by: 'part',
          },
        }),
        '.a, .full-height .b.full-width {}',
      );
    });

    it("doesn't produce a name that would be excluded", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'minimal',
            except: ['b'],
            by: 'part',
          },
        }),
        '.a, .c-d .e.c-f {}',
      );
    });

    it("doesn't produce a name that would be with regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy: 'minimal',
            except: [/^a|b$/],
            by: 'part',
          },
        }),
        '.c, .d-e .f.d-g {}',
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

  it("doesn't modify keyframes", async () => {
    assertPostcss(
      await run(KEYFRAMES, {classRenamingOptions: {strategy: 'minimal'}}),
      KEYFRAMES,
    );
  });
});

describe('with a custom strategy', () => {
  const strategy = (name) => name.substring(name.length - 2, name.length);

  describe('in by-whole mode', () => {
    it('maps names to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy}}),
        '.er, .ht .ge.th {}',
      );
    });

    it('adds a prefix after renaming', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy, prefix: 'pf-'}}),
        '.pf-er, .pf-ht .pf-ge.pf-th {}',
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
        {classRenamingOptions: {strategy}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy, except: ['full-height']},
        }),
        '.er, .full-height .ge.th {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy, except: [/full/]}}),
        '.er, .full-height .ge.full-width {}',
      );
    });
  });

  describe('in by-part mode', () => {
    it('maps parts to the shortest possible strings', async () => {
      assertPostcss(
        await run(INPUT, {classRenamingOptions: {strategy, by: 'part'}}),
        '.er, .ll-ht .ge.ll-th {}',
      );
    });

    it('adds a prefix after renaming', async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {strategy, prefix: 'pf-', by: 'part'},
        }),
        '.pf-er, .pf-ll-ht .pf-ge.pf-ll-th {}',
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
        {classRenamingOptions: {strategy, by: 'part'}},
      );
    });

    it("doesn't map excluded names", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy,
            except: ['full-height'],
            by: 'part',
          },
        }),
        '.er, .full-height .ge.ll-th {}',
      );
    });

    it("doesn't map excluded regexes", async () => {
      assertPostcss(
        await run(INPUT, {
          classRenamingOptions: {
            strategy,
            except: [/full/],
            by: 'part',
          },
        }),
        '.er, .full-height .ge.full-width {}',
      );
    });
  });

  it("doesn't modify keyframes", async () => {
    assertPostcss(
      await run(KEYFRAMES, {classRenamingOptions: {strategy}}),
      KEYFRAMES,
    );
  });
});
