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

import postcss from 'postcss';
import {type VariableRenamingOptions} from './options';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace plugin {
  export type Options = VariableRenamingOptions;
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
      return {};
    },
  };
};

plugin.postcss = true;

export = plugin;
