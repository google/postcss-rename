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

import {promises as fs} from 'fs';
import * as mockFs from 'mock-fs';
import * as path from 'path';
import * as postcss from 'postcss';

const plugin = require('../');

async function run(input: string, opts?: Object) {
  return await postcss([plugin(opts)]).process(input, { from: undefined });
}

function assertPostcss(result: postcss.Result, output: string) {
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

async function read(filename: string) {
  const file = path.join(__dirname, '/cases/', filename);
  return (await fs.readFile(file)).toString();
}

it('does nothing with no options', async () => {
  const input = await read('default.css');
  const expectedOutput = input;
  
  assertPostcss(await run(input), expectedOutput);
});

it('does nothing with none renaming type', async () => {
  const input = await read('default.css');
  const expectedOutput = input;

  assertPostcss(await run(input, { renamingType: 'none' }), expectedOutput);
});

it('renames with debug renaming type', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.debug.css');

  assertPostcss(await run(input, { renamingType: 'debug' }), expectedOutput);
});

it('renames with closure renaming type', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.closure.css');

  assertPostcss(await run(input, { renamingType: 'closure' }), expectedOutput);
});

it('renames with prefix', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.prefix.css');

  assertPostcss(await run(input, { cssRenamingPrefix: 'x-' }), expectedOutput);
});

it('outputs renaming map as expected', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('renaming_map.js');

  mockFs({ 'temp/': {} });
  await run(input, { renamingType: 'closure', outputRenamingMap: 'temp/renaming_map.js' });
  const output = (await fs.readFile('temp/renaming_map.js')).toString();
  mockFs.restore();

  expect(output).toEqual(expectedOutput);
});
