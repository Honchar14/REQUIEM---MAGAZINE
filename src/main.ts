import "./style.css";
import { initSmoothScroll } from "./animations/scroll";
import { runPreloader } from "./animations/preloader";
import { initSearchHover } from "./animations/searchHover";
import { initSlider } from "./animations/slider";
import { startWordmarkFlicker } from "./animations/wordmarkFlicker";
import { bootLang, initLangSwitch } from "./i18n";
import { startPrints } from "./animations/prints";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// EN / ES: the saved language is in place before anything is typed
bootLang();

const lenis = initSmoothScroll(reduceMotion);
lenis?.stop();

runPreloader({ reduceMotion }).then(() => {
  lenis?.start();
  // Search hover: the placeholder is retyped on a loop behind a blinking caret
  if (!reduceMotion) initSearchHover();
  // REQUIEM: now and then a letter flickers
  if (!reduceMotion) startWordmarkFlicker();
  // fingerprints left along the mouse path, fading in and out slowly
  if (!reduceMotion) startPrints();
  // last news: five pages of stories, autoplay pager and hover cards
  initSlider({ reduceMotion });
  initLangSwitch();
});
