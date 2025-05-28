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

function assertPostcss(result: Result, output: string): void {
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
  });

  describe('with single use with no default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here);
      }
    `;
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
