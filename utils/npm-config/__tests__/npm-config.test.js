"use strict";

// npmlog is an EventEmitter
const EventEmitter = require("events");
const { version: pkgVersion } = require("../package.json");
const { NpmConfig } = require("..");

test("flatOptions", async () => {
  const conf = new NpmConfig();

  expect(conf.flatOptions).toBeUndefined();

  await conf.load();

  const opts = conf.flatOptions;

  // one-and-done evaluation
  expect(opts).toBe(conf.flatOptions);

  expect(conf.flatOptions).toMatchSnapshot({
    // normalize platform- and user-specific fields
    "//registry.npmjs.org/:_authToken": expect.any(String),
    cache: expect.any(String),
    dmode: expect.any(Number),
    fmode: expect.any(Number),
    globalPrefix: expect.any(String),
    localPrefix: expect.any(String),
    log: expect.any(EventEmitter),
    nodeBin: expect.any(String),
    nodeVersion: expect.any(String),
    npmSession: expect.any(String),
    npmVersion: pkgVersion,
    prefix: expect.any(String),
    shell: expect.any(String),
    tmp: expect.any(String),
    umask: expect.any(Number),
    userAgent: expect.any(String),
  });

  expect(opts.localPrefix).toBe(process.cwd());
  expect(opts.prefix).toBe(process.cwd());

  expect(opts.nodeBin).toBe(process.execPath);
  expect(opts.nodeVersion).toBe(process.version);

  expect(opts.dmode).toBe(conf.modes.exec);
  expect(opts.fmode).toBe(conf.modes.file);
  expect(opts.umask).toBe(conf.modes.umask);

  expect(opts.tmp).toMatch(/.*lerna-[\d]+-[0-9a-f]+$/);
});
