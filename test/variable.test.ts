/**
 * @license
 * Copyright 2025 Google LLC
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

import plugin = require('../src/variable');
import {type RenamingMap} from '../src/options';
import postcss, {LazyResult} from 'postcss';

function run(input: string, options?: plugin.Options): LazyResult {
  return postcss([plugin(options)]).process(input, {from: undefined});
}

function assertPostcss(result: LazyResult, output: string): void {
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

function assertMapEquals(
  input: string,
  expected: RenamingMap,
  options: plugin.Options = {},
): void {
  run(input, {
    ...options,
    outputMapCallback: map => expect(map).toEqual(expected),
  });
}

// TODO(jiramide): add tests

describe('with strategy "none"', () => {
  describe('with no variables', () => {
    const input = `
      .no-variables-here {
        absolutely: "nothing";
      }
    `;

    const options: plugin.Options = {
      strategy: 'none',
    };

    it('does nothing', () => {
      assertPostcss(run(input, options), input);
    });
  });

  describe('with single declaration', () => {
    const input = `
      .some-class-here {
        --some-variable-here: 999px;
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-variable-here': 'some-variable-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-variable-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-variable-here': 'pf-some-variable-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with no default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here);
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-color-here': 'some-color-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here, 123px);
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-color-here': 'some-color-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  // TODO(jiramide): add cases with deeply nested var calls (e.g. var(--a, var(--b, var(--c))))
  describe('with deeply nested var uses', () => {
    const input = `
      .foo {
        color: var(--foo, var(--bar, var(--baz, var(--qux, #c0ffee))));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz',
        qux: 'qux',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
          baz: 'baz',
        },
        {
          except: ['foo', 'qux'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
          qux: 'qux',
        },
        {
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
          baz: 'pf-baz',
          qux: 'pf-qux',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  // TODO(jiramide): add cases with (var(...)) expressions (extraneous parens cause parsing difficulty with postcss-value-parser)
  describe('with extraneous parentheses', () => {
    const input1 = `
      .extraneous-parens {
        not-a-custom-property: (var(--one-extra-paren));
      }
    `;

    const input2 = `
      .extraneous-parens {
        not-a-custom-property: ((var(--two-extra-paren)));
      }
    `;

    const input3 = `
      .extraneous-parens {
        not-a-custom-property: (((var(--three-extra-paren))));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input1), input1);
      assertPostcss(run(input2), input2);
      assertPostcss(run(input3), input3);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input1, {strategy: 'none'}), input1);
      assertPostcss(run(input2, {strategy: 'none'}), input2);
      assertPostcss(run(input3, {strategy: 'none'}), input3);
    });

    it('emits an output map', () => {
      assertMapEquals(input1, {
        'one-extra-paren': 'one-extra-paren',
      });
      assertMapEquals(input2, {
        'two-extra-paren': 'two-extra-paren',
      });
      assertMapEquals(input2, {
        'three-extra-paren': 'three-extra-paren',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input1,
        {},
        {
          except: ['one-extra-paren'],
        },
      );
      assertMapEquals(
        input2,
        {},
        {
          except: ['two-extra-paren'],
        },
      );
      assertMapEquals(
        input3,
        {},
        {
          except: ['three-extra-paren'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input1,
        {},
        {
          except: [/extra/],
        },
      );
      assertMapEquals(
        input2,
        {},
        {
          except: [/extra/],
        },
      );
      assertMapEquals(
        input3,
        {},
        {
          except: [/extra/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input1,
        {
          'one-extra-paren': 'pf-one-extra-paren',
        },
        {
          prefix: 'pf',
        },
      );
      assertMapEquals(
        input2,
        {
          'two-extra-paren': 'pf-two-extra-paren',
        },
        {
          prefix: 'pf',
        },
      );
      assertMapEquals(
        input3,
        {
          'three-extra-paren': 'pf-three-extra-paren',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  // TODO(jiramide): add cases with calc
  describe('with calc', () => {
    const input = `
      .class {
        number: var(--foo, calc(1 + var(--bar)));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
        },
        {
          except: ['foo'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
        },
        {
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with deeply nested functions', () => {
    const input = `
      .class {
        number: var(--foo, rgb(var(--bar), var(--baz, var(--biz)), var(--boz)));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz',
        biz: 'biz',
        boz: 'boz',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
          baz: 'baz',
          biz: 'biz',
        },
        {
          except: ['foo', 'boz'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
        },
        {
          except: [/b/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
          baz: 'pf-baz',
          biz: 'pf-biz',
          boz: 'pf-boz',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  // TODO(jiramide):
});
  });

  describe('with single use with default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here, 123px);
      }
    `;
  });

  // TODO(jiramide): add cases with deeply nested var calls (e.g. var(--a, var(--b, var(--c))))
  describe('with deeply nested var uses', () => {
    const input = `
      .foo {
        color: var(--foo, var(--bar, var(--baz, var(--qux, #c0ffee))));
      }
    `;
  });

  // TODO(jiramide): add cases with (var(...)) expressions (extraneous parens cause parsing difficulty with postcss-value-parser)
  describe('with extraneous parentheses', () => {
    const input1 = `
      .extraneous-parens {
        not-a-custom-property: (var(--one-extra-paren));
      }
    `;

    const input2 = `
      .extraneous-parens {
        not-a-custom-property: ((var(--two-extra-paren)));
      }
    `;

    const input3 = `
      .extraneous-parens {
        not-a-custom-property: (((var(--three-extra-paren))));
      }
    `;
  });

  // TODO(jiramide): add cases with calc

  // TODO(jiramide):
});
