## Copyright 2018 The Closure Stylesheets Authors.
##
## Licensed under the Apache License, Version 2.0 (the "License");
## you may not use this file except in compliance with the License.
## You may obtain a copy of the License at
##
##     http://www.apache.org/licenses/LICENSE-2.0
##
## Unless required by applicable law or agreed to in writing, software
## distributed under the License is distributed on an "AS IS" BASIS,
## WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
## See the License for the specific language governing permissions and
## limitations under the License.

workspace(name = "com_google_closure_stylesheets")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

RULES_JVM_EXTERNAL_TAG = "3.1"
RULES_JVM_EXTERNAL_SHA = "e246373de2353f3d34d35814947aa8b7d0dd1a58c2f7a6c41cfeaff3007c2d14"

http_archive(
    name = "rules_jvm_external",
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    sha256 = RULES_JVM_EXTERNAL_SHA,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    name = "maven",
    artifacts = [
        "args4j:args4j:2.0.26",
        "com.google.auto.value:auto-value:1.6",
        "com.google.code.findbugs:jsr305:3.0.1",
        "com.google.code.gson:gson:2.7",
        "com.google.guava:guava:20.0",
        "com.google.javascript:closure-compiler-unshaded:v20160713",
        "com.google.truth:truth:0.36",
        "org.mockito:mockito-all:1.10.19",
        "net.java.dev.javacc:javacc:jar:6.1.2",
    ],
    repositories = [
        "https://jcenter.bintray.com",
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
    fetch_sources = True,
    version_conflict_policy = "pinned",
    # See https://github.com/bazelbuild/rules_jvm_external/#repository-aliases
    # This can be removed if none of your external dependencies uses `maven_jar`.
    generate_compat_repositories = True,
)
load("@maven//:compat.bzl", "compat_repositories")
compat_repositories()

