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
 * Maps original names to their new names.
 */
export type RenamingMap = {[originalName: string]: string};

/**
 * Options for renaming CSS names.
 */
interface RenamingOptions {
  /**
   * The strategy to use when renaming CSS names.
   * @see strategy.ts
   */
  strategy?: RenamingStrategy;

  /**
   * A prefix to prepend onto the renamed CSS names.
   */
  prefix?: string;

  /**
   * Called with the final renaming map after the entire AST is processed.
   */
  outputMapCallback?(map: RenamingMap): void;

  /**
   * A list of CSS names or patterns to exclude from renaming.
   */
  except?: Iterable<string | RegExp>;
}

/**
 * Options for renaming CSS variables.
 */
export type VariableRenamingOptions = RenamingOptions;

/**
 * Options for renaming CSS class selectors.
 */
export interface ClassRenamingOptions extends RenamingOptions {
  /**
   * Controls how class names are split when renaming.
   * - 'whole' takes the entire name as input into the renaming strategy.
   * - 'part' splits the class name by '-' and renames each part individually.
   */
  by?: 'whole' | 'part';

  /**
   * Whether to also rename id selectors.
   */
  ids?: boolean;
}
