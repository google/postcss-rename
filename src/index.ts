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

import {MinimalRenamer} from './minimal-renamer';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace plugin {
  export interface Options {
    strategy?: 'none' | 'debug' | 'minimal' | ((string) => string);
    by?: 'whole' | 'part';
    prefix?: string;
    except?: Iterable<string | RegExp>;
    ids?: boolean;
    outputMapCallback?(map: {[key: string]: string}): void;
  }
}

// eslint-disable-next-line no-redeclare
const plugin = ({
  strategy = 'none',
  by = 'whole',
  prefix = '',
  except = [],
  ids = false,
  outputMapCallback,
}: plugin.Options = {}) => {
  const exceptSet = new Set(except);
  return {
    postcssPlugin: 'postcss-rename',
    prepare() {
      if (strategy === 'none' && !outputMapCallback && !prefix) return {};

      const outputMap: {[key: string]: string} | null = outputMapCallback
        ? {}
        : null;

      let rename: (string) => string;
      if (strategy === 'none') {
        rename = name => name;
      } else if (strategy === 'debug') {
        rename = name => name + '_';
      } else if (strategy === 'minimal') {
        const renamer = new MinimalRenamer(skip);
        rename = name => renamer.rename(name);
      } else if (typeof strategy === 'string') {
        throw new Error(`Unknown strategy "${strategy}".`);
      } else {
        rename = strategy;
      }

      if (by !== 'whole' && by !== 'part') {
        throw new Error(`Unknown mode "${by}".`);
      }

      function renameNode(
        node: selectorParser.ClassName | selectorParser.Identifier
      ) {
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

      function skip(nodeValue: string): boolean {
        if (exceptSet.has(nodeValue)) return true;
        for (var val of exceptSet) 
          if (val instanceof RegExp && val.test(nodeValue)) return true;
        return false;
      }

      const selectorProcessor = selectorParser(selectors => {
        selectors.walkClasses(renameNode);
        if (ids) selectors.walkIds(renameNode);
      });

      return {
        Rule(ruleNode) {
          selectorProcessor.process(ruleNode);
        },
        OnceExit() {
          if (outputMapCallback) outputMapCallback(outputMap);
        },
      };
    },
  };
};

export = plugin;
