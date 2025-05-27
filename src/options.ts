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

import {type RenamingStrategy} from './strategy';

/**
 * Maps un-renamed names to their renamings
 */
export type RenamingMap = {[key: string]: string};

interface RenamingOptions {
  /**
   * The strategy to use when renaming.
   * @see strategy.ts
   */
  strategy?: RenamingStrategy;

  /**
   * A prefix to prepend onto the renamed variables.
   */
  prefix?: string;

  /**
   * Called with the final renaming map after the entire AST is processed.
   */
  outputMapCallback?(map: RenamingMap): void;

  /**
   * A list of objects to skip renaming and disallowed renamings.
   */
  except?: Iterable<string | RegExp>;
}

/**
 * Options for renaming variables.
 */
export type VariableRenamingOptions = RenamingOptions;

/**
 * Options for renaming classes.
 */
export interface ClassRenamingOptions extends RenamingOptions {
  /**
   * Controls how class names are split when renaming.
   * 'whole' takes the entire name as input into the renaming strategy
   * 'part' splits the class name by '-' and renames each part individually
   */
  by?: 'whole' | 'part';

  /**
   * Whether to also rename ids.
   */
  ids?: boolean;
}
