import * as bootstrap from './bootstrap.js';
import * as foundation from './foundation.js';
import * as native from './native.js';

const adapters = [
  { name: 'bootstrap', api: bootstrap },
  { name: 'foundation', api: foundation },
  { name: 'native', api: native },
];

export function selectAdapter(framework, element) {
  return adapters.find(
    ({ name, api }) =>
      (framework === 'auto' ? name !== 'native' : name === framework) &&
      api.available(element)
  );
}
