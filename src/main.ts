import "./style.css";
import { initSmoothScroll } from "./animations/scroll";
import { runPreloader } from "./animations/preloader";
import { startFontSwap } from "./animations/fontswap";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lenis = initSmoothScroll(reduceMotion);
lenis?.stop();

runPreloader({ reduceMotion }).then(() => {
  lenis?.start();
  // now and then a letter of REQUIEM jumps into another typeface
  if (!reduceMotion) startFontSwap();
});
