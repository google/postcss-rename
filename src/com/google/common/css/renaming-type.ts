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

import { IdentitySubstitutionMap } from './identity-substitution-map';
import { MinimalSubstitutionMap } from './minimal-substitution-map';
import { SimpleSubstitutionMap } from './simple-substitution-map';
import { SplittingSubstitutionMap } from './splitting-substitution-map';
import { SubstitutionMap } from './substitution-map';
import { SubstitutionMapProvider } from './substitution-map-provider';

/**
 * {@link RenamingType} is an enumeration of the possible values for the
 * {@code --rename} option in {@link ClosureCommandLineCompiler}. Each
 * corresponds to an implementation of {@link SubstitutionMapProvider} that
 * creates a {@link SubstitutionMap} to reflect the type of renaming.
 *
 * @author bolinfest@google.com (Michael Bolin)
 */
class RenamingType {
  private readonly provider: SubstitutionMapProvider;

  constructor(provider: SubstitutionMapProvider) {
    this.provider = provider;
  }

  getCssSubstitutionMapProvider(): SubstitutionMapProvider {
    return this.provider;
  }
}

/* tslint:disable:no-namespace */
namespace RenamingType {
  const NULL_RENAMING_TYPE = new RenamingType(new class implements SubstitutionMapProvider {
    get(): SubstitutionMap {
      throw Error('Undefined renaming type');
    }
  });

  /** No renaming is done. */
  export const NONE = NULL_RENAMING_TYPE;
  Object.defineProperty(RenamingType, 'NONE', {
    enumerable: true,
    get: () => new RenamingType(new class implements SubstitutionMapProvider {
      get(): SubstitutionMap {
        return new IdentitySubstitutionMap();
      }
    })
  });

  /** A trailing underscore is added to each part of a CSS class. */
  export const DEBUG = NULL_RENAMING_TYPE;
  Object.defineProperty(RenamingType, 'DEBUG', {
    enumerable: true,
    get: () => new RenamingType(new class implements SubstitutionMapProvider {
      get(): SubstitutionMap {
        // This wraps the SimpleSubstitutionMap in a SplittingSubstitutionMap so
        // that can be used with goog.getCssName().
        return new SplittingSubstitutionMap(new SimpleSubstitutionMap());
      }
    })
  });


  /**
   * Each chunk of a CSS class as delimited by '-' is renamed using the
   * shortest available name.
   */
  export const CLOSURE = NULL_RENAMING_TYPE;
  Object.defineProperty(RenamingType, 'CLOSURE', {
    enumerable: true,
    get: () => new RenamingType(new class implements SubstitutionMapProvider {
      get(): SubstitutionMap {
        return new SplittingSubstitutionMap(new MinimalSubstitutionMap());
      }
    })
  });
}

export { RenamingType };
