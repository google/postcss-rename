/*
 * Copyright 2008 Google Inc.
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

import com.google.common.annotations.VisibleForTesting;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Wrapper around JavaScript version of MinimalSubstitutionMap.
 */
public class MinimalSubstitutionMap implements SubstitutionMap.Initializable, JavaScriptDelegator.Delegating {

  JavaScriptDelegator delegator;

  public MinimalSubstitutionMap() {
    delegator = new JavaScriptDelegator("MinimalSubstitutionMap", "minimal-substitution-map");
    delegator.initialize();
  }

  public MinimalSubstitutionMap(Set<String> outputValueBlacklist) {
    delegator = new JavaScriptDelegator("MinimalSubstitutionMap", "minimal-substitution-map");
    delegator.initialize(null, null, outputValueBlacklist);
  }

  @VisibleForTesting
  MinimalSubstitutionMap(char[] startChars, char[] chars) {
    delegator = new JavaScriptDelegator("MinimalSubstitutionMap", "minimal-substitution-map");
    List<String> startCharsStr = new String(startChars).chars().mapToObj(i -> String.valueOf((char)i)).collect(Collectors.toList());;
    List<String> charsStr = new String(chars).chars().mapToObj(i -> String.valueOf((char)i)).collect(Collectors.toList());
    delegator.initialize(startCharsStr, charsStr);
  }

  @VisibleForTesting
  MinimalSubstitutionMap(
          char[] startChars, char[] chars, Set<String> outputValueBlacklist) {
    delegator = new JavaScriptDelegator("MinimalSubstitutionMap", "minimal-substitution-map");
    List<String> startCharsStr = new String(startChars).chars().mapToObj(i -> String.valueOf((char)i)).collect(Collectors.toList());;
    List<String> charsStr = new String(chars).chars().mapToObj(i -> String.valueOf((char)i)).collect(Collectors.toList());
    delegator.initialize(startCharsStr, charsStr, outputValueBlacklist);
  }

  @Override
  public String get(String key) {
    return delegator.substitutionMapGet(key);
  }

  @Override
  public void initializeWithMappings(Map<? extends String, ? extends String> initialMappings) {
    delegator.substitutionMapInitializableInitializeWithMappings(initialMappings);
  }

  @VisibleForTesting
  String toShortString(int index) {
    return delegator.executeObject("toShortString", index).toString();
  }

  @Override
  public Object getDelegatedJSObject() {
    return delegator.delegatedMap;
  }
}
