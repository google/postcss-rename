/**
 * Copyright 2008 Google Inc.
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

import {SubstitutionMap} from './substitution-map';
import {Map as ImmutableMap, Set as ImmutableSet} from 'immutable';
import * as Preconditions from 'conditional';

/**
 * MinimalSubstitutionMap is a SubstitutionMap that renames CSS classes to the
 * shortest string possible.
 */
export class MinimalSubstitutionMap implements SubstitutionMap.Initializable {

  /** Possible first chars in a CSS class name */
  private static readonly START_CHARS = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
      'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ];

  /** Possible non-first chars in a CSS class name */
  private static readonly CHARS = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
      'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ];

  /**
   * Last value used with toShortString().
   */
  private lastIndex: number;

  /**
   * Characters that can be used at the start of a CSS class name.
   */
  private readonly startChars: string[];

  /**
   * Characters that can be used in a CSS class name (though not necessarily as
   * the first character).
   */
  private readonly chars: string[];

  /**
   * Number of startChars.
   */
  private readonly startCharsRadix: number;

  /**
   * Number of chars.
   */
  private readonly charsRadix: number;

  /**
   * Value equal to Math.log(charsRadix). Stored as a field so it does not need
   * to be recomputed each time toShortString() is invoked.
   */
  private readonly logCharsRadix: number;

  /**
   * Map of CSS classes that were renamed. Keys are original class names and
   * values are their renamed equivalents.
   */
  private readonly renamedCssClasses: Map<string, string>;

  /**
   * A set of CSS class names that may not be output from this substitution map.
   */
  private outputValueBlacklist: ImmutableSet<string>;

  /**
   * Creates a new MinimalSubstitutionMap that generates CSS class names from
   * the specified set of characters.
   * @param startChars Possible values for the first character of a CSS class
   *     name.
   * @param chars Possible values for the characters other than the first
   *     character in a CSS class name.
   * @param outputValueBlacklist A set of CSS class names that may not be
   *     returned as the output from a substitution lookup.
   */
  constructor(
      startChars?: string[], chars?: string[], outputValueBlacklist?: Set<string>) {
    this.lastIndex = 0;
    this.startChars = startChars ? startChars.slice() : MinimalSubstitutionMap.START_CHARS;
    this.startCharsRadix = this.startChars.length;
    this.chars = chars ? chars.slice() : MinimalSubstitutionMap.CHARS;
    this.charsRadix = this.chars.length;
    this.logCharsRadix = Math.log(this.charsRadix);
    this.renamedCssClasses = new Map();
    this.outputValueBlacklist = outputValueBlacklist ? ImmutableSet(outputValueBlacklist) : ImmutableSet();
  }

  /** {@inheritDoc} */
  get(key: string): string {
    let value = this.renamedCssClasses.get(key);
    if (value == null) {
      do {
        value = this.toShortString(this.lastIndex++);
      } while (this.outputValueBlacklist.has(value));

      this.renamedCssClasses.set(key, value);
    }
    return value;
  }

  initializeWithMappings(m: ImmutableMap<string, string>): void {
    Preconditions.checkState(this.renamedCssClasses.size === 0);
    this.outputValueBlacklist =
        ImmutableSet(this.outputValueBlacklist).union(m.values());
    m.forEach((value, key) => this.renamedCssClasses.set(key, value));
  }

  /**
   * Converts a 32-bit integer to a unique short string whose first character
   * is in {@link #START_CHARS} and whose subsequent characters, if any, are
   * in {@link #CHARS}. The result is 1-6 characters in length.
   * @param index The index into the enumeration of possible CSS class names
   *     given the set of valid CSS characters in this class.
   * @return The CSS class name that corresponds to the index of the
   *     enumeration.
   */
  toShortString(index: number): string {
    // Given the number of non-start characters, C, then for each start
    // character, S, there will be:
    //   1 one-letter CSS class name that starts with S
    //   C two-letter CSS class names that start with S
    //   C^2 three-letter CSS class names that start with S
    //   C^3 four-letter CSS class names that start with S
    //   and so on...
    //
    // That means that the number of non-start characters, n, in terms of i is
    // defined as the greatest value of n that satisfies the following:
    //
    // 1 + C + C^2 + ... + C^(n - 1) <= i
    //
    // Substituting (C^n - 1) / (C - 1) for the geometric series, we get:
    //
    // (C^n - 1) / (C - 1) <= i
    // (C^n - 1) <= i * (C - 1)
    // C^n <= i * (C - 1) + 1
    // log C^n <= log (i * (C - 1) + 1)
    // n log C <= log (i * (C - 1) + 1)
    // n <= log (i * (C - 1) + 1) / log C
    //
    // Because we are looking for the largest value of n that satisfies the
    // inequality and we require n to be an integer, n can be expressed as:
    //
    // n = [[ log (i * (C - 1) + 1) / log C ]]
    //
    // where [[ x ]] is the greatest integer not exceeding x.
    //
    // Once n is known, the standard modulo-then-divide approach can be used to
    // determine each character that should be appended to s.
    let i = Math.floor(index / this.startCharsRadix);
    const n = Math.floor(Math.log(i * (this.charsRadix - 1) + 1) / this.logCharsRadix);

    // The array is 1 more than the number of secondary chars to account for the
    // first char.
    const cssNameChars = new Array<string>(n + 1);
    cssNameChars[0] = this.startChars[index % this.startCharsRadix];

    for (let k = 1; k <= n; ++k) {
      cssNameChars[k] = this.chars[i % this.charsRadix];
      i = Math.floor(i / this.charsRadix);
    }

    return cssNameChars.join('');
  }
}