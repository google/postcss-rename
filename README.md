[![Build status](https://travis-ci.org/google/postcss-rename.svg?branch=master)](https://travis-ci.org/google/postcss-rename)

A [PostCSS](https://github.com/postcss/postcss) plugin to replace class names
based on a customizable renaming scheme.

Disclaimer: This is not an officially supported Google product.

## Usage

postcss-rename makes it possible to rename CSS class names in the generated
stylesheet, which helps reduce the size of the CSS that is sent down to your
users. Of course, this is not particularly useful unless the class names are
renamed consistently in the HTML and JavaScript files that use the
CSS. Fortunately, you can use the
[Closure Compiler](https://developers.google.com/closure/compiler/) to update the class
names in your JavaScript and
[Closure Templates](https://developers.google.com/closure/templates/) to update the
class names in your HTML.

To get the benefits of CSS renaming in Closure, instead of referencing a CSS
class name as a string literal, you must use that string literal as an argument
to `goog.getCssName()`:

```javascript
// Do the following instead of goog.dom.getElementByClass('dialog-content'):
var element = goog.dom.getElementByClass(goog.getCssName('dialog-content'));
```

Similarly, in a Closure Template, you must wrap references to CSS classes with
the
[css command](https://developers.google.com/closure/templates/docs/commands#css):

```html
{namespace example}

/**
 * @param title
 */
{template .dialog}
<div class=\"{css('dialog-content')}\">
  <div class=\"{css('dialog-title')}\">{$title}</title>
  {call .content data=\"all\" /}
</div>
{/template}
```

When you generate the JavaScript for the template, be sure to use the
`--cssHandlingScheme GOOG` option with `SoyToJsSrcCompiler`. This ensures that
the generated JavaScript code will also use `goog.getCssName()`. For example, if
the above were named **`dialog.soy`**, then the following command would be used
to create **`dialog.soy.js`**:

```
java -jar SoyToJsSrcCompiler.jar \\
    --shouldProvideRequireSoyNamespaces \\
    --codeStyle concat \\
    --cssHandlingScheme GOOG \\
    --outputPathFormat '{INPUT_FILE_NAME_NO_EXT}.soy.js' \\
    dialog.soy
```

The contents of the generated **`dialog.soy.js`** file are:

```javascript
// This file was automatically generated from dialog.soy.
// Please don't edit this file by hand.

goog.provide('example');

goog.require('soy');
goog.require('example');


example.dialog = function(opt_data) {
  return '<div class=\"' + goog.getCssName('dialog-content') + '\"><div class=\"' +
      goog.getCssName('dialog-title') + '\">' + soy.$$escapeHtml(opt_data.title) +
      '</title>' + example.content(opt_data) + '</div>';
};
```

Note the uses of `goog.getCssName()` in the generated JavaScript file.

Now that all references to CSS class names are wrapped in `goog.getCssName()`,
it is possible to leverage renaming. By default, `goog.getCssName()` simply
returns the argument that was passed to it, so no renaming is done unless a
_renaming map_ has been set.

When running Closure Library code without processing it with the Closure
Compiler, it is possible to set a renaming map by defining a global variable
named `CLOSURE_CSS_NAME_MAPPING` in JavaScript code that is loaded before the
Closure Library's `base.js` file. For example, if you defined your CSS in a file
named **`dialog.raw.css`**:

```css
.dialog-content {
  padding: 10px;
}

.dialog-title {
  font-weight: bold;
}
```

Then you could run PostCSS with the following `postcss.config.js` to generate
(**`dialog.css`**) with renamed classes, as well as the mapping data as a
JavaScript file (**`renaming_map.js`**):

```javascript
module.exports = {
  plugins: [
    require('postcss-rename')({
      outputRenamingMapFormat: 'CLOSURE_UNCOMPILED',
      renamingType: 'CLOSURE',
      outputRenamingMap: 'renaming_map.js',
    }),
  ],
};
```

The generated **`dialog.css`** would be as follows:

```css
.a-b {
  padding: 10px;
}
.a-c {
  font-weight: bold;
}
```

while the generated **`renaming_map.js`** would be:

```javascript
CLOSURE_CSS_NAME_MAPPING = {
  \"dialog\": \"a\",
  \"content\": \"b\",
  \"title\": \"c\"
};
```

An HTML file that uses the renaming map must be sure to include both the
generated stylesheet with renamed class names as well as the renaming map:

```html
<!doctype html>
<html>
<head>
  <link rel=\"stylesheet\" href=\"dialog.css\" type=\"text/css\">
</head>
<body>

  <script src=\"renaming_map.js\"></script>
  <script src=\"path/to/base.js\"></script>
  <script>
    goog.require('example');
  </script>
  <script>
    // Your application logic that uses example.dialog() and other code.
  </script>

</body>
</html>
```

This ensures that when **`goog.getCssName('dialog-content')`** is called, it
returns **`'a-b'`**. In this way, the abbreviated name is used in place of the
original name throughout the code.

An astute reader will note that so far, we have reduced only the size of the
stylesheet, but not the JavaScript. To reduce the size of the JavaScript code,
we must use the [Closure Compiler](https://developers.google.com/closure/compiler/) in
either
[SIMPLE or ADVANCED](https://developers.google.com/closure/compiler/docs/compilation_levels)
mode with the **`--process_closure_primitives`** flag enabled (it is enabled by
default). When enabled, if it finds a call to **`goog.setCssNameMapping()`** in
any of its inputs, it will use the argument to `goog.setCssNameMapping()` as the
basis of a renaming map that is applied at compile time. To create the
appropriate renaming map with postcss-rename, use **`CLOSURE_COMPILED`** as
the argument to **`outputRenamingMapFormat`**:

```javascript
module.exports = {
  plugins: [
    require('postcss-rename')({
      outputRenamingMapFormat: 'CLOSURE_COMPILED',
      renamingType: 'CLOSURE',
      outputRenamingMap: 'renaming_map.js',
    }),
  ],
};
```

This yields the following content for **`renaming_map.js`**:

```javascript
goog.setCssNameMapping({
  \"dialog\": \"a\",
  \"content\": \"b\",
  \"title\": \"c\"
});
```

Now **`renaming_map.js`** is a suitable input for the Closure Compiler. Recall
our original snippet of JavaScript code:

```javascript
var element = goog.dom.getElementByClass(goog.getCssName('dialog-content'));
```

If passed to the Closure Compiler in SIMPLE mode along with
**`renaming_map.js`**, it will be transformed to the following after
compilation:

```javascript
var element = goog.dom.getElementByClass(\"a-b\");
```

This achieves the goal of reducing both CSS and JS file sizes without changing
the behavior of the application.

Admittedly, using CSS renaming is a fairly advanced option that requires a
well-organized build system to ensure that the appropriate CSS and JS assets are
produced for both development and production. See
[MoreOnCssRenaming](https://github.com/google/closure-stylesheets/wiki/More-on-CSS-Renaming)
for more details on this topic.

**Note:** it is also possible to exclude certain class names from being renamed
by using the **`excludedClassesFromRenaming`** option. This may be necessary
if some of your HTML is generated by a process that does not take CSS renaming
into account. For example, if you are using a Python Django server and are using
its template system, then any CSS classes used in those templates will not be
renamed (unless you introduce a process to do so). In order to ensure that the
JS and CSS that use the HTML reference CSS classes consistently, each CSS class
in the Django template should be passed as an argument to postcss-rename
with the **`excludedClassesFromRenaming`** option when generating the CSS.

References to CSS class names that are excluded from renaming should _never_ be
wrapped in `goog.getCssName()`, or else they run the risk of being partially
renamed.
