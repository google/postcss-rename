/**
 * Copyright 2020 Google LLC
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

import { IdentitySubstitutionMap } from './com/google/common/css/identity-substitution-map';
import { MinimalSubstitutionMap } from './com/google/common/css/minimal-substitution-map';
import { SimpleSubstitutionMap } from './com/google/common/css/simple-substitution-map';
import { SplittingSubstitutionMap } from './com/google/common/css/splitting-substitution-map';

export const RENAMING_TYPE = {
  none: () => new IdentitySubstitutionMap(),
  debug: () => new SplittingSubstitutionMap(new SimpleSubstitutionMap()),
  closure: () => new SplittingSubstitutionMap(new MinimalSubstitutionMap()),
};

export interface Options {
  renamingType?: keyof typeof RENAMING_TYPE;
  outputRenamingMap?: string | null;
  cssRenamingPrefix?: string | null;
}
