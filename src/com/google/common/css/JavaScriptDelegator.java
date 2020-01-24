package com.google.common.css;

import com.coveo.nashorn_modules.AbstractFolder;
import com.coveo.nashorn_modules.Folder;
import com.coveo.nashorn_modules.Require;
import com.google.common.base.Predicate;
import com.google.common.css.MultipleMappingSubstitutionMap.ValueWithMappings;
import jdk.nashorn.api.scripting.NashornScriptEngine;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public class JavaScriptDelegator {

  public interface Delegating extends SubstitutionMap {
    public Object getDelegatedJSObject();
  }

  private Map<String, String> localModules = new HashMap<String, String>() {{
    put("identity-substitution-map.js", "IdentitySubstitutionMap");
    put("minimal-substitution-map.js", "MinimalSubstitutionMap");
    put("prefixing-substitution-map.js", "PrefixingSubstitutionMap");
    put("recording-substitution-map.js", "RecordingSubstitutionMap");
    put("simple-substitution-map.js", "SimpleSubstitutionMap");
    put("splitting-substitution-map.js", "SplittingSubstitutionMap");
  }};

  private static NashornScriptEngine engine;
  private String mainModule;
  private String mainImportName;
  public Object delegatedMap;

  public JavaScriptDelegator(String mainModule, String mainImportName) {
    this.mainModule = mainModule;
    this.mainImportName = mainImportName;

    if (engine == null) {
      System.setProperty("nashorn.args", "--language=es6");
      engine = (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");

      // console doesn't exist.
      exec("console = { log: print, warn: print, error: print }", "Couldn't polyfill console");

      // Number.isInteger doesn't exist.
      exec("" +
                "Number.isInteger = Number.isInteger || function(value) {\n" +
                "  return typeof value === 'number' && \n" +
                "    isFinite(value) && \n" +
                "    Math.floor(value) === value;\n" +
                "}", "Couldn't polyfill Number.isInteger");
      try {
        Require.enable(engine, createRootFolder("com/google/common/css/babel-out", "UTF-8"));
      } catch (ScriptException e) {
        throw new RuntimeException("Couldn't initialize nashorn-commonjs-modules", e);
      }
    }
  }

  public JavaScriptDelegator(String getImpl) {
    this("", "");
    delegatedMap = exec("(() => {" +
            "function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { \"default\": obj }; }\n" +
            "\n" +
            "function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError(\"Cannot call a class as a function\"); } }\n" +
            "\n" +
            "function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if (\"value\" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }\n" +
            "\n" +
            "function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }\n" +
            "\n" +
            "var NewMap =\n" +
            "/*#__PURE__*/\n" +
            "function () {\n" +
            "  function NewMap() {\n" +
            "    _classCallCheck(this, NewMap);\n" +
            "  }\n" +
            "\n" +
            "  _createClass(NewMap, [{\n" +
            "    key: \"get\",\n" +
            "    value: function get(key) {\n" +
            "      " + getImpl + "\n" +
            "    }\n" +
            "  }]);\n" +
            "\n" +
            "  return NewMap;\n" +
            "}();\n" +
            "return new NewMap();\n" +
            "})()");
  }

  public void initialize(Object ...args) {
    engine.put("args", args);
    engine.put("args", exec("Java.from(args).map(x => x instanceof Java.type('java.util.Collection') ? Java.from(x) : x)"));
    // The next best thing after Reflect.construct().
    delegatedMap = exec("new (Function.prototype.bind.apply(require('./" + mainImportName + "'), [null].concat(args)))", "Couldn't initialize " + mainModule);
  }

  public Object initializeBuilder() {
    return exec("(() => { const Map = require('./" + mainImportName + "'); return new Map.Builder() })()");
  }

  public void initializeBuilt(Object builtMap) {
    delegatedMap = builtMap;
  }

  public Object recordingSubstitutionMapBuilderWithMappings(Object builder, Map<? extends String, ? extends String> m) {
    engine.put("delegatedMap", builder);
    engine.put("initialMappings", m);
    return exec("(() => {" +
            "const map = new Map(); for each (let i in initialMappings.keySet()) { map.set(i, initialMappings.get(i)) };" +
            "return delegatedMap.withMappings(map) })()");
  }

  public DataFolder createRootFolder(String path, String encoding) {
    return new DataFolder(path, null, "/", encoding);
  }

  public String substitutionMapGet(String key) {
    return executeObject("get", key).toString();
  }

  public void substitutionMapInitializableInitializeWithMappings(Map<? extends String, ? extends String> initialMappings) {
    engine.put("delegatedMap", delegatedMap);
    // immutable.Map expects a JavaScript Object, so we need to pre-convert.
    engine.put("initialMappings", initialMappings);
    exec("(() => {" +
        "const immutable = require('immutable');" +
        "const map = {}; for each (let i in initialMappings.keySet()) { map[i] = initialMappings.get(i) };" +
        "delegatedMap.initializeWithMappings(immutable.Map(map)) })()");
  }

  public ValueWithMappings multipleMappingSubstitutionMapGetValueWithMappings(String key) {
    engine.put("delegatedMap", delegatedMap);
    engine.put("key", key);
    return (ValueWithMappings) exec("(() => {" +
      "const LinkedHashMap = Java.type('java.util.LinkedHashMap');\n" +
      "const JavaValueWithMappings = Java.type('com.google.common.css.MultipleMappingSubstitutionMap.ValueWithMappings');\n" +
      "const jsValueWithMappings = delegatedMap.getValueWithMappings(key);\n" +
      "const map = new LinkedHashMap();\n" +
      "jsValueWithMappings.mappings.forEach((value, key) => map.put(key, value));\n" +
      "return JavaValueWithMappings.createWithValueAndMappings(jsValueWithMappings.value, map) })()");
  }

  public Object executeObject(String method, Object ...args) {
    return executeOnObject(delegatedMap, method, args);
  }

  public Object executeOnObject(Object object, String method, Object ...args) {
    engine.put("myObject", object);
    engine.put("args", args);
    return exec("myObject." + method + ".apply(myObject, args)");
  }

  public Map<String, String> executeMap(String method) {
    engine.put("delegatedMap", delegatedMap);
    Object result = exec("(() => {" +
              "const LinkedHashMap = Java.type('java.util.LinkedHashMap');\n" +
              "const JavaValueWithMappings = Java.type('com.google.common.css.MultipleMappingSubstitutionMap.ValueWithMappings');\n" +
              "const jsMap = delegatedMap." + method + "();\n" +
              "const javaMap = new LinkedHashMap();\n" +
              "jsMap.forEach((value, key) => javaMap.put(key, value));\n" +
              "return javaMap })()");
    return (Map<String, String>) result;
  }

  public Object wrapPredicate(Predicate predicate) {
    engine.put("predicate", predicate);
    return exec("(() => { const p = predicate; return (input) => p.apply(input) })()");
  }

  private Object exec(String script, String failureMessage) {
    try {
      return engine.eval(script);
    } catch (ScriptException e) {
      // Preconditions.checkNotNull
      if (e.getMessage().contains("value is null")) {
        throw new NullPointerException();
      }
      throw new RuntimeException(failureMessage, e);
    }
  }

  private Object exec(String script) {
    return exec(script, "Eval failed");
  }

  private class DataFolder extends AbstractFolder {

    private ClassLoader loader;
    private String resourcePath;
    private String encoding;

    private String getResource(String path) {
      InputStream stream = loader.getResourceAsStream(path);
      if (stream == null) {
        return null;
      }
      return new BufferedReader(new InputStreamReader(stream)).lines().collect(Collectors.joining("\n"));
    }

    @Override
    public String getFile(String name) {
      String path = resourcePath + "/" + name;

      // debug is used by conditional, but we don't need it.
      if (path.contains("debug/node.js")) {
        return "module.exports = (module_name) => ((message) => {});";
      }

      // An alternative guava-js wrapper, since we don't have fs:
      // https://github.com/rzhw/postcss-rename/blob/e3f6b7455f7e0ed0dbef13d6bd476f4927ae2e84/css/guavajs-wrapper.js
      if (path.contains("guavajs-wrapper.js")) {
        return getResource("main/javascript/GuavaJS.js") +
                getResource("main/javascript/GuavaJS.strings.js") +
                getResource("main/javascript/GuavaJS.strings.charmatcher.js") +
                getResource("main/javascript/GuavaJS.strings.splitter.js") +
                "\nmodule.exports = GuavaJS;";
      }

      String result = getResource(path);
      if (result == null) {
        //System.out.println("couldn't find " + path);
        return null;
      }

      // Node.js requires shouldn't be using the Babel-generated format.
      result = result.replace("_interopRequireDefault(require(\"./guavajs-wrapper\"))", "require('./guavajs-wrapper')");
      result = result.replace("_interopRequireDefault(require(\"conditional\"))", "require('conditional')");
      result = result.replace("_interopRequireDefault(require(\"immutable\"))", "require('immutable')");
      result = result.replace("_identitySubstitutionMap.IdentitySubstitutionMap", "_identitySubstitutionMap");

      // The top level module needs to export itself in Node.js style, instead of what Babel generates.
      Optional<String> anyMatch = localModules.keySet().stream().filter(x -> path.endsWith("/" + x)).findFirst();
      if (anyMatch.isPresent()) {
        result += "\nmodule.exports = " + localModules.get(anyMatch.get()) + ";";
      }

      return result;
    }

    @Override
    public Folder getFolder(String name) {
      String path = resourcePath + "/" + name;
      //System.out.println("Looking for " + path);

      if (path.startsWith("com/google/common/css/babel-out/node_modules/conditional")) {
        return new DataFolder(
                "external/npm/node_modules/conditional/node_modules/debug/node_modules/ms/node_modules/conditional", this, getPath() + name + "/", encoding);
      }
      if (path.startsWith("com/google/common/css/babel-out/node_modules/immutable")) {
        return new DataFolder(
                "external/npm/node_modules/immutable", this, getPath() + name + "/", encoding);
      }
      return new DataFolder(
              resourcePath + "/" + name, this, getPath() + name + "/", encoding);
    }

    DataFolder(String resourcePath, Folder parent, String displayPath, String encoding) {
      super(parent, displayPath);
      this.loader = JavaScriptDelegator.class.getClassLoader();
      this.resourcePath = resourcePath;
      this.encoding = encoding;
    }
  }
}
