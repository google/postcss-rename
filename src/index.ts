/**
 * @license
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

import selectorParser from 'postcss-selector-parser';

import postcss, {AnyNode} from 'postcss';
import {MinimalRenamer} from './minimal-renamer';
import {type ClassRenamingOptions} from './options';
import {type SkipPredicate, createSkipPredicate} from './skip';
import {type RenamingFunction, createStrategy} from './strategy';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace plugin {
  export type Options = ClassRenamingOptions;
}

function plugin({
  strategy = 'none',
  by = 'whole',
  prefix = '',
  except = [],
  ids = false,
  outputMapCallback,
}: plugin.Options = {}): postcss.Plugin {
  const exceptSet = new Set(except);
  return {
    postcssPlugin: 'postcss-rename',
    prepare() {
      if (strategy === 'none' && !outputMapCallback && !prefix) return {};

      const outputMap: {[key: string]: string} | null = outputMapCallback
        ? {}
        : null;

      const skip: SkipPredicate = createSkipPredicate(except);
      const rename: RenamingFunction = createStrategy(strategy, skip);

      if (by !== 'whole' && by !== 'part') {
        throw new Error(`Unknown mode "${by}".`);
      }

      function renameNode(
        node: selectorParser.ClassName | selectorParser.Identifier,
      ): void {
        if (skip(node.value)) return;

        if (by === 'part') {
          node.value =
            prefix +
            node.value
              .split('-')
              .map(part => {
                const newPart = skip(part) ? part : rename(part);
                if (outputMap) outputMap[part] = newPart;
                return newPart;
              })
              .join('-');
        } else {
          const newName = prefix + rename(node.value);
          if (outputMap) outputMap[node.value] = newName;
          node.value = newName;
        }
      }

      const selectorProcessor = selectorParser(selectors => {
        selectors.walkClasses(renameNode);
        if (ids) selectors.walkIds(renameNode);
      });

      return {
        Rule(ruleNode: postcss.Rule) {
          const parent = ruleNode.parent as AnyNode;
          if (parent.type !== 'atrule' || !parent.name.endsWith('keyframes')) {
            // TODO(goodwine): Use processSync().
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            selectorProcessor.process(ruleNode);
          }
        },
        OnceExit() {
          if (outputMapCallback) outputMapCallback(outputMap ?? {});
        },
      };
    },
  };
}

plugin.postcss = true;

export = plugin;
