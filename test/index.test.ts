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
import mockFs from 'mock-fs';
import path from 'path';
import postcss from 'postcss';
import plugin from 'com_google_closure_stylesheets/src';
import { Options } from 'com_google_closure_stylesheets/src/options';
import { OutputRenamingMapFormat } from 'com_google_closure_stylesheets/src/com/google/common/css/output-renaming-map-format';

async function run(input: string, opts?: Options) {
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

  assertPostcss(await run(input, { renamingType: 'NONE' }), expectedOutput);
});

it('renames with debug renaming type', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.debug.css');

  assertPostcss(await run(input, { renamingType: 'DEBUG' }), expectedOutput);
});

it('renames with closure renaming type', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.closure.css');

  assertPostcss(await run(input, { renamingType: 'CLOSURE' }), expectedOutput);
});

it('renames with prefix', async () => {
  const input = await read('default.css');
  const expectedOutput = await read('default.prefix.css');

  assertPostcss(await run(input, { cssRenamingPrefix: 'x-' }), expectedOutput);
});

it.each([
  ['CLOSURE_COMPILED_BY_WHOLE', 'js'],
  ['CLOSURE_COMPILED_SPLIT_HYPHENS', 'js'],
  ['CLOSURE_COMPILED', 'js'],
  ['CLOSURE_UNCOMPILED', 'js'],
  ['JSCOMP_VARIABLE_MAP', 'map'],
  ['JSON', 'json'],
  ['PROPERTIES', 'properties'],
])('outputs %s renaming map', async (format, extension) => {
  const outputName = `renaming_map.${format}.${extension}`;
  const input = await read('default.css');
  const expectedOutput = await read(outputName);

  mockFs({ 'temp/': {} });
  await run(input, {
    renamingType: 'CLOSURE',
    outputRenamingMap: `temp/${outputName}`,
    outputRenamingMapFormat: format as keyof typeof OutputRenamingMapFormat,
  });
  const output = (await fs.readFile(`temp/${outputName}`)).toString();
  mockFs.restore();

  expect(output).toEqual(expectedOutput);
});
