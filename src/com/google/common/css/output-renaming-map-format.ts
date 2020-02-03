/*
 * Copyright 2011 Google Inc.
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

import * as Preconditions from 'conditional';
import {Map as ImmutableMap} from 'immutable';
import * as readline from 'readline';
import * as stream from 'stream';
import * as util from 'util';
import * as GuavaJS from './guavajs-wrapper';
import Splitter = GuavaJS.Strings.Splitter;
import { AssertionError } from 'assert';

const streamToString = async (stream: stream.Readable) => {
  return new Promise<string>((resolve, reject) => {
    let chunks = [];
    const onData = chunk => chunks.push(chunk);
    stream.on('data', onData);
    stream.once('error', reject);
    stream.once('end', () => {
      stream.removeListener('data', onData);
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
};

/**
 * Defines the values for the --output-renaming-map-format flag in Closure
 * Stylesheets.
 *
 * @author bolinfest@google.com (Michael Bolin)
 */
interface OutputRenamingMapFormat {
  writeRenamingMap(renamingMap: Map<string, string>, renamingMapWriter: stream.Writable): void;
  readRenamingMap(inReadable: stream.Readable): Promise<ImmutableMap<string, string>>;
  readMapInto(inReadable: stream.Readable, builder: Map<string, string>): Promise<void>;
}

class OutputRenamingMapFormatImpl implements OutputRenamingMapFormat {
  private readonly formatString: string;

  constructor(formatString?: string) {
    Preconditions.checkNotNull(formatString);
    this.formatString = formatString ?? '%s';
  }

  /**
   * Writes the renaming map.
   *
   * @see com.google.common.css.compiler.commandline.DefaultCommandLineCompiler
   *     #writeRenamingMap(Map, PrintWriter)
   */
  writeRenamingMap(renamingMap: Map<string, string>, renamingMapWriter: stream.Writable) {
    renamingMapWriter.write(util.format(this.formatString,
        JSON.stringify([...renamingMap], null, 2)));
  }

  /**
   * Reads the output of {@link #writeRenamingMap} so a renaming map can be reused from one compile
   * to another.
   */
  async readRenamingMap(inReadable: stream.Readable): Promise<ImmutableMap<string, string>> {
    const subsitutionMarker = "%s";
    const formatStringSubstitutionIndex = this.formatString.indexOf(subsitutionMarker);
    Preconditions.checkState(formatStringSubstitutionIndex >= 0, this.formatString);

    let formatPrefix = this.formatString.substring(0, formatStringSubstitutionIndex);
    let formatSuffix =
        this.formatString.substring(formatStringSubstitutionIndex + subsitutionMarker.length);

    // We read the whole input in, then strip prefixes and suffixes and then parse
    // the rest.
    let content = await streamToString(inReadable);

    content = content.trim();
    formatPrefix = formatPrefix.trim();
    formatSuffix = formatSuffix.trim();

    if (!content.startsWith(formatPrefix)
        || !content.endsWith(formatSuffix)
        || content.length < formatPrefix.length + formatSuffix.length) {
      throw new Error("Input does not match format " + this.formatString + " : " + content);
    }

    content = content.substring(formatPrefix.length, content.length - formatSuffix.length);

    const b = new Map<string, string>();
    const json = JSON.parse(content);
    await this.readMapInto(json, b);

    return ImmutableMap.of(b);
  }

  /**
   * Reads the mapping portion of the formatted output.
   *
   * <p>This default implementation works for formats that substitute a JSON mapping from rewritten
   * names to originals into their format string, and may be overridden by formats that do something
   * different.
   */
  async readMapInto(inReadable: stream.Readable, builder: Map<string, string>) {
    const json = JSON.parse(await streamToString(inReadable));
    for (const [key, value] of Object.entries(json)) {
      builder.set(key, value.toString());
    }
  }

  /** Splitter used for CLOSURE_COMPILED_SPLIT_HYPHENS format. */
  private static readonly HYPHEN_SPLITTER = Splitter.on("-");

  /**
   * <code>{ "foo-bar": "f-b" }</code> => <code>{ "foo": "f", "bar": "b" }</code>.
   *
   * @see SplittingSubstitutionMap
   */
  static splitEntriesOnHyphens(renamingMap: Map<string, string>): Map<string, string> {
    const newSplitRenamingMap: Map<string, string> = new Map();
    for (const [key, value] of renamingMap.entries()) {
      const keyParts = OutputRenamingMapFormatImpl.HYPHEN_SPLITTER.split(key).values();
      const valueParts = OutputRenamingMapFormatImpl.HYPHEN_SPLITTER.split(value).values();
      
      let keyPart = keyParts.next();
      let valuePart = valueParts.next();
      while (!keyPart.done && !valuePart.done) {
        const oldValuePart = newSplitRenamingMap.get(keyPart.value);
        newSplitRenamingMap.set(keyPart.value, valuePart.value);
        // Splitting by part to make a simple map shouldn't involve mapping two old names
        // to the same new name.  It's ok the other way around, but the part relation should
        // be a partial function.
        Preconditions.checkState(oldValuePart == null || oldValuePart === valuePart.value);

        keyPart = keyParts.next();
        valuePart = valueParts.next();
      }
      if (!keyPart.done) {
        throw new AssertionError({ message:
            "Not all parts of the original class "
                + "name were output. Class: "
                + key
                + " Next Part:"
                + keyParts.next().value });
      }
      if (!valuePart.done) {
        throw new AssertionError({ message:
            "Not all parts of the renamed class were "
                + "output. Class: "
                + key
                + " Renamed Class: "
                + value
                + " Next Part:"
                + valueParts.next().value });
      }
    }
    return newSplitRenamingMap;
  }

  static writeOnePerLine(
      separator: string, renamingMap: Map<string, string>, renamingMapWriter: stream.Writable) {
    for (const [key, value] of renamingMap.entries()) {
      Preconditions.checkState(key.indexOf(separator) < 0);
      Preconditions.checkState(key.indexOf('\n') < 0);
      Preconditions.checkState(value.indexOf('\n') < 0);

      renamingMapWriter.write(key);
      renamingMapWriter.write(separator);
      renamingMapWriter.write(value);
      renamingMapWriter.write('\n');
    }
  }

  static async readOnePerLine(
      separator: string, inReadable: stream.Readable, builder: Map<string, string>) {
    for await (const line of readline.createInterface({input: inReadable})) {
      const eq = line.indexOf(separator);
      if (eq < 0 && !line.length) {
        throw new Error("Line is missing a '" + separator + "': " + line);
      }
      builder.set(line.substring(0, eq), line.substring(eq + 1));
    }
  }
}

/* tslint:disable:no-namespace */
namespace OutputRenamingMapFormat {
  const NULL_FORMAT = new OutputRenamingMapFormatImpl('');

  /**
   * Reads/Writes the mapping as JSON, passed as an argument to
   * {@code goog.setCssNameMapping()}. Designed for use with the Closure
   * Library in compiled mode.
   */
  export const CLOSURE_COMPILED = NULL_FORMAT;
  Object.defineProperty(OutputRenamingMapFormat, 'CLOSURE_COMPILED', {
    enumerable: true,
    get: () => new OutputRenamingMapFormatImpl("goog.setCssNameMapping(%s);\n")
  });

  /**
   * Reads/Writes the mapping as JSON, passed as an argument to
   * {@code goog.setCssNameMapping()} using the 'BY_WHOLE' mapping style.
   * Designed for use with the Closure Library in compiled mode where the CSS
   * name substitutions are taken as-is, which allows, e.g., using
   * {@code SimpleSubstitutionMap} with class names containing hyphens.
   */
  export const CLOSURE_COMPILED_BY_WHOLE = NULL_FORMAT;
  Object.defineProperty(OutputRenamingMapFormat, 'CLOSURE_COMPILED_BY_WHOLE', {
    enumerable: true,
    get: () => new OutputRenamingMapFormatImpl("goog.setCssNameMapping(%s, 'BY_WHOLE');\n")
  });

  /**
   * Before writing the mapping as CLOSURE_COMPILED, split the css name maps by hyphens and write
   * out each piece individually. see {@code CLOSURE_COMPILED}
   */
  export const CLOSURE_COMPILED_SPLIT_HYPHENS = NULL_FORMAT;
  class ClosureCompiledSplitHyphensImpl extends OutputRenamingMapFormatImpl {
    constructor() { super("goog.setCssNameMapping(%s);\n"); }
    writeRenamingMap(renamingMap: Map<string, string>, renamingMapWriter: stream.Writable) {
      super.writeRenamingMap(OutputRenamingMapFormatImpl.splitEntriesOnHyphens(renamingMap), renamingMapWriter);
    }
  };
  Object.defineProperty(OutputRenamingMapFormat, 'CLOSURE_COMPILED_SPLIT_HYPHENS', {
    enumerable: true,
    get: () => new ClosureCompiledSplitHyphensImpl()
  });

  /**
   * Reads/Writes the mapping as JSON, assigned to the global JavaScript variable
   * {@code CLOSURE_CSS_NAME_MAPPING}. Designed for use with the Closure
   * Library in uncompiled mode.
   */
  export const CLOSURE_UNCOMPILED = NULL_FORMAT;
  Object.defineProperty(OutputRenamingMapFormat, 'CLOSURE_UNCOMPILED', {
    enumerable: true,
    get: () => new OutputRenamingMapFormatImpl("CLOSURE_CSS_NAME_MAPPING = %s;\n")
  });

  /**
   * Reads/Writes the mapping as JSON.
   */
  export const JSON = NULL_FORMAT;
  Object.defineProperty(OutputRenamingMapFormat, 'JSON', {
    enumerable: true,
    get: () => new OutputRenamingMapFormatImpl()
  });

  /**
   * Reads/Writes the mapping from/in a .properties file format, such that it can be read
   * by {@link Properties}.
   */
  export const PROPERTIES = NULL_FORMAT;
  class PropertiesImpl extends OutputRenamingMapFormatImpl {
    writeRenamingMap(renamingMap: Map<string, string>, renamingMapWriter: stream.Writable) {
      OutputRenamingMapFormatImpl.writeOnePerLine('=', renamingMap, renamingMapWriter);
      // We write the properties directly rather than using
      // Properties#store() because it is impossible to suppress the timestamp
      // comment: http://goo.gl/6hsrN. As noted on the Stack Overflow thread,
      // the timestamp results in unnecessary diffs between runs. Further, those
      // who are using a language other than Java to parse this file should not
      // have to worry about adding support for comments.
    }

    async readMapInto(inReadable: stream.Readable, builder: Map<string, string>) {
      await OutputRenamingMapFormatImpl.readOnePerLine('=', inReadable, builder);
    }
  };
  Object.defineProperty(OutputRenamingMapFormat, 'PROPERTIES', {
    enumerable: true,
    get: () => new PropertiesImpl()
  });

  /**
   * This is the current default behavior for output maps. Still used for
   * legacy reasons.
   */
  export const JSCOMP_VARIABLE_MAP = NULL_FORMAT;
  class JscompVariableMapImpl extends OutputRenamingMapFormatImpl {
    writeRenamingMap(renamingMap: Map<string, string>, renamingMapWriter: stream.Writable) {
      OutputRenamingMapFormatImpl.writeOnePerLine(':', renamingMap, renamingMapWriter);
    }

    async readMapInto(inReadable: stream.Readable, builder: Map<string, string>) {
      await OutputRenamingMapFormatImpl.readOnePerLine(':', inReadable, builder);
    }
  };
  Object.defineProperty(OutputRenamingMapFormat, 'JSCOMP_VARIABLE_MAP', {
    enumerable: true,
    get: () => new JscompVariableMapImpl()
  });
}

export { OutputRenamingMapFormat };
