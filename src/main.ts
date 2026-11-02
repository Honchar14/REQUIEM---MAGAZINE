import "./style.css";
import { initSmoothScroll } from "./animations/scroll";
import { introWordmark } from "./animations/intro";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

initSmoothScroll(reduceMotion);

if (!reduceMotion) {
  introWordmark();
}
