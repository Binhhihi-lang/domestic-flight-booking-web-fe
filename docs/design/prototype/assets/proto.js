/* =====================================================================
   proto.js — router tối giản cho prototype HTML (dùng chung 3 bản)

   Vì sao không dùng thư viện: prototype này phải mở được bằng
   double-click, không cần build, không cần mạng. Một hash router 40 dòng
   là đủ và không bao giờ hỏng.

   Cách dùng trong HTML:
     <section class="screen" data-screen="home"> ... </section>
     <a href="#/home">Trang chủ</a>          → chuyển màn
     data-overlay="cancel-booking"            → mở overlay
     data-close                               → đóng overlay đang mở
   ===================================================================== */
(function () {
  'use strict';

  var DEFAULT_SCREEN = document.body.dataset.defaultScreen || 'home';
  var history = [];
  var pointer = -1;

  function screens() {
    return Array.prototype.slice.call(document.querySelectorAll('.screen'));
  }

  function currentName() {
    var hash = location.hash.replace(/^#\/?/, '');
    return hash || DEFAULT_SCREEN;
  }

  function closeOverlays(except) {
    document.querySelectorAll('.overlay.is-open').forEach(function (o) {
      if (o !== except) o.classList.remove('is-open');
    });
  }

  function render(name, pushHistory) {
    var found = false;
    screens().forEach(function (s) {
      var on = s.dataset.screen === name;
      s.classList.toggle('is-active', on);
      if (on) found = true;
    });

    if (!found) {
      // Không có màn này thì về màn mặc định thay vì trang trắng.
      console.warn('[proto] không có màn:', name, '→ về', DEFAULT_SCREEN);
      if (name !== DEFAULT_SCREEN) {
        location.hash = '#/' + DEFAULT_SCREEN;
        return;
      }
    }

    closeOverlays(null);
    window.scrollTo(0, 0);

    if (pushHistory !== false) {
      if (history[pointer] !== name) {
        history = history.slice(0, pointer + 1);
        history.push(name);
        pointer = history.length - 1;
      }
    }

    var label = document.getElementById('proto-label');
    if (label) {
      var active = document.querySelector('.screen.is-active');
      label.textContent = (active && active.dataset.title) || name;
    }

    var counter = document.getElementById('proto-count');
    if (counter) {
      var list = screens();
      var idx = list.findIndex(function (s) {
        return s.dataset.screen === name;
      });
      counter.textContent = idx >= 0 ? idx + 1 + ' / ' + list.length : '';
    }

    document.dispatchEvent(new CustomEvent('screen:change', { detail: { name: name } }));
  }

  function go(name) {
    if (('#' + '/' + name) === location.hash) render(name);
    else location.hash = '#/' + name;
  }

  window.addEventListener('hashchange', function () {
    render(currentName());
  });

  document.addEventListener('DOMContentLoaded', function () {
    render(currentName());

    // Điều hướng bằng data-go (dùng cho nút nằm trong <button>)
    document.addEventListener('click', function (e) {
      var goEl = e.target.closest('[data-go]');
      if (goEl) {
        e.preventDefault();
        go(goEl.dataset.go);
        return;
      }

      var openEl = e.target.closest('[data-overlay]');
      if (openEl) {
        e.preventDefault();
        var target = openEl.dataset.overlay;
        closeOverlays(null);
        var el = document.getElementById('ov-' + target);
        if (el) el.classList.add('is-open');
        return;
      }

      if (e.target.closest('[data-close]')) {
        e.preventDefault();
        closeOverlays(null);
        return;
      }

      // Bấm ra ngoài tấm modal thì đóng
      if (e.target.classList.contains('overlay')) {
        e.target.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlays(null);
    });

    var back = document.getElementById('proto-back');
    if (back) {
      back.addEventListener('click', function () {
        if (pointer > 0) {
          pointer -= 1;
          location.hash = '#/' + history[pointer];
        }
      });
    }

    var home = document.getElementById('proto-home');
    if (home) {
      home.addEventListener('click', function () {
        go(DEFAULT_SCREEN);
      });
    }
  });

  window.proto = {
    go: go,
    open: function (id) {
      var el = document.getElementById('ov-' + id);
      if (el) el.classList.add('is-open');
    },
    close: function () {
      closeOverlays(null);
    },
    toast: function (msg, kind) {
      var stack = document.querySelector('.toast-stack');
      if (!stack) {
        stack = document.createElement('div');
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
      }
      var t = document.createElement('div');
      t.className = 'toast toast--' + (kind || 'success');
      t.innerHTML =
        '<span class="material-icons">' +
        (kind === 'error' ? 'error' : 'check_circle') +
        '</span><span></span>';
      t.lastElementChild.textContent = msg;
      stack.appendChild(t);
      setTimeout(function () {
        t.remove();
      }, 2800);
    },
  };
})();
