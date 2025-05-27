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

import {MinimalRenamer} from './minimal-renamer';
import {type SkipPredicate} from './skip';

/**
 * Renaming function.
 *
 * A renaming function must satisfy the following:
 * - A renaming function always produces the same output for a specific input.
 * - A renaming function does not produce anything that is in the user-specified
 *   skiplist.
 */
export type RenamingFunction = (original: string) => string;

/**
 * Defines a way to rename variables.
 * - 'none' performs no renaming.
 * - 'debug' appends an underscore ('_') at the end of the name.
 * - 'minimal' uses a minimal renamer (@see minimal-renamer.ts).
 * - a custom renaming function
 */
export type RenamingStrategy = 'none' | 'debug' | 'minimal' | RenamingFunction;

/**
 * Produces a renaming function from the given `strategy`
 * @returns renaming function
 * @throws if strategy isn't a function or one of 'none', 'debug', 'minimal'
 */
export function createStrategy(
  strategy: RenamingStrategy,
  skip: SkipPredicate,
): RenamingFunction {
  if (typeof strategy === 'function') {
    return strategy;
  }

  switch (strategy) {
    case 'none':
      return name => name;
    case 'debug':
      return name => name + '_';
    case 'minimal': {
      const renamer = new MinimalRenamer(skip);
      return name => renamer.rename(name);
    }
    default:
      throw new Error(`Unknown strategy "${strategy}".`);
  }
}
