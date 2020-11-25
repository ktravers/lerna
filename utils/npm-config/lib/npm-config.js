"use strict";

const fs = require("fs");
const path = require("path");
const Config = require("@npmcli/config");
const envReplace = require("@npmcli/config/lib/env-replace.js");
const log = require("npmlog");

const { defaults, types } = require("./defaults-and-types");

// e.g., "/usr/local/lib/node_modules/npm";
const getNpmPath = () =>
  path.resolve(fs.realpathSync(path.join(path.dirname(process.execPath), "npm")), "../..");

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
