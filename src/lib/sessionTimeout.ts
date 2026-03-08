export class SessionTimeout {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private onTimeout: () => void;
  private onWarning: () => void;
  private timeoutMs: number;
  private events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

  constructor(onTimeout: () => void, onWarning: () => void, timeoutMinutes: number = 120) {
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.resetTimer = this.resetTimer.bind(this);
  }

  start() {
    this.events.forEach(e => document.addEventListener(e, this.resetTimer, { passive: true }));
    this.resetTimer();
  }

  stop() {
    this.events.forEach(e => document.removeEventListener(e, this.resetTimer));
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
  }

  private resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    // Warning 5 minutes before timeout
    const warningMs = this.timeoutMs - (5 * 60 * 1000);
    if (warningMs > 0) {
      this.warningTimer = setTimeout(() => this.onWarning(), warningMs);
    }
    
    this.timer = setTimeout(() => this.onTimeout(), this.timeoutMs);
  }
}
