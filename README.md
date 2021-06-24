[![Build status](https://github.com/google/postcss-rename/actions/workflows/ci.yml/badge.svg)](https://github.com/google/postcss-rename/actions)

A [PostCSS](https://github.com/postcss/postcss) plugin to replace class names
based on a customizable renaming scheme.

* [Usage](#usage)
* [Options](#options)
  * [`strategy`](#strategy)
  * [`by`](#by)
  * [`prefix`](#prefix)
  * [`except`](#except)
  * [`ids`](#ids)
  * [`outputMapCallback`](#outputMapCallback)

## Usage

`postcss-rename` makes it possible to rename CSS class names in the generated
stylesheet, which helps reduce the size of the CSS that is sent down to your
users. It's designed to be used along with a plugin for a build system like
Webpack that can rewrite HTML templates and/or references in JS. If you write
such a plugin, let us know and we'll link it here!

## Options

### `strategy`

The renaming strategy to use:

* `"none"`: Don't change names at all. This is the default strategy.

* `"debug"`: Add an underscore at the end of each name. This is useful for
  keeping classes readable during debugging while still verifying that your
  templates and JavaScript aren't accidentally using non-renamed classes.

* `"minimal"`: Use the shortest possible names, in order of appearance: the
  first class is renamed to `.a`, the second to `.b`, and so on.

This can also be a function that takes a CSS name (the full name in by-whole
mode and the part in by-part mode) and returns its renamed value.

### `by`

Whether to rename in "by-whole mode" or "by-part mode".

* `"whole"`: Rename the entire name at once, so for example `.tall-image` might
  become `.a`. This is the default mode.

* `"part"`: Rename each hyphenated section of a name separately, so for example
  `.tall-image` might become `.a-b`.

### `prefix`

A string prefix to add before every renamed class. This applies even if
[`strategy`](#strategy) is set to `none`.

In by-part mode, the prefix is applied to the entire class, but it isn't
included in the [output map](#outputMapCallback).

### `except`

An array (or other `Iterable`) of names that shouldn't be renamed.

### `ids`

Whether to rename ID selectors as well as class selectors. Defaults to `false`.

### `outputMapCallback`

A callback that's passed a map from original class names to their renamed
equivalents, so that an HTML template or JS class references can also be
renamed.

In by-part mode, this contains separate entries for each part of a class name.
It doesn't contain any names that weren't renamed because of
[`except`](#except).

Disclaimer: This is not an officially supported Google product.
