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

package com.google.common.css;

/**
 * Wrapper around JavaScript version of IdentitySubstitutionMap.
 */
public class IdentitySubstitutionMap implements SubstitutionMap, JavaScriptDelegator.Delegating {

  JavaScriptDelegator delegator;

  public IdentitySubstitutionMap() {
    delegator = new JavaScriptDelegator("IdentitySubstitutionMap", "identity-substitution-map");
    delegator.initialize();
  }

  @Override
  public String get(String key) {
    return delegator.substitutionMapGet(key);
  }

  @Override
  public Object getDelegatedJSObject() {
    return delegator.delegatedMap;
  }
}
