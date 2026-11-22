(function () {
  var doc = document, win = window;
  var calm = win.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cabecera: transparente sobre la portada, blanca después.
  var bar = doc.querySelector(".bar[data-over]"), hero = doc.querySelector(".hero");
  if (bar && hero && "IntersectionObserver" in win) {
    new IntersectionObserver(function (e) {
      bar.classList.toggle("solid", !e[0].isIntersecting);
    }, { rootMargin: "-68px 0px 0px 0px" }).observe(hero);
  }

  // Barra de acción del móvil: fuera cuando el botón o el formulario ya están en pantalla.
  var phone = doc.querySelector(".phonebar"), form = doc.getElementById("auditoria");
  if (phone && hero && form && "IntersectionObserver" in win) {
    var seen = { hero: true, form: false };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target === hero ? "hero" : "form"] = e.isIntersecting; });
      phone.classList.toggle("show", !seen.hero && !seen.form);
    });
    io.observe(hero); io.observe(form);
  }

  // Declaración: las palabras toman tinta al pasar por la pantalla.
  var st = doc.querySelector(".statement");
  if (st && !calm) {
    var words = [];
    st.querySelectorAll("p").forEach(function (p) {
      var parts = p.textContent.trim().split(/\s+/);
      p.textContent = "";
      parts.forEach(function (w, i) {
        var s = doc.createElement("span");
        s.textContent = w;
        p.appendChild(s);
        if (i < parts.length - 1) p.appendChild(doc.createTextNode(" "));
        words.push(s);
      });
    });
    st.classList.add("js");
    var tick = false;
    var paint = function () {
      tick = false;
      var r = st.getBoundingClientRect(), vh = win.innerHeight;
      var t = (vh * 0.82 - r.top) / (r.height * 0.9);
      var n = Math.round(Math.max(0, Math.min(1, t)) * words.length);
      words.forEach(function (s, i) { s.classList.toggle("on", i < n); });
    };
    win.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(paint); } }, { passive: true });
    win.addEventListener("resize", paint);
    paint();
  }

  // Formulario de Tally.
  if (doc.querySelector("iframe[data-tally-src]")) {
    var load = function () {
      if (win.Tally) { win.Tally.loadEmbeds(); return; }
      doc.querySelectorAll("iframe[data-tally-src]:not([src])").forEach(function (f) { f.src = f.dataset.tallySrc; });
    };
    var s = doc.createElement("script");
    s.src = "https://tally.so/widgets/embed.js"; s.onload = load; s.onerror = load;
    doc.body.appendChild(s);
  }
})();
