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
import valueParser from 'postcss-value-parser';

import {MinimalRenamer} from './minimal-renamer';

type RenamingStrategy = 'none' | 'debug' | 'minimal' | ((string) => string);
type RenamingMap = {[key: string]: string};

interface SharedOptions {
  strategy?: RenamingStrategy;
  prefix?: string;
  outputMapCallback?(map: RenamingMap): void; // { 'var': 'renamed-var' }
  except?: Iterable<string | RegExp>; // ['--var', 'var']
}

interface VariableRenamingOptions extends SharedOptions {}
interface ClassRenamingOptions extends SharedOptions {
  by?: 'whole' | 'part';
  ids?: boolean;
}

/**
 * Default renaming options. Works for both classes and variables.
 */
const DEFAULT_RENAMING_OPTIONS: VariableRenamingOptions | ClassRenamingOptions =
  {
    strategy: 'none',
    prefix: '',
    except: [],
    by: 'whole',
    ids: false,
  };

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace plugin {
  export interface Options {
    classRenamingOptions?: ClassRenamingOptions;
    variableRenamingOptions?: VariableRenamingOptions;
  }
}

/**
 * Creates a predicate that filters against an except set
 * @param except - A list of strings or regexes that should be skipped
 * @returns skip predicate
 */
function createSkip(except?: Iterable<string | RegExp>): (string) => boolean {
  const exceptSet: Set<string> = new Set();
  const exceptRegexes: RegExp[] = [];

  for (const val of except) {
    if (val instanceof RegExp) {
      exceptRegexes.push(val);
    } else {
      exceptSet.add(val);
    }
  }

  return (nodeValue: string): boolean => {
    return (
      exceptSet.has(nodeValue) ||
      exceptRegexes.some((regex) => regex.test(nodeValue))
    );
  };
}

/**
 * Produces a renaming function from the given strategy
 * @param strategy
 * @param skip
 * @returns renaming function
 * @throws if strategy isn't a function or one of 'none', 'debug', 'minimal'
 */
function createStrategy(
  strategy: RenamingStrategy,
  skip: (string) => boolean,
): (string) => string {
  if (typeof strategy === 'function') {
    return strategy;
  }

  switch (strategy) {
    case 'none':
      return (name) => name;
    case 'debug':
      return (name) => name + '_';
    case 'minimal':
      const renamer = new MinimalRenamer(skip);
      return (name) => renamer.rename(name);
    default:
      throw new Error(`Unknown strategy "${strategy}".`);
  }
}

// eslint-disable-next-line no-redeclare
const plugin = ({
  classRenamingOptions,
  variableRenamingOptions,
}: plugin.Options = {}) => {
  const {
    strategy: classStrategy = 'none',
    prefix: classPrefix = '',
    outputMapCallback: classOutputMapCallback,
    except: classExcept = [],
    by: classBy = 'whole',
    ids: classIds = false,
  } = classRenamingOptions || DEFAULT_RENAMING_OPTIONS;

  const {
    strategy: variableStrategy = 'none',
    prefix: variablePrefix = '',
    outputMapCallback: variableOutputMapCallback,
    except: variableExcept = [],
  } = variableRenamingOptions || DEFAULT_RENAMING_OPTIONS;

  const skipClass = createSkip(classExcept);
  const skipVariable = createSkip(variableExcept);

  const renameClass = createStrategy(classStrategy, skipClass);
  const renameVariable = createStrategy(variableStrategy, skipVariable);

  const classOutputMap: RenamingMap | null = classOutputMapCallback ? {} : null;
  const variableOutputMap: RenamingMap | null = variableOutputMapCallback
    ? {}
    : null;

  return {
    postcssPlugin: 'postcss-rename',
    prepare() {
      // TODO(jiramide): figure out how to type this w/o making a dependency on postcss
      // (how do I get the Plugin type? preferably without writing it myself)
      let nodeVisitors: any = {};

      if (classStrategy !== 'none' || classOutputMapCallback || classPrefix) {
        if (classBy !== 'whole' && classBy !== 'part') {
          throw new Error(`Unknown mode "${classBy}".`);
        }

        function renameClassNode(
          node: selectorParser.ClassName | selectorParser.Identifier,
        ) {
          if (skipClass(node.value)) return;

          if (classBy === 'part') {
            node.value =
              classPrefix +
              node.value
                .split('-')
                .map((part) => {
                  const newPart = skipClass(part) ? part : renameClass(part);
                  if (classOutputMap) classOutputMap[part] = newPart;
                  return newPart;
                })
                .join('-');
          } else {
            const newName = classPrefix + renameClass(node.value);
            if (classOutputMap) classOutputMap[node.value] = newName;
            node.value = newName;
          }
        }

        const selectorProcessor = selectorParser((selectors) => {
          selectors.walkClasses(renameClassNode);
          if (classIds) selectors.walkIds(renameClassNode);
        });

        nodeVisitors.Rule = function (ruleNode) {
          if (
            ruleNode.parent.type !== 'atrule' ||
            !ruleNode.parent.name.endsWith('keyframes')
          ) {
            selectorProcessor.process(ruleNode);
          }
        };
      }

      if (
        variableStrategy !== 'none' ||
        variableOutputMapCallback ||
        variablePrefix
      ) {
        function renameVariableNode(variable: string): string {
          if (!variable) {
            throw new Error("this shouldn't happen");
          }

          const newVariable = variablePrefix
            ? variablePrefix + '-' + renameVariable(variable)
            : renameVariable(variable);

          if (variableOutputMap) {
            variableOutputMap[variable] = newVariable;
          }

          return newVariable;
        }

        nodeVisitors.Declaration = function (declarationNode) {
          const prop = declarationNode.prop;

          if (prop.startsWith('--')) {
            // CSS variable; rename and put into outputMap
            const variable = prop.match(/^\-\-(.+)$/)[1];

            if (!variable) {
              throw new Error("this shouldn't happen");
            }

            const newVariable = renameVariableNode(variable);
            declarationNode.prop = newVariable;
          }
        };

        function renameVariableUse(node) {
          if (node.type !== 'function' || node.value !== 'var') return;

          const renamedChildren = node.nodes.map((child) => {
            if (child.type !== 'word') {
              return child;
            }

            const value = child.value;
            if (value.startsWith('--')) {
              // CSS variable; rename and put into outputMap
              const variable = value.match(/^\-\-(.+)$/)[1];

              if (!variable) {
                throw new Error("this shouldn't happen");
              }

              return renameVariableNode(variable);
            }
          });

          node.nodes = renamedChildren;
        }

        nodeVisitors.Root = function (rootNode) {
          const parsed = valueParser.walk(rootNode, renameVariableUse);
        };
      }

      return {
        ...nodeVisitors,
        OnceExit() {
          if (classOutputMapCallback) {
            classOutputMapCallback(classOutputMap);
          }

          if (variableOutputMapCallback) {
            variableOutputMapCallback(variableOutputMap);
          }
        },
        AtRule(atRule) {
          if (atRule.name == 'property') {
            // ...
          }
        },
      };
    },
  };
};

export = plugin;
