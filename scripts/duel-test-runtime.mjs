import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

/** Executes production browser classes with explicit clock/platform doubles; never copies the method under test. */
export async function loadDuelModule(path, dependencies = {}, globals = {}) {
  const context = vm.createContext({ console, ...globals });
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(stripTypeScriptTypes(source, { mode: 'transform' }), { context, identifier: path });
  await module.link(id => {
    if (!(id in dependencies)) throw new Error('Missing explicit test dependency: ' + id);
    const exports = dependencies[id];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate(); return module.namespace;
}
