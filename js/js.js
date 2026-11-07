```javascript
/* CLOCK */
const hours = document.querySelector('.hours');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');

function rotation(target, val) {
  if (!target) return;
  target.style.transform = `rotate(${val}deg)`;
}

function clock() {
  if (!hours || !minutes || !seconds) return;

  const today = new Date();
  let h = (today.getHours() % 12) + today.getMinutes() / 59;
  let m = today.getMinutes();
  let s = today.getSeconds();

  rotation(hours, h * 30);
  rotation(minutes, m * 6);
  rotation(seconds, s * 6);

  setTimeout(clock, 500);
}

// เริ่มนาฬิกาเมื่อ DOM พร้อม
if (hours && minutes && seconds) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clock);
  } else {
    clock();
  }
}

/* RATE SLIDER */
const container = document.querySelector('.slider__box');
const btn = document.querySelector('.slider__btn');
const color = document.querySelector('.slider__color');
const tooltip = document.querySelector('.slider__tooltip');

function dragElement(target, button) {
  if (!target || !button || !color || !tooltip) return;

  let onMouseMove;
  let onMouseUp;

  target.addEventListener('mousedown', (e) => {
    e.preventDefault();

    onMouseMove = (event) => {
      const rect = target.getBoundingClientRect();
      let x = event.clientX - rect.left;

      x = Math.max(0, Math.min(x, rect.width));

      const percent = rect.width ? (x / rect.width) * 100 : 0;

      button.style.left = x + 'px';
      color.style.width = percent + '%';
      tooltip.style.left = x + 'px';
      tooltip.style.opacity = 1;
      tooltip.textContent = Math.round(percent) + '%';
    };

    onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      tooltip.style.opacity = 0;
    };

    onMouseMove(e);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  });
}

dragElement(container, btn);

/* PLAY BUTTON */
const play = document.querySelector('.play');
const pause = document.querySelector('.pause');
const playBtn = document.querySelector('.circle__btn');
const wave1 = document.querySelector('.circle__back-1');
const wave2 = document.querySelector('.circle__back-2');

if (playBtn && play && pause && wave1 && wave2) {
  playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    pause.classList.toggle('visibility');
    play.classList.toggle('visibility');
    playBtn.classList.toggle('shadow');
    wave1.classList.toggle('paused');
    wave2.classList.toggle('paused');
  });
}
```
