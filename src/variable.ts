/**
 * @license
 * Copyright 2025 Google LLC
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

import postcss, {Declaration} from 'postcss';
import valueParser from 'postcss-value-parser';
import {MinimalRenamer} from './minimal-renamer';
import {type VariableRenamingOptions, type RenamingMap} from './options';
import {type SkipPredicate, createSkipPredicate} from './skip';
import {type RenamingFunction, createStrategy} from './strategy';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace plugin {
  export type Options = VariableRenamingOptions;
}

/**
 * Strips a CSS variable of its double-dash (--) prefix if it's present.
 * @param variable CSS variable to strip prefix of
 * @return string variable without double-dash prefix
 */
function stripVariable(variable: string): string {
  return variable.startsWith('--') ? variable.substring(2) : variable;
}

// eslint-disable-next-line no-redeclare
const plugin = ({
  strategy = 'none',
  prefix = '',
  outputMapCallback,
  except = [],
}: plugin.Options = {}): postcss.Plugin => {
  return {
    postcssPlugin: 'postcss-variable-rename',
    prepare() {
      // TODO(jiramide): add variable renaming logic

      if (strategy === 'none' && !outputMapCallback && !prefix) return {};

      const outputMap: RenamingMap | null = outputMapCallback ? {} : null;
      const alreadyProcessedNodes = new Set<Declaration>();

      const skip: SkipPredicate = createSkipPredicate(except);
      const rename: RenamingFunction = createStrategy(strategy, skip);

      /**
       * Renames the given `variable` if prefixed with '--'; otherwise does nothing.
       * @param variable - CSS variable to rename; this can be prefixed or not.
       * @returns string - The renamed CSS variable. This is prefixed with '--'.
       */
      function renameVariable(variable: string): string {
        if (!variable.startsWith('--')) {
          return variable;
        }

        const strippedVariable = stripVariable(variable);
        const renamedVariable = prefix
          ? prefix + '-' + rename(strippedVariable)
          : rename(strippedVariable);

        if (outputMap) {
          outputMap[strippedVariable] = renamedVariable;
        }

        return '--' + renamedVariable;
      }

      function renameValue(value: string): string {
        const parsed = valueParser(value);
        parsed.walk(node => {
          if (node.type !== 'function' || node.value !== 'var') {
            return;
          }

          /**
           * `node` is one-of:
           * - var(--x)
           * - var(--x, value)
           *
           * `value` can, itself, be another `var` call. This means that we
           * need to deeply explore in case `value` itself is a variable use.
           */
        });

        return parsed.toString();
      }

      function renameDeclaration(declarationNode: Declaration): void {
        if (alreadyProcessedNodes.has(declarationNode)) {
          return;
        }

        alreadyProcessedNodes.add(declarationNode);

        declarationNode.prop = renameVariable(declarationNode.prop);
        declarationNode.value = renameValue(declarationNode.value);
      }

      return {};
    },
  };
};

plugin.postcss = true;

export = plugin;
