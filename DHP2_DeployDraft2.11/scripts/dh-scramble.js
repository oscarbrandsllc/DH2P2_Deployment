// Dynasty Hub letter-by-letter scramble (random lock order, slow flicker, full alphanum set)
(function () {
  const TARGET = "Dynasty Hub";                 // 7 + space + 3
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\\/[]{}—=+*^?#$@%&";
  const TICK_MS = 100;                           // render heartbeat
  const LOCK_MS = 180;                          // speed each next letter locks
  const SCRAMBLE_MIN_MS = 50;                  // dud char holds longer -> slower-looking flicker
  const SCRAMBLE_MAX_MS = 110;
  const SPACE_INDEX = TARGET.indexOf(" ");      // should be 7 for "Dynasty Hub"

  const now = () => Date.now();
  const rand = (n) => Math.floor(Math.random() * n);
  const randChar = () => CHARS[rand(CHARS.length)];
  const randInterval = () =>
    Math.floor(SCRAMBLE_MIN_MS + Math.random() * (SCRAMBLE_MAX_MS - SCRAMBLE_MIN_MS));

  function shuffledLockOrder(len, skipIndex) {
    const arr = [];
    for (let i = 0; i < len; i++) if (i !== skipIndex) arr.push(i);
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function run() {
    const el = document.getElementById("dh-scramble");
    if (!el) return;

    const slots = TARGET.split("");
    const state = slots.map(() => ({ dud: randChar(), next: now() + randInterval() }));

    // Prepare a random locking order among all character positions (except space)
    const order = shuffledLockOrder(slots.length, SPACE_INDEX);
    const locked = new Array(slots.length).fill(false);

    let lockPtr = -1;
    let lastLock = now();

    const interval = setInterval(() => {
      const t = now();

      // lock the next position in random order
      if (t - lastLock >= LOCK_MS) {
        lockPtr++;
        lastLock = t;

        if (lockPtr < order.length) {
          locked[order[lockPtr]] = true;
        } else {
          clearInterval(interval);
          el.textContent = TARGET;
          return;
        }
      }

      // Render frame
      let html = "";
      for (let i = 0; i < slots.length; i++) {
        if (i === SPACE_INDEX) { html += " "; continue; }

        if (locked[i]) {
          html += slots[i];
        } else {
          if (t >= state[i].next) {
            state[i].dud = randChar();
            state[i].next = t + randInterval();
          }
          html += '<span class="dh-dud">' + state[i].dud + "</span>";
        }
      }

      el.innerHTML = html;
    }, TICK_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
