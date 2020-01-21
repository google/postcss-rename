/*
 * Copyright 2011 Google Inc.
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

import {MultipleMappingSubstitutionMap} from './multiple-mapping-substitution-map';
import {Map as ImmutableMap, Set as ImmutableSet} from 'immutable';
import {SubstitutionMap} from './substitution-map';
import ValueWithMappings = MultipleMappingSubstitutionMap.ValueWithMappings;

function isMultipleMappingSubstitutionMap(arg: SubstitutionMap): arg is MultipleMappingSubstitutionMap {
  return arg && 'getValueWithMappings' in arg;
}

/**
 * A {@link SubstitutionMap} implementation that prefixes the renamed CSS class names (provided by a
 * delegate substitution map).
 *
 */
export class PrefixingSubstitutionMap
    implements MultipleMappingSubstitutionMap, SubstitutionMap.Initializable {
  private readonly delegate: SubstitutionMap;
  private readonly prefix: string;

  constructor(delegate: SubstitutionMap, prefix: string) {
    this.delegate = delegate;
    this.prefix = prefix;
  }

  initializeWithMappings(newMappings: ImmutableMap<string, string>) {
    if (!newMappings.isEmpty()) {
      // We don't need to remove prefixes from mapping values because the mappings
      // returned by getValueWithMappings are not prefixed.
      (this.delegate as SubstitutionMap.Initializable).initializeWithMappings(newMappings);
    }
  }

  get(key: string): string {
    return this.prefix + this.delegate.get(key);
  }

  getValueWithMappings(key: string): ValueWithMappings {
    if (isMultipleMappingSubstitutionMap(this.delegate)) {
      const withoutPrefix =
          this.delegate.getValueWithMappings(key);
      return ValueWithMappings.createWithValueAndMappings(
          this.prefix + withoutPrefix.value, withoutPrefix.mappings);
    } else {
      return ValueWithMappings.createForSingleMapping(key, this.get(key));
    }
  }
}
