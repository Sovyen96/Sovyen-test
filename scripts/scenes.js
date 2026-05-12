const { gsap, ScrollTrigger } = window;

function splitWords(el) {
  const text = el.textContent.trim();
  el.innerHTML = text
    .split(' ')
    .map((word) => `<span class="word"><span class="inner">${word}</span></span>`)
    .join(' ');
}

function init() {
  const splitTarget = document.querySelector('[data-split]');
  if (splitTarget) splitWords(splitTarget);

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro.from('.hero__copy [data-reveal]', {
    y: 24,
    opacity: 0,
    duration: 1.2,
    stagger: 0.15,
    delay: 0.3,
  }, 0);

  if (splitTarget) {
    gsap.set(splitTarget, { opacity: 1 });
    gsap.set('.word .inner', { yPercent: 110 });
    intro.to('.word .inner', {
      yPercent: 0,
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.08,
    }, 0.2);
  }

  gsap.to('.hero__bottle', {
    yPercent: -18,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.4,
    },
  });

  gsap.utils.toArray('.scene__media img, .outro__media img').forEach((img) => {
    gsap.fromTo(
      img,
      { scale: 1.15, yPercent: 5 },
      {
        scale: 1,
        yPercent: -5,
        ease: 'none',
        scrollTrigger: {
          trigger: img,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.4,
        },
      }
    );
  });

  gsap.utils.toArray('.scene__copy, .expressions__head, .outro__copy, .kit__copy, .news__inner').forEach((el) => {
    gsap.from(el.children, {
      y: 32,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
      },
    });
  });

  gsap.from('.expression', {
    y: 48,
    opacity: 0,
    duration: 1,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.expressions__grid',
      start: 'top 78%',
    },
  });

  gsap.from('.trust__item', {
    y: 24,
    opacity: 0,
    duration: 0.9,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.trust',
      start: 'top 85%',
    },
  });

  gsap.from('.kit__media img', {
    scale: 1.12,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.kit',
      start: 'top 75%',
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
