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

// TODO(bolinfest): Move this to com.google.common.css.compiler.passes.
import {IdentitySubstitutionMap} from './identity-substitution-map';
import {SubstitutionMap} from './substitution-map';
import {MultipleMappingSubstitutionMap} from './multiple-mapping-substitution-map';
import {Map as ImmutableMap, OrderedMap as OrderedImmutableMap} from 'immutable';
import * as Preconditions from 'conditional';

type Predicate<T> = (input: T) => boolean;

function isMultipleMappingSubstitutionMap(arg: SubstitutionMap): arg is MultipleMappingSubstitutionMap {
  return arg && 'getValueWithMappings' in arg;
}

/**
 * A decorator for a {@link SubstitutionMap} that records which values it maps.
 *
 * @author bolinfest@google.com (Michael Bolin)
 */
// Hack to hide the constructor, because the Builder class, unlike in Java,
// can't simultaneously be an inner class and have private properties.
interface RecordingSubstitutionMap extends SubstitutionMap.Initializable {
  get(key: string): string;
  getMappings(): ImmutableMap<string, string>;
  initializeWithMappings(newMappings: ImmutableMap<string, string>): void;
}

class RecordingSubstitutionMapImpl implements RecordingSubstitutionMap {

  private readonly delegate: SubstitutionMap;

  private readonly shouldRecordMappingForCodeGeneration: Predicate<string>;

  // Use a LinkedHashMap so getMappings() is deterministic.
  private readonly mappings: Map<string, string> = new Map();

  constructor(
      map: SubstitutionMap, shouldRecordMappingForCodeGeneration: Predicate<string>) {
    this.delegate = map;
    this.shouldRecordMappingForCodeGeneration = shouldRecordMappingForCodeGeneration;
  }

  /**
   * {@inheritDoc}
   * @throws NullPointerException if key is null.
   */
  get(key: string): string {
    Preconditions.checkNotNull(key);
    if (!this.shouldRecordMappingForCodeGeneration.apply(this, [key])) {
      return key;
    }

    if (isMultipleMappingSubstitutionMap(this.delegate)) {
      // The final value only bears a loose relationship to the mappings.
      // For example, PrefixingSubstitutionMap applied to a MinimalSubstitutionMap
      // minimizes all components but only prefixes the first.
      // We can't memoize the value here, so don't look up in mappings first.
      const valueWithMappings = this.delegate.getValueWithMappings(key);
      valueWithMappings.mappings.forEach((value, key) => this.mappings.set(key, value));
      return valueWithMappings.value;
    } else {
      let value = this.mappings.get(key);
      if (value == null) {
        value = this.delegate.get(key);
        this.mappings.set(key, value);
      }
      return value;
    }
  }

  /**
   * @return The recorded mappings in the order they were created. This output may be used with
   *     {@link OutputRenamingMapFormat#writeRenamingMap}
   */
  getMappings() {
    return OrderedImmutableMap(this.mappings);
  }

  initializeWithMappings(newMappings: ImmutableMap<string, string>) {
    Preconditions.checkState(!this.mappings.size);
    if (newMappings.size > 0) {
      newMappings.forEach((value, key) => this.mappings.set(key, value));
      (this.delegate as SubstitutionMap.Initializable).initializeWithMappings(newMappings);
    }
  }
}

/* tslint:disable:no-namespace */
namespace RecordingSubstitutionMap {
  /** A-la-carte builder. */
  export class Builder {
    private delegate: SubstitutionMap = new IdentitySubstitutionMap();
    private shouldRecordMappingForCodeGenerationPredicate: Predicate<string> = () => true;
    private mappings: Map<string, string> = new Map();

    /** Specifies the underlying map. Multiple calls clobber. */
    withSubstitutionMap(d: SubstitutionMap) {
      Preconditions.checkNotNull(d);
      this.delegate = d;
      return this;
    }

    /**
     * True keys that should be treated mapped to themselves instead of passing through Multiple
     * calls AND.
     */
    shouldRecordMappingForCodeGeneration(p: Predicate<string>) {
      const oldPredicate = this.shouldRecordMappingForCodeGenerationPredicate;
      this.shouldRecordMappingForCodeGenerationPredicate = (input) => oldPredicate(input) && p(input);
      return this;
    }

    /**
     * Specifies mappings to {@linkplain Initializable initialize} the delegate with. Multiple calls
     * putAll. This can be used to reconstitute a map that was written out by {@link
     * OutputRenamingMapFormat#writeRenamingMap} from the output of {@link
     * OutputRenamingMapFormat#readRenamingMap}.
     */
    withMappings(m: Map<string, string>) {
      m.forEach((value, key) => this.mappings.set(key, value));
      return this;
    }

    /** Builds the substitution map based on previous operations on this builder. */
    build(): RecordingSubstitutionMap {
      // TODO(msamuel): if delegate instanceof MultipleMappingSubstitutionMap
      // should this return a RecordingSubstitutionMap that is itself
      // a MultipleMappingSubstitutionMap.
      const built =
          new RecordingSubstitutionMapImpl(this.delegate, this.shouldRecordMappingForCodeGenerationPredicate);
      built.initializeWithMappings(ImmutableMap(this.mappings));
      return built;
    }
  }
}

export { RecordingSubstitutionMap };
