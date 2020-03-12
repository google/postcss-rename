/**
 * @license
 * Copyright 2020 Google Inc.
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Possible first chars in a CSS name. This only includes ASCII characters to
 * avoid the risk of encoding mismatches, and it doesn't include `-` in case the
 * user is doing by-part renaming.
 */
const START_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('');

/**
 * Possible non-initial chars in a CSS name. This only includes ASCII characters
 * to avoid the risk of encoding mismatches, and it doesn't include `-` in case
 * the user is doing by-part renaming.
 */
const CHARS = 
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('');

/**
 * Returns the next unique short string whose first character is in
 * `START_CHARS` and whose subsequent characters, if any, are in `CHARS`.
 *
 * This is public so it can be unit-tested.
 */
export function toShortName(index: number): string {
  const result = [START_CHARS[index % START_CHARS.length]];
  if (index < START_CHARS.length) return result.join('');
  index = Math.floor(index / START_CHARS.length) - 1;

  while (true) {
    result.push(CHARS[index % CHARS.length]);
    if (index < CHARS.length) break;
    index = Math.floor(index / CHARS.length) - 1;
  }

  return result.join('');
}

/** Renames CSS namesto the smallest valid identifiers. */
export class MinimalRenamer {
  /** The next index to pass to `toShortName()`. */
  private nextIndex = 0;

  /** A map from original CSS names to their renamed equivalents. */
  private readonly renames = new Map<string, string>();

  /**
   * Creates a new MinimalSubstitutionMap that generates CSS names from the
   * specified set of characters.
   *
   * @param except A set of CSS names that may not be returned as the output
   *     from a substitution lookup.
   */
  constructor(private readonly except = new Set<String>()) {}

  rename(key: string): string {
    let value = this.renames.get(key);
    if (value) return value;

    do {
      value = toShortName(this.nextIndex++);
    } while (this.except.has(value));

    this.renames.set(key, value);
    return value;
  }
}
