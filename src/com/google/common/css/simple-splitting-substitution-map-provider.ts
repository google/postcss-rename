/**
 * @license
 * Copyright 2014 Google Inc.
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

import {SimpleSplittingSubstitutionMap} from './simple-splitting-substitution-map';
import {SubstitutionMap} from './substitution-map';
import {SubstitutionMapProvider} from './substitution-map-provider';

/**
 * Provides a {@link SimpleSplittingSubstitutionMap} for use via the
 * command-line compiler.
 *
 * @see SimpleSplittingSubstitutionMap
 * @author jart@google.com (Justine Tunney)
 */
export class SimpleSplittingSubstitutionMapProvider implements SubstitutionMapProvider {

  get(): SubstitutionMap {
    return new SimpleSplittingSubstitutionMap();
  }
}
