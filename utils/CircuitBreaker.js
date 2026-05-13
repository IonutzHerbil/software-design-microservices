class CircuitBreaker {
  constructor(fn, { timeout, errorThreshold, resetTimeout, volumeThreshold }) {
    this.fn = fn;
    this.timeout = timeout;
    this.errorThreshold = errorThreshold;
    this.resetTimeout = resetTimeout;
    this.volumeThreshold = volumeThreshold;

    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this._fallbackFn = null;
  }

  async fire(...args) {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "half-open";
        console.info("[CB] HALF-OPEN -> probing service");
      } else {
        console.warn("[CB] Rejected -> circuit is open");
        return this._fallback();
      }
    }

    try {
      const result = await Promise.race([
        this.fn(...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), this.timeout),
        ),
      ]);

      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      console.warn(
        err.message === "Timeout"
          ? "[CB] Timeout -> exceeded 1500ms"
          : "[CB] Failure",
      );
      return this._fallback();
    }
  }

  _onSuccess() {
    this.failures = 0;
    if (this.state === "half-open") {
      this.state = "closed";
      console.info("[CB] CLOSED -> service recovered");
    }
  }

  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.state = "open";
      console.warn("[CB] OPEN -> probe failed, back to open");
      return;
    }

    const total = this.failures + this.successes;
    if (
      total >= this.volumeThreshold &&
      (this.failures / total) * 100 >= this.errorThreshold) {
      this.state = "open";
      this.failures = 0;
      this.successes = 0;
      console.warn("[CB] OPEN -> serving fallback");
    }
  }

  fallback(fn) {
    this._fallbackFn = fn;
  }

  _fallback() {
    return this._fallbackFn ? this._fallbackFn() : null;
  }

  get opened() {
    return this.state === "open";
  }

  get halfOpen() {
    return this.state === "half-open";
  }

  get stats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
    };
  }
}

module.exports = CircuitBreaker;
