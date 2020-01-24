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

// TODO(bolinfest): Move this to com.google.common.css.compiler.passes.
package com.google.common.css;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Preconditions;
import com.google.common.base.Predicate;
import com.google.common.base.Predicates;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;
import com.google.common.css.MultipleMappingSubstitutionMap.ValueWithMappings;
import java.util.Map;

/**
 * A decorator for a {@link SubstitutionMap} that records which values it maps.
 *
 * @author bolinfest@google.com (Michael Bolin)
 */
public class RecordingSubstitutionMap implements SubstitutionMap.Initializable, JavaScriptDelegator.Delegating {

  JavaScriptDelegator delegator;

  private RecordingSubstitutionMap(JavaScriptDelegator delegator) {
    this.delegator = delegator;
  }

  @Override
  public String get(String key) {
    return delegator.substitutionMapGet(key);
  }

  public Map<String, String> getMappings() {
    return delegator.executeMap("getMappings");
  }

  @Override
  public void initializeWithMappings(Map<? extends String, ? extends String> newMappings) {
    delegator.substitutionMapInitializableInitializeWithMappings(newMappings);
  }

  @Override
  public Object getDelegatedJSObject() {
    return delegator.delegatedMap;
  }

  /** A-la-carte builder. */
  public static final class Builder {
    JavaScriptDelegator delegator;
    Object builder;

    public Builder() {
      delegator = new JavaScriptDelegator("RecordingSubstitutionMap", "recording-substitution-map");
      builder = delegator.initializeBuilder();
    }

    @VisibleForTesting
    public JavaScriptDelegator getDelegator() {
      return delegator;
    }

    /** Specifies the underlying map. Multiple calls clobber. */
    public Builder withSubstitutionMap(SubstitutionMap d) {
      if (d instanceof JavaScriptDelegator.Delegating) {
        builder = delegator.executeOnObject(builder, "withSubstitutionMap", ((JavaScriptDelegator.Delegating) d).getDelegatedJSObject());
        return this;
      } else {
        builder = delegator.executeOnObject(builder, "withSubstitutionMap", new JavaScriptDelegator(d).delegatedMap);
        return this;
      }
    }

    /**
     * True keys that should be treated mapped to themselves instead of passing through Multiple
     * calls AND.
     */
    public Builder shouldRecordMappingForCodeGeneration(Predicate<? super String> p) {
      builder = delegator.executeOnObject(builder, "shouldRecordMappingForCodeGeneration", delegator.wrapPredicate(p));
      return this;
    }

    /**
     * Specifies mappings to {@linkplain Initializable initialize} the delegate with. Multiple calls
     * putAll. This can be used to reconstitute a map that was written out by {@link
     * OutputRenamingMapFormat#writeRenamingMap} from the output of {@link
     * OutputRenamingMapFormat#readRenamingMap}.
     */
    public Builder withMappings(Map<? extends String, ? extends String> m) {
      builder = delegator.recordingSubstitutionMapBuilderWithMappings(builder, m);
      return this;
    }

    /** Builds the substitution map based on previous operations on this builder. */
    public RecordingSubstitutionMap build() {
      delegator.initializeBuilt(delegator.executeOnObject(builder, "build", null));
      return new RecordingSubstitutionMap(delegator);
    }
  }
}
