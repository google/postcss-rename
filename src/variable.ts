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
import {type RenamingMap, type VariableRenamingOptions} from './options';
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
function stripVariablePrefix(variable: string): string {
  return variable.startsWith('--') ? variable.substring(2) : variable;
}

// eslint-disable-next-line no-redeclare
function plugin({
  strategy = 'none',
  prefix = '',
  outputMapCallback,
  except = [],
}: plugin.Options = {}): postcss.Plugin {
  return {
    postcssPlugin: 'postcss-variable-rename',
    prepare() {
      if (strategy === 'none' && !outputMapCallback && !prefix) return {};

      const outputMap: RenamingMap | null = outputMapCallback ? {} : null;

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

        const strippedVariable = stripVariablePrefix(variable);

        if (skip(strippedVariable)) {
          return variable;
        }

        const renamedVariable = prefix
          ? prefix + '-' + rename(strippedVariable)
          : rename(strippedVariable);

        if (outputMap) {
          outputMap[strippedVariable] = renamedVariable;
        }

        return '--' + renamedVariable;
      }

      /**
       * Walks the given AST node and renames any variables it spots as it goes
       *
       * NOTE: This function does not explicitly check for `var(...)`
       * function-nodes, and it indiscriminately rename any word-type nodes
       * it sees that has the custom CSS property prefix. As of May 30, 2025,
       * nothing in the CSS spec suggests that this does not work, but this
       * may break in the future in case a new CSS feature is added that
       * reuses the double-dash prefix in a new way.
       * @param node - The root of the AST to walk through
       */
      function walk(node: valueParser.Node): void {
        if ('nodes' in node) {
          for (const child of node.nodes) {
            walk(child);
          }
        }

        node.value = renameVariable(node.value);
      }

      function renameValue(value: string): string {
        const parsed = valueParser(value);
        for (const node of parsed.nodes) {
          walk(node);
        }

        return parsed.toString();
      }

      const alreadyProcessedNodes = new Set<Declaration>();
      function renameDeclaration(declarationNode: Declaration): void {
        if (alreadyProcessedNodes.has(declarationNode)) {
          return;
        }

        alreadyProcessedNodes.add(declarationNode);

        declarationNode.prop = renameVariable(declarationNode.prop);
        declarationNode.value = renameValue(declarationNode.value);
      }

      return {
        Declaration: renameDeclaration,
        OnceExit() {
          if (outputMapCallback) {
            outputMapCallback(outputMap ?? {});
          }
        },
      };
    },
  };
}

plugin.postcss = true;

export = plugin;
