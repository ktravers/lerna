"use strict";

const { NpmConfig } = require("..");

test("subclass behavior", async () => {
  const conf = new NpmConfig();

  await conf.load();

  expect(conf.flatOptions).toMatchInlineSnapshot();
});
