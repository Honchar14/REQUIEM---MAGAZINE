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
 * layout; pages 2–5 are written for the new photos.
 */
export const SLIDES: Story[][] = [
  [
    {
      photo: "/media/news/02.webp",
      title: "Horoscopes",
      sub: "Nosferatu Robert Eggers",
      body: "Thanks to Mercury retrograde in Scorpio\nour ability to turn a blind eye and sweep\nthings under the rug is at an all-time low.\nWe’re connecting dots, revisiting conversations and mentally drafting devastating\nspeeches in.",
      date: "January 2026",
    },
    {
      photo: "/media/news/01.webp",
      title: "Cosmetics",
      sub: "Y2K frosted lipsticks",
      body: "Things are cooling down this October, and it's not just the weather. MAC is bringing the frost back, too. The beauty giant has revived its cult-classic Frost Lipstick collection, introducing a new line-up of pearlescent shades, the frosted lip\nOnce a staple of 90s make-up bags.",
      date: "March 2026",
    },
    {
      photo: "/media/news/03.webp",
      title: "Halloween",
      sub: "Gabe Gordon is howling",
      body: "Back in February, New York-based label Gabe Gordon presented its AW26 collection, Frostbite. It was a show that brought together two distinct references: 80s ice dancers and the cult horror movie An American Werewolf in London. The result was a series of cutesy looks.",
      date: "September 2026",
    },
    {
      photo: "/media/news/04.webp",
      title: "Harley Weir’s",
      sub: "Powerful vision of modern-day witches",
      body: "Throughout history, the stories of Snow White, Hansel and Gretel and countless other cautionary fairy tales have done much to make witches feared and loathed. Enter acclaimed photographer Harley Weir and designer Dilara Findikoglu’s Witch. Inspired by Matthew Scrote’s.",
      date: "November 2026",
    },
    {
      photo: "/media/news/05.webp",
      title: "struggling",
      sub: "Young Americans care",
      body: "Tomorrow, on November 3, millions of Americans will head to the polls to vote in the midterm elections, which fall halfway through a president’s term and heavily influence the power they have in the second half of their presidency. With the Republican Party currently.",
      date: "December 2026",
    },
  ],
  [
    {
      photo: "/media/news/s2-1.webp",
      title: "Disposable",
      sub: "27 frames, no second takes",
      body: "Phones made every party look the same: bright, sharp and instantly forgettable. So the cheap plastic camera is back in every clutch bag. You wind, you click, you wait two weeks for prints that come back blurry, overexposed and somehow closer to how the night felt.",
      date: "October 2026",
    },
    {
      photo: "/media/news/s2-2.webp",
      title: "Red room",
      sub: "Thrillers shot in a single colour",
      body: "This year's most talked-about thrillers share a palette, and it has one colour in it. Faces drown in red, rooms lose their edges and the audience loses any sense of what is safe. The trick is borrowed from the darkroom safelight, but on a big screen it still feels like an alarm.",
      date: "August 2026",
    },
    {
      photo: "/media/news/s2-3.webp",
      title: "Vulnus",
      sub: "Bruises, boxed and lit like relics",
      body: "Vulnus is Latin for wound, and the boxes in this still life wear theirs openly: purple and yellow marks printed straight onto the card, like evidence of something that happened in transit. Stacked in the dark under one hard light, packaging becomes a study of how bodies keep score.",
      date: "July 2026",
    },
    {
      photo: "/media/news/s2-4.webp",
      title: "Unplugged",
      sub: "One chair, one mic, no backing track",
      body: "After years of LED walls and choreography, the most exciting shows this season are almost empty. A wooden chair, a single spotlight, a microphone cable wrapped around one wrist. Without the spectacle there is nowhere to hide, and audiences pay to watch every note land.",
      date: "June 2026",
    },
    {
      photo: "/media/news/s2-5.webp",
      title: "Wired",
      sub: "Why the headphone cable came back",
      body: "Wireless earbuds promised freedom and delivered a drawer of dead batteries. Now the white cable is back, hanging from collars and tangled in hair, worn as much as a statement as a tool. It says you are listening to something, and that you would rather not be bothered while you do.",
      date: "May 2026",
    },
  ],
  [
    {
      photo: "/media/news/s3-1.webp",
      title: "Tailoring",
      sub: "Sharp shoulders, softer faces",
      body: "The new suit is cut like armour: shoulders built out to a hard line, a white shirt buttoned to the throat. But the men wearing it look nothing like bankers. Bleached mullets, smudged liner and drawn-on scars turn the most conservative garment in the wardrobe into a costume for outsiders.",
      date: "April 2026",
    },
    {
      photo: "/media/news/s3-2.webp",
      title: "Grillz",
      sub: "Jewellery you wear with a smile",
      body: "Gold and coloured stones clipped over the teeth used to belong to rap videos. Now they turn up in beauty shoots and on club kids from Lagos to London, worn with knitted bonnets and lace. The most wanted design is the opposite of subtle: every tooth a different colour.",
      date: "October 2026",
    },
    {
      photo: "/media/news/s3-3.webp",
      title: "Outerwear",
      sub: "The puffer as a uniform",
      body: "At bus stops, on estates and now on runways, the black puffer has become a kind of uniform: warm, anonymous and slightly intimidating. Worn with a silk durag and one thin chain, it says more about where you come from than any logo could. Designers are finally paying attention.",
      date: "January 2026",
    },
    {
      photo: "/media/news/s3-4.webp",
      title: "Guitars",
      sub: "Bedroom bands are getting loud",
      body: "They met at school, they rehearse in a garage that smells of petrol and none of them owns music software. A new generation of guitar bands is skipping the algorithm entirely, building an audience one sweaty pub gig at a time and printing its own T-shirts in the kitchen.",
      date: "February 2026",
    },
    {
      photo: "/media/news/s3-5.webp",
      title: "Fangs",
      sub: "The vampire is hungry again",
      body: "Every decade gets the vampire it deserves. Ours is not a brooding romantic but something feral: blue skin, yellow eyes and a mouth that opens far too wide. Low-budget horror has gone back to rubber teeth and stage make-up, and young audiences love seeing how the trick is done.",
      date: "October 2026",
    },
  ],
  [
    {
      photo: "/media/news/s4-1.webp",
      title: "Dosage",
      sub: "Costumes that come with a label",
      body: "This Halloween the best costumes are not monsters but products. A pill bottle worn as a hat, a dress moulded like a plastic cap, a label printed with a pun only your friends will get. Dressing up as packaging is a joke about how much of life now arrives in a box, with instructions.",
      date: "November 2026",
    },
    {
      photo: "/media/news/s4-2.webp",
      title: "Underworld",
      sub: "Bodies photographed in blue light",
      body: "Shot in caves, flooded quarries and bathrooms lit by one coloured bulb, a new wave of photography treats the body as part of the landscape. Skin turns the same blue as the rock, edges dissolve into mist, and the pictures feel less like portraits than like something half-remembered.",
      date: "March 2026",
    },
    {
      photo: "/media/news/s4-3.webp",
      title: "Nightlife",
      sub: "The flash is back on the dancefloor",
      body: "Club photographers spent years shooting in the dark to keep things moody. Now the on-camera flash is back, harsh and unflattering, catching sunglasses, sweat and the exact second someone pulls a face. These pictures are not about looking good. They prove you were there.",
      date: "December 2026",
    },
    {
      photo: "/media/news/s4-4.webp",
      title: "Splatter",
      sub: "Practical blood is winning again",
      body: "Digital gore is cheap, fast and instantly forgotten. Real stage blood is sticky, expensive and gets everywhere, which is exactly why young horror directors want it back. On set it changes how actors move and how crews behave, and on screen you can feel the weight of every drop.",
      date: "September 2026",
    },
    {
      photo: "/media/news/s4-5.webp",
      title: "The rally",
      sub: "Campaign events that feel like gigs",
      body: "Folding chairs, a banner taped under the ceiling and a handheld microphone: campaign events this season borrow more from comedy clubs than from conference halls. Speeches are shorter, rooms are smaller and the queue outside looks like the line for a gig.",
      date: "November 2026",
    },
  ],
  [
    {
      photo: "/media/news/s5-1.webp",
      title: "Oversized",
      sub: "The bag that swallowed the outfit",
      body: "The it-bag used to be small enough for a lipstick and a key. This year it is big enough for a duvet. Slouchy carryalls in crinkled leather are swung through city traffic like shopping, worn with ballet flats and a black vest, as if fashion were about carrying everything at once.",
      date: "June 2026",
    },
    {
      photo: "/media/news/s5-2.webp",
      title: "Retreat",
      sub: "Recording an album in the woods",
      body: "No studio, no producer, no phone signal. More young musicians are renting a cabin in the forest for a month and coming back with an album. The sound is rough, full of birds, creaking boards and wind through the window, and listeners seem to trust it more than anything made in the city.",
      date: "August 2026",
    },
    {
      photo: "/media/news/s5-3.webp",
      title: "Mascots",
      sub: "Everyone wants a soft monster",
      body: "Brands, festivals and football clubs are all chasing the same thing: a furry, faintly ridiculous creature people will queue to hug. The soft monster is the internet's favourite comfort object, and grown adults post selfies with one as if they had met a celebrity. Cute is a strategy now.",
      date: "July 2026",
    },
    {
      photo: "/media/news/s5-4.webp",
      title: "Low-rise",
      sub: "Waistbands, caps and cash on the bed",
      body: "The early 2000s are back in their least polished form: boxers showing over low-slung shorts, a patterned cap tilted to one side, crumpled notes fanned out for the camera. Young photographers are recreating old profile pictures, flash and all, and finding something honest in the swagger.",
      date: "May 2026",
    },
    {
      photo: "/media/news/s5-5.webp",
      title: "Crystal",
      sub: "Rhinestones worn as armour",
      body: "Hand-stitched crystals used to be saved for the red carpet. Now they cover tops, bras and whole dresses worn to birthday dinners and nightclubs. Under the flash every stone catches the light at once and turns the body into a glitterball. It is a look that dares you to ignore it.",
      date: "December 2026",
    },
  ],
];
