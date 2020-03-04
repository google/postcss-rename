/**
 * @license
 * Copyright 2009 Google Inc.
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
import {MultipleMappingSubstitutionMap} from './multiple-mapping-substitution-map';
import {Map as ImmutableMap} from 'immutable';
import * as Preconditions from 'conditional';
import * as GuavaJS from 'guava-js-umd';
import Splitter = GuavaJS.Strings.Splitter;

/**
 * The CSS class substitution map which splits CSS class names on the "-" (dash)
 * character and processes them separately using a delegate substitution map.
 *
 * @author dgajda@google.com (Damian Gajda)
 */
export class SplittingSubstitutionMap implements
    MultipleMappingSubstitutionMap, SubstitutionMap.Initializable {
  private static readonly DASH = Splitter.on('-');
  private readonly delegate: SubstitutionMap;

  constructor(substitutionMap: SubstitutionMap) {
    this.delegate = substitutionMap;
  }

  initializeWithMappings(newMappings: ImmutableMap<string, string>) {
    if (newMappings.size) {
      (this.delegate as SubstitutionMap.Initializable).initializeWithMappings(newMappings);
    }
  }

  get(key: string): string {
    return this.getValueWithMappings(key).value;
  }

  getValueWithMappings(key: string): MultipleMappingSubstitutionMap.ValueWithMappings {
    Preconditions.checkNotNull(key, "CSS key cannot be null");
    Preconditions.checkArgument(key.length, "CSS key cannot be empty");

    // Efficiently handle the common case with no dashes.
    if (key.indexOf('-') === -1) {
      const value = this.delegate.get(key);
      return MultipleMappingSubstitutionMap.ValueWithMappings.createForSingleMapping(key, value);
    }

    const buffer = [];
    // Cannot use an ImmutableMap.Builder because the same key/value pair may be
    // inserted more than once in this loop.
    const mappings = new Map();
    for (const part of SplittingSubstitutionMap.DASH.split(key)) {
      if (buffer.length !== 0) {
        buffer.push('-');
      }

      const value = this.delegate.get(part);
      mappings.set(part, value);
      buffer.push(value);
    }

    const renamedClassComposedFromParts = buffer.join('');

    return MultipleMappingSubstitutionMap.ValueWithMappings.createWithValueAndMappings(
        renamedClassComposedFromParts,
        ImmutableMap(mappings));
  }
}
