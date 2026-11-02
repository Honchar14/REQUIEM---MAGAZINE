import "./style.css";
import { initSmoothScroll } from "./animations/scroll";
import { runPreloader } from "./animations/preloader";
import { initSearchHover } from "./animations/searchHover";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lenis = initSmoothScroll(reduceMotion);
lenis?.stop();

runPreloader({ reduceMotion }).then(() => {
  lenis?.start();
  // Search hover: the placeholder is retyped on a loop behind a blinking caret
  if (!reduceMotion) initSearchHover();
});
