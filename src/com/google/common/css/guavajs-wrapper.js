let fs = require('fs');

// https://stackoverflow.com/a/5809968
eval(fs.readFileSync(require.resolve('guava-js/src/main/javascript/GuavaJS.js'))+'');
eval(fs.readFileSync(require.resolve('guava-js/src/main/javascript/GuavaJS.strings.js'))+'');
eval(fs.readFileSync(require.resolve('guava-js/src/main/javascript/GuavaJS.strings.charmatcher.js'))+'');
eval(fs.readFileSync(require.resolve('guava-js/src/main/javascript/GuavaJS.strings.splitter.js'))+'');

module.exports = GuavaJS;
