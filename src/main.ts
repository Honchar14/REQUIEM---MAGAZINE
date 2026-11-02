import "./style.css";
import { initSmoothScroll } from "./animations/scroll";
import { runPreloader } from "./animations/preloader";
import { startWordmarkIdle } from "./animations/idle";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lenis = initSmoothScroll(reduceMotion);
lenis?.stop();

runPreloader({ reduceMotion }).then(() => {
  lenis?.start();
  // the big REQUIEM wordmark: a letter glitches now and then, like a worn print
  if (!reduceMotion) startWordmarkIdle();
});
