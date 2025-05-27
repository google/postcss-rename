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

/**
 * A predicate that determines if the given name should be skipped
 * in renaming or disallowed to be produced by a renaming function
 * @see strategy.ts
 */
export type SkipPredicate = (name: string) => boolean;

/**
 * Creates a {@link SkipPredicate} that filters against the given strings or
 * regular expressions.
 * @param except - strings or regular expressions to filter against
 * @returns SkipPredicate
 */
export function createSkipPredicate(
  except?: Iterable<string | RegExp>,
): SkipPredicate {
  if (!except) {
    // If no `except` is given, then assume everything is allowed
    return name => false;
  }

  const disallowedNames = new Set();
  const disallowedPatterns: RegExp[] = [];

  for (const disallowed of except) {
    if (typeof disallowed === 'string') {
      disallowedNames.add(disallowed);
    } else {
      disallowedPatterns.push(disallowed);
    }
  }

  return (name: string) => {
    return (
      disallowedNames.has(name) ||
      disallowedPatterns.some(disallowedPattern => disallowedPattern.test(name))
    );
  };
}
