(() => {
  const config = window.QUEST_CONFIG;
  const gate = document.getElementById('gate');
  const quest = document.getElementById('quest');
  const form = document.getElementById('password-form');
  const input = document.getElementById('password');
  const message = document.getElementById('password-message');
  const grid = document.getElementById('days-grid');
  const dialog = document.getElementById('day-dialog');
  const dialogContent = document.getElementById('dialog-content');
  const dialogClose = document.getElementById('dialog-close');

  const encoder = new TextEncoder();

  async function sha256(value) {
    const bytes = encoder.encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function showQuest() {
    gate.classList.add('hidden');
    gate.setAttribute('aria-hidden', 'true');
    quest.classList.remove('hidden');
    quest.setAttribute('aria-hidden', 'false');
    renderAll();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    const hash = await sha256(input.value.trim());
    if (hash === config.passwordHash) {
      sessionStorage.setItem('petersburgQuestUnlocked', '1');
      showQuest();
    } else {
      message.textContent = 'Не тот ключ. Попробуй ещё раз.';
      input.select();
    }
  });

  if (sessionStorage.getItem('petersburgQuestUnlocked') === '1') showQuest();

  function renderAll() {
    renderPacking();
    renderDays();
    renderCountdown();
  }

  function renderPacking() {
    document.getElementById('packing-intro').textContent = config.packing.intro;
    document.getElementById('packing-note').textContent = config.packing.note;
    const packingGrid = document.getElementById('packing-grid');
    packingGrid.innerHTML = config.packing.groups.map(group => `
      <article class="packing-card">
        <h3>${escapeHtml(group.title)}</h3>
        <ul>${group.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </article>
    `).join('');
  }

  function renderDays() {
    const now = new Date();
    grid.innerHTML = config.days.map((day, index) => {
      const unlocked = now >= new Date(day.unlockAt);
      const birthdayClass = day.isBirthday ? ' birthday-card' : '';
      return `
        <article class="day-card${birthdayClass}${unlocked ? ' unlocked' : ' locked'}" data-day="${index}">
          ${day.isBirthday ? '<div class="birthday-ribbon">День рождения</div>' : ''}
          <div class="day-topline">
            <span class="day-icon">${day.icon}</span>

          </div>
          <p class="date">${escapeHtml(day.weekday)} · ${escapeHtml(day.dateLabel)}</p>
          <h3>${escapeHtml(day.title)}</h3>
          <p>${unlocked ? escapeHtml(day.lead) : escapeHtml(day.teaser)}</p>
          ${unlocked
            ? '<button class="open-day" type="button">Открыть главу <span>→</span></button>'
            : `<div class="unlock-copy">Откроется ${formatUnlock(day.unlockAt)}</div>`}
        </article>
      `;
    }).join('');

    //             <span class="day-state">${unlocked ? 'Открыто' : 'Запечатано'}</span>

    grid.querySelectorAll('.day-card.unlocked').forEach(card => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('button') || event.currentTarget === event.target) {
          openDay(Number(card.dataset.day));
        } else {
          openDay(Number(card.dataset.day));
        }
      });
    });
  }

  function openDay(index) {
    const day = config.days[index];
    if (new Date() < new Date(day.unlockAt)) return;
    dialogContent.innerHTML = `
      <p class="eyebrow">${escapeHtml(day.weekday)} · ${escapeHtml(day.dateLabel)}</p>
      <h2>${escapeHtml(day.title)}</h2>
      <p class="dialog-lead">${escapeHtml(day.lead)}</p>

      <div class="rhythm-list">
        ${day.rhythm.map(([time, text]) => `
          <div class="rhythm-row">
            <div class="rhythm-time">${escapeHtml(time)}</div>
            <div class="rhythm-text">${escapeHtml(text)}</div>
          </div>
        `).join('')}
      </div>
    `;
    dialog.showModal();
  }

          // <div class="carry-box">
      //   <span>Сегодня пригодится</span>
      //   <p>${escapeHtml(day.carry)}</p>
      // </div>
      //       <blockquote>${escapeHtml(day.poem).replace(/\n/g, '<br>')}</blockquote>

  dialogClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  function renderCountdown() {
    const node = document.getElementById('birthday-countdown');
    const target = new Date(config.birthdayAt);
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      node.classList.add('birthday-countdown--arrived');
      node.innerHTML = `
        <p class="countdown-kicker">12 сентября</p>
        <strong class="countdown-arrived">Твой день уже здесь ✦</strong>
        <small>${escapeHtml(config.timezoneLabel || '')}</small>
      `;
      return;
    }

    node.classList.remove('birthday-countdown--arrived');

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const units = [
      [days, plural(days, 'день', 'дня', 'дней')],
      [hours, plural(hours, 'час', 'часа', 'часов')],
      [minutes, plural(minutes, 'минута', 'минуты', 'минут')],
      [seconds, plural(seconds, 'секунда', 'секунды', 'секунд')]
    ];

    node.innerHTML = `
      <p class="countdown-kicker">До дня рождения</p>
      <div class="countdown-grid" role="timer" aria-label="До дня рождения осталось ${days} ${plural(days, 'день', 'дня', 'дней')}, ${hours} ${plural(hours, 'час', 'часа', 'часов')}, ${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')} и ${seconds} ${plural(seconds, 'секунда', 'секунды', 'секунд')}">
        ${units.map(([value, label]) => `
          <div class="countdown-unit">
            <strong>${String(value).padStart(2, '0')}</strong>
            <span>${label}</span>
          </div>
        `).join('')}
      </div>
      <small>12 сентября · ${escapeHtml(config.timezoneLabel || '')}</small>
    `;
  }

  function formatUnlock(value) {
    const d = new Date(value);
    const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }).format(d);
    const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(d);
    return `${date} утром, в ${time}`;
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  setInterval(() => {
    if (!quest.classList.contains('hidden')) renderCountdown();
  }, 1000);

  setInterval(() => {
    if (!quest.classList.contains('hidden')) renderDays();
  }, 60000);
})();
