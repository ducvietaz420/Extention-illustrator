/* Minimal CEP adapter for this panel, using Adobe's injected CEP interface. */
(function (root) {
  'use strict';

  function CSInterface() {}

  CSInterface.prototype.evalScript = function (script, callback) {
    if (!root.__adobe_cep__ || typeof root.__adobe_cep__.evalScript !== 'function') {
      callback('EvalScript error: CEP không khả dụng.');
      return;
    }
    root.__adobe_cep__.evalScript(script, callback);
  };

  root.CSInterface = CSInterface;
}(window));
