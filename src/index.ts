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

import * as fs from 'fs';
import * as postcss from 'postcss';
import * as selectorParser from 'postcss-selector-parser';
import { OutputRenamingMapFormat } from './com/google/common/css/output-renaming-map-format';
import { PrefixingSubstitutionMap } from './com/google/common/css/prefixing-substitution-map';
import { RecordingSubstitutionMap } from './com/google/common/css/recording-substitution-map';
import { RENAMING_TYPE, Options } from './options';

export = postcss.plugin(
  'postcss-rename',
  (options: Partial<Options> = {}) => {
    return (root: postcss.Root) => {
      const opts = Object.assign(
        {
          renamingType: 'none',
          outputRenamingMap: '',
          cssRenamingPrefix: '',
        },
        options
      );

      let map = RENAMING_TYPE[opts.renamingType]();
      if (opts.cssRenamingPrefix) {
        map = new PrefixingSubstitutionMap(map, opts.cssRenamingPrefix);
      }
      const substitutionMap = new RecordingSubstitutionMap.Builder()
        .withSubstitutionMap(map)
        .build();

      const selectorProcessor = selectorParser(selectors => {
        selectors.walkClasses(classNode => {
          if (classNode.value) {
            classNode.value = substitutionMap.get(classNode.value);
          }
        });
      });

      root.walkRules(ruleNode => {
        return selectorProcessor.process(ruleNode);
      });

      // Write the class substitution map to file, using same format as
      // VariableMap in jscomp.
      if (opts.outputRenamingMap) {
        const renamingMap = new Map([...substitutionMap.getMappings()]);
        const writer = fs.createWriteStream(opts.outputRenamingMap);
        OutputRenamingMapFormat.CLOSURE_COMPILED_SPLIT_HYPHENS().writeRenamingMap(
          renamingMap,
          writer
        );
      }
    };
  }
);
