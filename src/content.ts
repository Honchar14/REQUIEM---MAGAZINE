/** Background columns of type (Figma position: x and first-line baseline b). Flicker only during the preloader. */
export const BG_COLUMNS = [
  {
    x: 243, b: 199,
    text: "REQUIEM started as a photocopied zine passed around in clubs and art schools. Today it is a quarterly magazine and an online archive, but the idea has not changed. We look for the people who are making culture before anyone gives them permission to. They work in basements, squats, shared studios and bedrooms. They sew, paint, record, film and organise with almost no money and a lot of stubbornness. We treat every story like a case file.",
  },
  {
    x: 485, b: 602,
    text: "We go there, we meet them, we take notes and we photograph what we find. We do not write about trends, because trends are what happens after the interesting part is over. Each issue is a set of files: interviews, portraits, long reads and one list of names to watch. Read them in order or open them at random. Either way, you will meet someone you have not heard of yet. Give it a year and everyone will know their name.",
  },
  {
    x: 1213, b: 6,
    text: "For a decade, fashion sold perfection: clean lines, invisible stitching, logos you could read from across the street. This season, the inside of the garment moved to the outside. At graduate shows in Antwerp, Warsaw and London, more than half the collections used raw edges. Some designers cut the hems off by hand after the piece was finished. Others left the white basting thread in place, the temporary stitches tailors usually pull out before anyone sees them. A seam on the outside admits how a thing was made, who made it and how long it took. In a world of perfect surfaces, that admission feels almost radical.",
  },
  {
    x: 1698, b: 739,
    text: "Ten years ago, a film about growing up meant a summer, a first crush and a borrowed car. Now it means a damp flat, a night shift and something knocking inside the walls. A new wave of young directors is using horror to talk about what their generation actually fears: rent, isolation, a body that keeps changing and a future that keeps being postponed.",
  },
];

/**
 * The photo strip on the main screen: five slots, left to right, at these
 * x positions of the 1920×1080 frame (y 536, 380×390 each). The preloader
 * deals its cards out of order: card i lands in slot SLOT_OF_CARD[i].
 */
export const SLOT_X = [-2, 384, 770, 1156, 1542];
export const STRIP_Y = 536;
export const SLOT_OF_CARD = [1, 0, 2, 3, 4];

/** News photos used by the preloader stack and the hero strip. */
export const NEWS_PHOTOS = [
  "/media/news/01.webp",
  "/media/news/02.webp",
  "/media/news/03.webp",
  "/media/news/04.webp",
  "/media/news/05.webp",
];

/** One story in the "Last news" strip: the photo and the hover card. */
export type Story = { photo: string; title: string; sub: string; body: string; date: string; href?: string };

/**
 * Five pages of five stories, each page listed left to right as it appears on
 * screen (slots at x −2, 384, 770, 1156, 1542). Page 1 is the copy from the
 * layout, cut down; pages 2–5 are written for the new photos. Bodies are kept
 * to about 120 characters so they fit four lines at 18px.
 */
export const SLIDES: Story[][] = [
  [
    {
      photo: "/media/news/02.webp",
      title: "Horoscopes",
      sub: "Nosferatu Robert Eggers",
      body: "Mercury retrograde in Scorpio means nothing gets swept under the rug. We’re connecting dots and drafting speeches.",
      date: "January 2026",
    },
    {
      photo: "/media/news/01.webp",
      title: "Cosmetics",
      sub: "Y2K frosted lipsticks",
      body: "MAC is bringing the frost back: the cult Frost Lipstick returns in pearlescent shades, a staple of 90s make-up bags.",
      date: "March 2026",
    },
    {
      photo: "/media/news/03.webp",
      title: "Halloween",
      sub: "Gabe Gordon is howling",
      body: "Gabe Gordon’s AW26 show, Frostbite, crossed 80s ice dancers with An American Werewolf in London. Cutesy horror.",
      date: "September 2026",
    },
    {
      photo: "/media/news/04.webp",
      title: "Harley Weir’s",
      sub: "Powerful vision of modern-day witches",
      body: "Photographer Harley Weir and designer Dilara Findikoglu reclaim the witch, the villain of every cautionary fairy tale.",
      date: "November 2026",
    },
    {
      photo: "/media/news/05.webp",
      title: "struggling",
      sub: "Young Americans care",
      body: "On November 3, millions of Americans head to the polls for the midterms, a vote that shapes the rest of a presidency.",
      date: "December 2026",
    },
  ],
  [
    {
      photo: "/media/news/s2-1.webp",
      title: "Disposable",
      sub: "27 frames, no second takes",
      body: "Phones made every party look the same. The plastic camera is back: 27 frames, a two-week wait, blurry prints that feel true.",
      date: "October 2026",
    },
    {
      photo: "/media/news/s2-2.webp",
      title: "Red room",
      sub: "Thrillers shot in a single colour",
      body: "This year’s thrillers are shot in one colour. Faces drown in red, rooms lose their edges and nothing feels safe.",
      date: "August 2026",
    },
    {
      photo: "/media/news/s2-3.webp",
      title: "Vulnus",
      sub: "Bruises, boxed and lit like relics",
      body: "Vulnus is Latin for wound. These boxes wear bruises printed onto the card, lit like evidence under one hard light.",
      date: "July 2026",
    },
    {
      photo: "/media/news/s2-4.webp",
      title: "Unplugged",
      sub: "One chair, one mic, no backing track",
      body: "No LED walls, no choreography: one chair, one spotlight, one mic. With nowhere to hide, every note has to land.",
      date: "June 2026",
    },
    {
      photo: "/media/news/s2-5.webp",
      title: "Wired",
      sub: "Why the headphone cable came back",
      body: "Wireless earbuds left us a drawer of dead batteries. The white cable is back, worn as a statement: do not disturb.",
      date: "May 2026",
    },
  ],
  [
    {
      photo: "/media/news/s3-1.webp",
      title: "Tailoring",
      sub: "Sharp shoulders, softer faces",
      body: "Suits cut like armour, worn with bleached mullets and drawn-on scars: the most conservative garment, made for outsiders.",
      date: "April 2026",
    },
    {
      photo: "/media/news/s3-2.webp",
      title: "Grillz",
      sub: "Jewellery you wear with a smile",
      body: "Gold and coloured stones over the teeth have moved from rap videos to beauty shoots. Most wanted: every tooth different.",
      date: "October 2026",
    },
    {
      photo: "/media/news/s3-3.webp",
      title: "Outerwear",
      sub: "The puffer as a uniform",
      body: "A black puffer, a silk durag and one thin chain: a street uniform that says more about where you’re from than a logo.",
      date: "January 2026",
    },
    {
      photo: "/media/news/s3-4.webp",
      title: "Guitars",
      sub: "Bedroom bands are getting loud",
      body: "No laptops, no algorithm: a new wave of guitar bands builds its audience one sweaty pub gig at a time.",
      date: "February 2026",
    },
    {
      photo: "/media/news/s3-5.webp",
      title: "Fangs",
      sub: "The vampire is hungry again",
      body: "Our vampire is not a brooding romantic but something feral: blue skin, yellow eyes, rubber teeth, a mouth too wide.",
      date: "October 2026",
    },
  ],
  [
    {
      photo: "/media/news/s4-1.webp",
      title: "Dosage",
      sub: "Costumes that come with a label",
      body: "This Halloween the best costumes are products: a pill bottle for a hat, a dress like a plastic cap, a label with a pun.",
      date: "November 2026",
    },
    {
      photo: "/media/news/s4-2.webp",
      title: "Underworld",
      sub: "Bodies photographed in blue light",
      body: "Caves, flooded quarries, one blue bulb: new photography treats the body as landscape, half portrait, half dream.",
      date: "March 2026",
    },
    {
      photo: "/media/news/s4-3.webp",
      title: "Nightlife",
      sub: "The flash is back on the dancefloor",
      body: "The on-camera flash is back on the dancefloor: harsh, unflattering and proof that you were there.",
      date: "December 2026",
    },
    {
      photo: "/media/news/s4-4.webp",
      title: "Splatter",
      sub: "Practical blood is winning again",
      body: "Digital gore is forgotten in seconds. Young horror directors want real stage blood back: sticky, messy, heavy.",
      date: "September 2026",
    },
    {
      photo: "/media/news/s4-5.webp",
      title: "The rally",
      sub: "Campaign events that feel like gigs",
      body: "Folding chairs, a taped-up banner, a handheld mic: campaign events now borrow more from comedy clubs than conference halls.",
      date: "November 2026",
    },
  ],
  [
    {
      photo: "/media/news/s5-1.webp",
      title: "Oversized",
      sub: "The bag that swallowed the outfit",
      body: "The it-bag used to hold a lipstick and a key. Now it could hold a duvet: slouchy, crinkled, swung through traffic.",
      date: "June 2026",
    },
    {
      photo: "/media/news/s5-2.webp",
      title: "Retreat",
      sub: "Recording an album in the woods",
      body: "No studio, no signal: young musicians rent a cabin for a month and come back with an album full of birds and creaks.",
      date: "August 2026",
    },
    {
      photo: "/media/news/s5-3.webp",
      title: "Mascots",
      sub: "Everyone wants a soft monster",
      body: "Brands and festivals all want the same thing: a furry, faintly ridiculous creature people queue to hug. Cute is strategy.",
      date: "July 2026",
    },
    {
      photo: "/media/news/s5-4.webp",
      title: "Low-rise",
      sub: "Waistbands, caps and cash on the bed",
      body: "The early 2000s are back unpolished: boxers over low-slung shorts, a tilted cap and crumpled notes fanned out for the flash.",
      date: "May 2026",
    },
    {
      photo: "/media/news/s5-5.webp",
      title: "Crystal",
      sub: "Rhinestones worn as armour",
      body: "Hand-stitched crystals have left the red carpet for birthday dinners and clubs. Under the flash the body is a glitterball.",
      date: "December 2026",
    },
  ],
];
