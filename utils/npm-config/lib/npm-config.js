"use strict";

const fs = require("fs");
const path = require("path");
const Config = require("@npmcli/config");
const envReplace = require("@npmcli/config/lib/env-replace.js");
const log = require("npmlog");

const { defaults, types } = require("./defaults-and-types");
const { flatOptions } = require("./flat-options");

// (terribly naive implementation, don't blame npm folks)
// e.g., "/usr/local/lib/node_modules/npm";
const getNpmPath = () =>
  path.resolve(fs.realpathSync(path.join(path.dirname(process.execPath), "npm")), "../..");

const getProjectScope = (prefix) => {
  try {
    /* eslint-disable-next-line global-require, import/no-dynamic-require */
    const { name } = require(path.resolve(prefix, "package.json"));
    if (!name || typeof name !== "string") {
      return "";
    }

    const split = name.split("/");
    if (split.length < 2) {
      return "";
    }

    const scope = split[0];
    return /^@/.test(scope) ? scope : "";
  } catch (er) {
    return "";
  }
};

/* eslint-disable no-underscore-dangle */
const _flatOptions = Symbol("_flatOptions");
const _tmpFolder = Symbol("_tmpFolder");
/* eslint-enable no-underscore-dangle */

/**
 * A wrapper around @npmcli/config's `Config` class that provides "good enough"
 * defaults and types along with a `flatOptions` getter to pass to libnpm*
 * functions. If you need to customize your own types, shorthands, or defaults,
 * you should probably be using @npmcli/config directly.
 */
class NpmConfig extends Config {
  /**
   * @param {{ [key: string]: unknown, cwd?: string; }} options
   */
  constructor({ cwd, ...cliConfig } = {}) {
    super({
      types,
      defaults,
      shorthands: {},
      npmPath: getNpmPath(),
      // we do not use nopt()
      argv: [],
      log,
      cwd,
    });

    this.cliConfig = cliConfig;

    // defaults for values set after load()
    this.modes = {
      exec: 0o755,
      file: 0o644,
      umask: 0o22,
    };
  }

  get command() {
    return this.cliConfig.lernaCommand ? `lerna ${this.cliConfig.lernaCommand}` : this.cliConfig.npmCommand;
  }

  get flatOptions() {
    return this[_flatOptions];
  }

  get tmp() {
    if (!this[_tmpFolder]) {
      /* eslint-disable-next-line global-require */
      const rand = require("crypto").randomBytes(4).toString("hex");
      this[_tmpFolder] = `lerna-${process.pid}-${rand}`;
    }

    return path.resolve(this.get("tmp"), this[_tmpFolder]);
  }

  /**
   * Wrap superclass method to mimic npm.load() callback operations.
   */
  async load() {
    await super.load();

    const color = this.get("color");
    /* eslint-disable-next-line no-nested-ternary */
    this.color = color === "always" ? true : color === false ? false : process.stdout.isTTY;

    const umask = this.get("umask");
    this.modes = {
      /* eslint-disable no-bitwise */
      exec: 0o777 & ~umask,
      file: 0o666 & ~umask,
      /* eslint-enable no-bitwise */
      umask,
    };

    // we don't guard config.scope lacking an "@" prefix
    this.projectScope = this.get("scope") || getProjectScope(this.prefix);

    // this is weird upstream circularity (default elsewhere)
    this.version = this.cliConfig.lernaVersion || this.get("npm-version");

    this[_flatOptions] = flatOptions(this);
  }

  /**
   * Override superclass to skip superfluous nopt() parsing.
   */
  loadCLI() {
    this.loadObject({ ...this.cliConfig }, "cli", "command line options");
  }

  /**
   * So the parent class uses symbols to hide this method. Ugh.
   * We don't throw or anything, nor obfuscate. Use responsibly.
   *
   * @param {{ [key: string]: unknown }} obj
   * @param {'default'|'builtin'|'global'|'user'|'project'|'env'|'cli'} where
   * @param {string} source
   */
  loadObject(obj, where, source) {
    const conf = this.data.get(where);

    conf.source = source;
    this.sources.set(source, where);

    conf.raw = obj;

    for (const [key, value] of Object.entries(obj)) {
      const k = envReplace(key, this.env);
      const v = this.parseField(value, k);
      conf.data[k] = v;
    }
  }
}

module.exports.NpmConfig = NpmConfig;
