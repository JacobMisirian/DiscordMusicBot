class MusicQueue {
  constructor() {
    this._queue = [];
  }

  enqueue(item) {
    this._queue.push(item);
  }

  skip() {
    return this._queue.shift();
  }

  clear() {
    this._queue = [];
  }

  getSongs() {
    return this._queue;
  }

  getCurrentSong() {
    return this._queue[0] || null;
  }

  getSongAt(position) {
    return this._queue[position] || null;
  }

  remove(element) {
    this._queue = this._queue.filter((item) => item !== element);
  }

  get length() {
    return this._queue.length;
  }
}

module.exports = new MusicQueue();
