/* Pixel-Krankenschwester aus „Diabetes Run!“ (Lernkarten-Spiel, selbst gezeichnet; Quelle: lernkarten/docs/spiel/pixel.js)
 * – für das Live-Rennen auf der Lehrkraft-Seite. Jedes Zeichen ist ein Pixel, „.“ ist durchsichtig.
 * lauf(): die vier Laufbilder nebeneinander (Sprite-Streifen), jubel(): Sprung-Bild für den Zieleinlauf. */
window.ILSSchwester = (() => {
  'use strict';
  const FARBEN = {"O": "#1C1525", "W": "#FFFFFF", "w": "#DCE3E7", "s": "#BEC7CE", "K": "#F76892", "k": "#D34677", "H": "#964536", "h": "#702F26", "F": "#FCD2B5", "c": "#FAA2A8"};
  const POSEN = {
    "lauf1": [
      "......OOOOOO.....",
      ".....OwWWWWWO....",
      "....OwWWWKWWWO...",
      "....OwWWKKKWWO...",
      "....OwwWWKWWWO...",
      "...OHHwWWWWWHHO..",
      "..OHHHHHHHHHHHHO.",
      ".OhHHHHHFFFFFHHO.",
      "OhhHHHHFFFFFFFFO.",
      "OhFFHHHFFFOFFOFO.",
      "OhFFHHHFFFOFFOFO.",
      "OhhHHHHFFcFFcFFO.",
      ".OOHHHHFFFFFFFO..",
      "..OOHHHFFFFFOO...",
      "....OOWWKKWO.....",
      "..OOFWWWWKWWO.OO.",
      ".OFFOwOwWWWOFOFFO",
      "OFFOOOOwWWWOFFFFO",
      "OFFO.OKKKKKOOFFO.",
      ".OO.OwWWWWWO.OO..",
      "...OwwWWWWWWO....",
      "....OwwwWWWWO....",
      "..OOssOOOwwO.....",
      ".OsssO...OWWO....",
      "OkssO....OWWOOO..",
      "OkkO......OWKKKO.",
      "OkkO......OkkKKO.",
      ".OO........OOOO.."
    ],
    "lauf2": [
      "......OOOOOO....",
      ".....OwWWWWWO...",
      "....OwWWWKWWWO..",
      "....OwWWKKKWWO..",
      "....OwwWWKWWWO..",
      "...OHHwWWWWWHHO.",
      "..OHHHHHHHHHHHHO",
      ".OhHHHHHFFFFFHHO",
      "OhhHHHHFFFFFFFFO",
      "OhFFHHHFFFOFFOFO",
      "OhFFHHHFFFOFFOFO",
      "OhhHHHHFFcFFcFFO",
      ".OOHHHHFFFFFFFO.",
      "..OOHHHFFFFFOO..",
      "....OOWWKKWOO...",
      "....OWWwWKWWO...",
      "...OFFOOwWWOFOO.",
      "..OFFOOwWWWOFFFO",
      "..OFFOKKKKKOOFFO",
      "...OOwwWWWWWOOO.",
      "....OwWWWWWWWO..",
      "...OwWWWwwwOO...",
      "....OOssOwwO....",
      ".....OssOwwO....",
      "....OksOwwO.....",
      "....OkkOKKO.....",
      ".....OkkOkKO....",
      ".....OOO.OOO...."
    ],
    "lauf3": [
      "......OOOOOO.....",
      ".....OwWWWWWO....",
      "....OwWWWKWWWO...",
      "....OwWWKKKWWO...",
      "....OwwWWKWWWO...",
      "...OHHwWWWWWHHO..",
      "..OHHHHHHHHHHHHO.",
      ".OhHHHHHFFFFFHHO.",
      "OhhHHHHFFFFFFFFO.",
      "OhFFHHHFFFOFFOFO.",
      "OhFFHHHFFFOFFOFO.",
      "OhhHHHHFFcFFcFFO.",
      ".OOHHHHFFFFFFFO..",
      "..OOHHHFFFFFOO...",
      "....OOWWKKWO.....",
      "...OOWwWWKWWO.OO.",
      "..OFFOwWwWWwOOFFO",
      ".OFFOOOwWWWOFFFFO",
      "OFFO.OKKKKKOFFOO.",
      "OFFO.OwWWWwO.O...",
      ".OO.OwWWWWWWO....",
      "...OwwWwWWWWO....",
      "...OOWWOOssO.....",
      "..OWWWO..OssO....",
      ".OKWWO...OsssOO..",
      ".OKKO.....OskkkO.",
      ".OKKO.....OkkkkO.",
      "..OO......OOOOO.."
    ],
    "lauf4": [
      "......OOOOOO....",
      ".....OwWWWWWO...",
      "....OwWWWKWWWO..",
      "....OwWWKKKWWO..",
      "....OwwWWKWWWO..",
      "...OHHwWWWWWHHO.",
      "..OHHHHHHHHHHHHO",
      ".OhHHHHHFFFFFHHO",
      "OhhHHHHFFFFFFFFO",
      "OhFFHHHFFFOFFOFO",
      "OhFFHHHFFFOFFOFO",
      "OhhHHHHFFcFFcFFO",
      ".OOHHHHFFFFFFFO.",
      "..OOHHHFFFFFOO..",
      "....OOWWKKWO....",
      "...OOWWwWKWWO...",
      "..OFFwOwWWWOFOO.",
      ".OFFOOOwWWWOFFFO",
      ".OFFOOKKKKKOOFFO",
      "..OO.OwWWWWO.OO.",
      "....OwwWWWWWO...",
      "...OwwWWWwwwO...",
      "....OOWssssO....",
      ".....OWsOssO....",
      "....OKWOOssO....",
      "....OKKOOkkO....",
      "....OOKO.OkkO...",
      ".....OO..OkkO...",
      "..........OOO..."
    ],
    "sprung": [
      "......OOOOOO.......",
      ".....OwWWWWWO......",
      "....OwWWWKWWWO.....",
      "....OwWWKKKWWO.....",
      "....OwwWWKWWWO.....",
      "...OHHwWWWWWHHO....",
      "..OHHHHHHHHHHHHO...",
      ".OhHHHHHFFFFFHHO...",
      "OhhHHHHFFFFFFFFO...",
      "OhFFHHHFFFOFFOFO...",
      "OhFFHHHFFFOFFOFO...",
      "OhhHHHHFFcFFcFFOOO.",
      ".OOHHHHFFFFFFFOFFO.",
      "..OOHHHFFFFFOOOFFFO",
      "....OOWWKKWOOWFFFO.",
      "...OFWWwWKWWOWFOO..",
      "..OFFwOwwWWWOOO....",
      ".OFFOOOwWWWO.......",
      ".OFFO.OKKKKKO......",
      "..OO.OwWWWWWwO.....",
      ".....OwWWWWOWWO....",
      "....OwwWWWOWWO.....",
      ".....OwwOOKKO......",
      ".....OwWOOKKO......",
      ".....OWWO.OKO......",
      "....OWWO...O.......",
      "....OKKO...........",
      "....OKKO...........",
      ".....OKO...........",
      "......O............"
    ]
  };
  function streifen(namen) {
    const breite = Math.max(...namen.map((n) => Math.max(...POSEN[n].map((z) => z.length))));
    const hoehe = Math.max(...namen.map((n) => POSEN[n].length));
    const c = document.createElement('canvas');
    c.width = breite * namen.length;
    c.height = hoehe;
    const ctx = c.getContext('2d');
    namen.forEach((n, bild) => {
      const raster = POSEN[n];
      const unten = hoehe - raster.length;   // alle Bilder stehen auf derselben Fußlinie
      raster.forEach((zeile, y) => [...zeile].forEach((z, x) => {
        if (!FARBEN[z]) return;
        ctx.fillStyle = FARBEN[z];
        ctx.fillRect(bild * breite + x, unten + y, 1, 1);
      }));
    });
    return { url: c.toDataURL('image/png'), breite, hoehe, bilder: namen.length };
  }
  return { lauf: () => streifen(['lauf1', 'lauf2', 'lauf3', 'lauf4']), jubel: () => streifen(['sprung']) };
})();
