export default class Storage {
  constructor() {
    this._cache = {};
  }

  init() {
    chrome.storage.onChanged.addListener(this._update);
    return this._update();
  }

  get() {
    return this._cache;
  }

  _update() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(data => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }

        this._cache = { ...data };
        resolve();
      });
    });
  }
}
