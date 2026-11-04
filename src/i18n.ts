import { gsap } from "gsap";
import type { Story } from "./content";
import { setFlickerText } from "./animations/flicker";
import { prepareTypewriter } from "./animations/typewriter";
import { isCompact, onViewport, uu, ux } from "./viewport";

/**
 * EN / ES. Every visible string on the page switches: the labels, the menu,
 * the news cards and the faint background columns. The choice is kept for the
 * next visit (and can be forced with ?lang=en / ?lang=es). Switching retypes the
 * labels with the site's typewriter and flicks the background type back in.
 */
export type Lang = "en" | "es";
const KEY = "requiem:lang";

function initial(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "es") return q;
  try {
    const s = localStorage.getItem(KEY);
    if (s === "en" || s === "es") return s;
  } catch {
    /* storage can be unavailable */
  }
  return "en";
}
let lang: Lang = initial();
export const getLang = () => lang;

const UI = {
  en: {
    title: "REQUIEM — Magazine",
    underWatch: "Under Watch: 2026",
    nav: ["Fashion", "Music", "Art & Photography", "Film & TV", "Culture"],
    sections: "Sections",
    language: "Language",
    lastNews: "LAST NEWS:",
    page: (n: number) => `News, page ${n}`,
    feature: "Fashion feature",
    tagline: "Seven artists under 25 who refuse to be polished",
    search: "Search",
    readMore: "Read more",
    readMoreLabel: (title: string, sub: string) => `Read more: ${title}, ${sub}`,
  },
  es: {
    title: "REQUIEM — Revista",
    underWatch: "Bajo vigilancia: 2026",
    nav: ["Moda", "Música", "Arte y fotografía", "Cine y TV", "Cultura"],
    sections: "Secciones",
    language: "Idioma",
    lastNews: "NOTICIAS:",
    page: (n: number) => `Noticias, página ${n}`,
    feature: "Reportaje de moda",
    tagline: "Siete artistas menores de 25 que se niegan a pulirse",
    search: "Buscar",
    readMore: "Leer más",
    readMoreLabel: (title: string, sub: string) => `Leer más: ${title}, ${sub}`,
  },
};
export const t = () => UI[lang];

/** the faint type columns behind everything, in Spanish (same order as BG_COLUMNS) */
const BG_ES = [
  "REQUIEM empezó como un fanzine fotocopiado que pasaba de mano en mano en clubes y escuelas de arte. Hoy es una revista trimestral y un archivo en línea, pero la idea no ha cambiado. Buscamos a quienes hacen cultura antes de que nadie les dé permiso. Trabajan en sótanos, okupas, estudios compartidos y dormitorios. Cosen, pintan, graban, filman y se organizan casi sin dinero y con mucha terquedad. Tratamos cada historia como un expediente.",
  "Vamos allí, los conocemos, tomamos notas y fotografiamos lo que encontramos. No escribimos sobre tendencias, porque las tendencias son lo que pasa cuando lo interesante ya ha terminado. Cada número es un conjunto de expedientes: entrevistas, retratos, textos largos y una lista de nombres a seguir. Léelos en orden o ábrelos al azar. De cualquier forma, conocerás a alguien de quien aún no has oído hablar. Dale un año y todo el mundo sabrá su nombre.",
  "Durante una década, la moda vendió perfección: líneas limpias, costuras invisibles, logos legibles desde la otra acera. Esta temporada, el interior de la prenda pasó al exterior. En los desfiles de graduación de Amberes, Varsovia y Londres, más de la mitad de las colecciones usaron bordes en crudo. Algunos diseñadores cortaron los bajos a mano con la pieza ya terminada. Otros dejaron el hilvanado blanco, las puntadas provisionales que los sastres suelen quitar antes de que nadie las vea. Una costura por fuera admite cómo se hizo algo, quién lo hizo y cuánto tardó. En un mundo de superficies perfectas, esa confesión parece casi radical.",
  "Hace diez años, una película sobre crecer era un verano, un primer amor y un coche prestado. Ahora es un piso húmedo, un turno de noche y algo que golpea dentro de las paredes. Una nueva ola de jóvenes directores usa el terror para hablar de lo que de verdad teme su generación: el alquiler, el aislamiento, un cuerpo que no deja de cambiar y un futuro que no deja de aplazarse.",
];
export const columnText = (i: number, en: string) => (lang === "es" ? (BG_ES[i] ?? en) : en);

type Copy = Pick<Story, "title" | "sub" | "body">;
/** the news cards in Spanish: same pages and slots as SLIDES (left to right) */
const STORIES_ES: Copy[][] = [
  [
    { title: "Horóscopos", sub: "Nosferatu Robert Eggers", body: "Mercurio retrógrado en Escorpio: ya nada se esconde bajo la alfombra. Atamos cabos y ensayamos discursos." },
    { title: "Cosmética", sub: "Labiales escarchados Y2K", body: "MAC recupera el efecto escarcha: el mítico Frost Lipstick vuelve en tonos nacarados, básico del neceser noventero." },
    { title: "Halloween", sub: "Gabe Gordon aúlla", body: "Frostbite, el desfile AW26 de Gabe Gordon, cruzó patinadoras de los 80 con Un hombre lobo americano en Londres." },
    { title: "Harley Weir", sub: "Una visión poderosa de las brujas de hoy", body: "La fotógrafa Harley Weir y la diseñadora Dilara Findikoglu reivindican a la bruja, villana de todos los cuentos." },
    { title: "Luchando", sub: "A los jóvenes americanos les importa", body: "El 3 de noviembre, EE. UU. vota en las elecciones de medio mandato, que deciden la segunda mitad de una presidencia." },
  ],
  [
    { title: "Desechable", sub: "27 fotos, sin repetir", body: "Con el móvil todas las fiestas parecen iguales. Vuelve la cámara de plástico: 27 fotos, dos semanas de espera, copias borrosas." },
    { title: "Sala roja", sub: "Thrillers rodados en un solo color", body: "Los thrillers del año usan un solo color: caras ahogadas en rojo, salas sin bordes y la sensación de que nada es seguro." },
    { title: "Vulnus", sub: "Moratones en caja, como reliquias", body: "Vulnus es herida en latín. Estas cajas llevan moratones impresos en el cartón, iluminadas como pruebas bajo una luz dura." },
    { title: "Acústico", sub: "Una silla, un micro, sin pregrabados", body: "Sin pantallas LED ni coreografías: una silla, un foco, un micro. Sin dónde esconderse, cada nota tiene que llegar." },
    { title: "Con cable", sub: "Por qué volvió el cable de los cascos", body: "Los auriculares inalámbricos nos dejaron un cajón de baterías muertas. Vuelve el cable blanco, como aviso: no molestar." },
  ],
  [
    { title: "Sastrería", sub: "Hombros duros, caras suaves", body: "Trajes cortados como armaduras, con mullets decolorados y cicatrices pintadas: la prenda más conservadora, para outsiders." },
    { title: "Grillz", sub: "Joyas que se llevan al sonreír", body: "El oro y las piedras sobre los dientes pasan de los vídeos de rap a la belleza. Lo más pedido: cada diente distinto." },
    { title: "Abrigos", sub: "El plumífero como uniforme", body: "Un plumífero negro, un durag de seda y una cadena fina: un uniforme de calle que dice más de tu barrio que cualquier logo." },
    { title: "Guitarras", sub: "Las bandas de garaje suben el volumen", body: "Sin portátiles ni algoritmo: una nueva ola de bandas de guitarras gana público bolo a bolo, en bares llenos de sudor." },
    { title: "Colmillos", sub: "El vampiro vuelve a tener hambre", body: "Nuestro vampiro no es un romántico atormentado sino algo salvaje: piel azul, ojos amarillos, dientes de goma." },
  ],
  [
    { title: "Dosis", sub: "Disfraces con prospecto", body: "Este Halloween los mejores disfraces son productos: un bote de pastillas por sombrero, un vestido como un tapón." },
    { title: "Inframundo", sub: "Cuerpos fotografiados en luz azul", body: "Cuevas, canteras inundadas, una bombilla azul: la nueva fotografía trata el cuerpo como paisaje, mitad retrato, mitad sueño." },
    { title: "Fiesta", sub: "Vuelve el flash a la pista", body: "El flash de cámara vuelve a la pista de baile: duro, poco favorecedor y la prueba de que estuviste allí." },
    { title: "Sangre", sub: "La sangre de verdad vuelve a ganar", body: "El gore digital se olvida en segundos. Los nuevos directores de terror quieren sangre de atrezo: pegajosa, sucia, pesada." },
    { title: "El mitin", sub: "Actos de campaña que parecen conciertos", body: "Sillas plegables, una pancarta pegada al techo y un micro de mano: los actos de campaña se parecen más a un club de comedia." },
  ],
  [
    { title: "Oversize", sub: "El bolso que se tragó el look", body: "En el it-bag cabían un pintalabios y una llave. Ahora cabe un edredón: blando, arrugado, balanceado entre el tráfico." },
    { title: "Retiro", sub: "Grabar un disco en el bosque", body: "Sin estudio y sin cobertura: músicos jóvenes alquilan una cabaña un mes y vuelven con un disco lleno de pájaros y crujidos." },
    { title: "Mascotas", sub: "Todos quieren un monstruo blandito", body: "Marcas y festivales buscan lo mismo: una criatura peluda y algo ridícula a la que la gente hace cola para abrazar." },
    { title: "Tiro bajo", sub: "Gomas, gorras y billetes en la cama", body: "Los 2000 vuelven sin pulir: calzoncillos sobre shorts caídos, gorra ladeada y billetes arrugados en abanico ante el flash." },
    { title: "Cristal", sub: "Pedrería como armadura", body: "Los cristales cosidos a mano dejan la alfombra roja por cenas y discotecas. Bajo el flash, el cuerpo es una bola de espejos." },
  ],
];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** a story in the current language */
export function localized(story: Story, page: number, slot: number): Story {
  if (lang === "en") return story;
  const es = STORIES_ES[page]?.[slot];
  const date = story.date.replace(/^(\w+)/, (m) => MONTHS_ES[MONTHS_EN.indexOf(m)] ?? m);
  return { ...story, ...es, date };
}

/* ---------- the page ---------- */
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

/**
 * The menu starts where the layout puts "Fashion" (x 1213) and every next word
 * follows the one before it, 20px apart, as in the layout. The words are sized
 * in --u and placed in --ux, so the gaps are measured in screen px: they stay
 * even on every screen shape and in every language.
 * (Compact layout: the menu is in flow, CSS lays it out.)
 */
const NAV_X = [1213, 1301, 1371, 1544, 1645]; // the layout's English menu
const NAV_GAP = 20;
function layoutNav() {
  if (isCompact()) return;
  const links = $$("[data-ui] .ui__nav a");
  const kx = ux();
  const k = uu() / kx; // a design px of type, in --x units
  let x = NAV_X[0];
  links.forEach((a, i) => {
    // English: the layout's own offsets from "Fashion", scaled with the type
    if (lang === "en") x = NAV_X[0] + (NAV_X[i] - NAV_X[0]) * k;
    a.style.setProperty("--x", x.toFixed(2));
    // offsetWidth: the laid-out width, unaffected by the hover push (a transform)
    x += a.offsetWidth / kx + NAV_GAP * k;
  });
}

/** writes the strings of the current language; with animate, the labels are retyped */
function applyUI(animate: boolean) {
  const d = UI[lang];
  document.documentElement.lang = lang;
  document.title = d.title;

  const texts: [HTMLElement | null, string][] = [
    [$("[data-i18n=underWatch]"), d.underWatch],
    [$("[data-i18n=lastNews]"), d.lastNews],
    [$("[data-i18n=feature]"), d.feature],
    [$("[data-i18n=tagline]"), d.tagline],
    ...$$("[data-ui] .ui__nav a").map((a, k) => [a, d.nav[k]] as [HTMLElement, string]),
  ];
  // a flickering label takes its new letters by itself (flicker.ts)
  for (const [el, s] of texts) if (el) setFlickerText(el, s);
  $("[data-ui] .ui__nav")?.setAttribute("aria-label", d.sections);
  $$<HTMLButtonElement>("[data-page]").forEach((b, k) => b.setAttribute("aria-label", d.page(k + 1)));
  $(".ui__lang")?.setAttribute("aria-label", d.language);
  $$<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  const input = $<HTMLInputElement>(".ui__search input");
  if (input) {
    input.placeholder = d.search;
    input.dataset.word = d.search;
    input.setAttribute("aria-label", d.search);
  }
  layoutNav();

  if (!animate) return;
  // retyping claims every label: a run still going on any of them (the intro,
  // or the previous switch) is cancelled and never writes its old text back
  const targets = [...texts.map(([el]) => el), input].filter(Boolean) as (HTMLElement | HTMLInputElement)[];
  prepareTypewriter(targets, { stagger: 32, min: 14, max: 30 })();
}

/** Puts the current language in place before the preloader types the labels. */
export function bootLang() {
  applyUI(false);
  // after the units are updated (viewport.ts), never before: the widths depend on them
  onViewport(layoutNav);
}

export function setLang(next: Lang, { animate = true } = {}) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage can be unavailable */
  }
  applyUI(animate);
  // the faint columns flick back in with the new text
  const cols = $$(".bg__col");
  cols.forEach((c, i) => setFlickerText(c, columnText(i, c.dataset.en ?? "")));
  if (animate) gsap.fromTo(cols, { opacity: 0 }, { keyframes: { opacity: [0, 0.18, 0.04, 0.1] }, duration: 0.5, stagger: 0.07, ease: "steps(3)" });
  document.dispatchEvent(new CustomEvent("requiem:lang", { detail: lang }));
}

/** EN / ES buttons; a click anywhere else on the switch (the globe) toggles */
export function initLangSwitch() {
  // the menu hover pushes the items after the hovered word by 0.05em per letter of it
  const nav = $(".ui__nav");
  nav?.querySelectorAll<HTMLElement>("a").forEach((a) => {
    const push = () => nav.style.setProperty("--push", String((a.textContent ?? "").length));
    a.addEventListener("pointerenter", push);
    a.addEventListener("focus", push);
  });
  // the sections are not built yet: their "#" links must not jump or touch the address bar
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest?.<HTMLAnchorElement>('a[href="#"]');
    if (a) e.preventDefault();
  });
  const sw = $(".ui__lang");
  if (!sw) return;
  sw.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-lang]");
    setLang(b ? (b.dataset.lang as Lang) : lang === "en" ? "es" : "en");
  });
}
