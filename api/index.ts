// Polyfill for pdf-parse (it expects browser APIs like DOMMatrix in some environments)
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import app from '../server/index.js';

export default app;
