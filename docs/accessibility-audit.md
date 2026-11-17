# Accessibility report

Earth Is Speaking is designed first for blind and low-vision people. This report lists what
was checked, how, and what is still missing. Target: WCAG 2.2 level AA. Date: 16 November 2026.

## Summary

| Check | Result |
|---|---|
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA + best practices), 38 app states | **0 violations** |
| Lighthouse 12.3, welcome page, mobile and desktop | Accessibility **100**, Best practices **100**, SEO **100**, Performance **99–100** |
| Contrast measured on the real rendered background of 119 text elements | **All pass**; lowest 5.27:1 (minimum 4.5:1 for normal text, 3:1 for large text) |
| Minimum text size | 16 px or more for all text (1rem = 18px), except the decorative "NASA SVS" credit on the layer cards |
| Screen-reader walkthrough by the team (NVDA + Chrome, 16 steps) | **Passed** |
| Sessions with blind and low-vision adults | **Next milestone**: protocol ready in `docs/guia-prueba-nvda.md` |

## States audited with axe-core

English and Spanish, each on desktop (1440×900) and mobile (390×844):
welcome screen; explorer with a point selected; each of the six layers (air temperature,
night lights, ocean currents, aerosols, forest height, lightning); the How to listen, Help,
About & methods, Options and Compare dialogs; the My Earth Song panel; the guided journey;
the 3D globe; audio-only mode; and the mobile bottom sheet.

## How contrast was measured

axe-core cannot decide contrast for text on gradients, pictures or translucent layers (it
marks them "needs review"). For every such element we hid the text, took a screenshot of the
real background behind its content box, and computed the WCAG contrast of the text colour
against the background, keeping the value reached over 98% of the background pixels (so a
single 1-pixel star of the welcome background does not decide the result). Elements covered
by another layer or outside the screen were skipped in that state and measured in another.

Palette pairs used for text (computed): white on Deep Blue #07173F 17.4:1; white on Electric
Blue #0042A6 9.0:1; white on Neon Blue #0960E1 5.6:1; Blue Yonder #2E96F5 on Deep Blue 5.7:1;
#C9D6F2 on #0B2560 9.9:1; Neon Yellow #EAEF07 on Deep Blue 14.0:1. White on Rocket Red
#E43700 is 4.3:1, so that pair is not used for text.

The layer cards show a crop of each NASA picture behind the text; the dark overlay never goes
below 76% opacity, which keeps the light text above 4.5:1 even over a white part of a picture.

## Keyboard and screen readers

- Skip link, landmarks (header, nav, main, aside), headings in order, `aria-live="polite"`
  region with a 300 ms pause so announcements do not pile up.
- The map and the globe are focusable `role="application"` elements with instructions linked
  by `aria-describedby`. Arrow keys move the map cursor 2° (Shift: 10°) or turn the globe 5°;
  Enter plays the point and keeps it as a marker.
- Shortcuts: Space play/pause, S stop, [ ] volume, 1–6 layers, / search, W where am I,
  I read the panel, R repeat, V voice, P play My Earth Song, G map/globe, H help.
- Search and Compare use the ARIA 1.2 combobox pattern; dialogs are native `<dialog>` elements
  that return focus when closed; the marker list is an ordered list whose rows read
  "Marker 3 of 12, Sahara, …" with Play, Rename and Delete buttons.
- Audio-only mode speaks every announcement once with the browser's speech synthesis, so the
  app can be used without a screen reader; hover preview is locked off there.
- Visible focus: 4 px Neon Yellow outline. Touch targets: 44 px or more.

## Deaf and hard-of-hearing users

Every sound has a written description ("High bright note: hot"), every spoken message is also
written on screen, and a small ring pulses with the sound level (brightness only when reduced
motion is requested).

## Motion

`prefers-reduced-motion` stops the welcome planet animation, the globe fly-to animation and
the pulse scaling. Nothing flashes more than three times per second.

## Known limits

- The team tested the app with NVDA in Chrome (16-step walkthrough, all passed). Sessions with
  blind and low-vision adults, and checks with JAWS, TalkBack and VoiceOver, are the next
  milestone; the protocol is in `docs/guia-prueba-nvda.md` (Spanish).
- Voice recognition only works where the browser offers the Web Speech API (Google Chrome);
  elsewhere the microphone button is hidden and typed search remains.
- The 3D globe needs WebGL; when it is not available, the app says so and the map does
  everything the globe does.

## Next steps

Sessions with blind and low-vision adults in Lima (associations and schools), following the
guide in `docs/guia-prueba-nvda.md`, and publishing what we learn here.

## How to reproduce

```
cd tools
npm install
cd ..
node tools/run.mjs tools/scenarios/audit.mjs      # axe-core on 38 states
node tools/run.mjs tools/scenarios/contrast.mjs   # contrast on the real background
node tools/lighthouse.mjs                         # Lighthouse (uses Microsoft Edge)
```
