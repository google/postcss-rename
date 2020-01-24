/*
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

package com.google.common.css;

import com.google.common.base.Preconditions;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;
import java.util.Map;

/**
 * The CSS class substitution map which splits CSS class names on the "-" (dash)
 * character and processes them separately using a delegate substitution map.
 *
 * @author dgajda@google.com (Damian Gajda)
 */
public class SplittingSubstitutionMap implements
    MultipleMappingSubstitutionMap, SubstitutionMap.Initializable, JavaScriptDelegator.Delegating {
  JavaScriptDelegator delegator;

  public SplittingSubstitutionMap(SubstitutionMap substitutionMap) {
    delegator = new JavaScriptDelegator("SplittingSubstitutionMap", "splitting-substitution-map");

    if (substitutionMap instanceof JavaScriptDelegator.Delegating) {
      delegator.initialize(((JavaScriptDelegator.Delegating) substitutionMap).getDelegatedJSObject());
    } else {
      delegator.initialize(new JavaScriptDelegator(substitutionMap).delegatedMap);
    }
  }

  @Override
  public void initializeWithMappings(Map<? extends String, ? extends String> newMappings) {
    delegator.substitutionMapInitializableInitializeWithMappings(newMappings);
  }

  @Override
  public String get(String key) {
    return delegator.substitutionMapGet(key);
  }

  @Override
  public ValueWithMappings getValueWithMappings(String key) {
    return delegator.multipleMappingSubstitutionMapGetValueWithMappings(key);
  }

  @Override
  public Object getDelegatedJSObject() {
    return delegator.delegatedMap;
  }
}
