import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "client", "public", "assets");

const C = {
  navy: "#031d38",
  navy2: "#062b50",
  navy3: "#0a3d6e",
  electric: "#18bfea",
  ice: "#edf5f6",
  steel: "#91a6b2",
  graphite: "#20272d",
  green: "#59da9b",
  cyan: "#48c6e8",
};

const defs = id => `
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.navy}"/>
      <stop offset="0.58" stop-color="${C.navy2}"/>
      <stop offset="1" stop-color="#010b15"/>
    </linearGradient>
    <linearGradient id="metal-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#556875"/><stop offset="0.5" stop-color="#c5d2d8"/><stop offset="1" stop-color="#43545f"/>
    </linearGradient>
    <pattern id="grid-${id}" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0V64" fill="none" stroke="#9cb7c6" stroke-opacity=".1"/>
    </pattern>
    <pattern id="stripe-${id}" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="18" height="36" fill="${C.electric}" fill-opacity=".08"/>
    </pattern>
    <filter id="shadow-${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".38"/>
    </filter>
  </defs>`;

const frame = (
  id,
  title,
  subtitle,
  body,
  width = 1600,
  height = 900
) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${id} desc-${id}">
  <title id="title-${id}">${title}</title><desc id="desc-${id}">${subtitle}</desc>
  ${defs(id)}
  <rect width="100%" height="100%" fill="url(#bg-${id})"/>
  <rect width="100%" height="100%" fill="url(#grid-${id})"/>
  <path d="M0 ${height * 0.78} L${width * 0.62} ${height * 0.08} H${width} V${height} H0Z" fill="url(#stripe-${id})"/>
  <path d="M0 22H${width * 0.34}L${width * 0.31} 48H0Z" fill="${C.electric}"/>
  ${body}
  <g font-family="Arial Narrow,Arial,sans-serif" letter-spacing="4">
    <text x="64" y="${height - 70}" fill="${C.ice}" font-size="34" font-weight="800">${title}</text>
    <text x="66" y="${height - 34}" fill="${C.electric}" font-size="16" font-weight="700">${subtitle}</text>
  </g>
</svg>`;

const xbMark = (
  x,
  y,
  scale = 1
) => `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shadow-logo)">
  <path d="M0 0H176L126 58L176 116H112L88 88L64 116H0L50 58Z" fill="${C.electric}"/>
  <path d="M190 0H310C358 0 382 22 382 56C382 75 372 90 354 99C378 106 390 124 390 148C390 188 360 210 306 210H190ZM252 48V82H304C316 82 322 76 322 65S316 48 304 48ZM252 126V162H312C325 162 332 156 332 144C332 132 325 126 312 126Z" fill="${C.ice}"/>
</g>`;

const wheel = (
  x,
  y,
  r,
  accent = C.electric
) => `<g transform="translate(${x} ${y})">
  <circle r="${r}" fill="#0a0d10" stroke="#4b5961" stroke-width="${Math.max(6, r * 0.12)}"/>
  <circle r="${r * 0.48}" fill="#91a6b2" stroke="${accent}" stroke-width="${Math.max(4, r * 0.06)}"/>
  <circle r="${r * 0.12}" fill="${accent}"/>
</g>`;

const truck = (
  x,
  y,
  scale = 1,
  accent = C.electric
) => `<g transform="translate(${x} ${y}) scale(${scale})">
  <path d="M40 82H360V194H40Z" fill="#697b86"/><path d="M360 112H470L520 158V194H360Z" fill="${C.navy3}"/>
  <path d="M386 124H454L484 154H386Z" fill="#8fc7db"/><rect x="58" y="100" width="274" height="14" fill="${accent}"/>
  ${wheel(116, 202, 42, accent)}${wheel(324, 202, 42, accent)}${wheel(436, 202, 42, accent)}
</g>`;

const assets = new Map();

assets.set(
  "logo-symbol.svg",
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Símbolo XB Pneus">
  ${defs("logo")}
  <rect width="512" height="512" rx="76" fill="${C.navy}"/><path d="M0 400L350 0H512V512H0Z" fill="${C.navy2}"/>
  <path d="M58 126H238L183 256L238 386H166L133 309L100 386H28L83 256Z" fill="${C.electric}"/>
  <path d="M257 126H386C447 126 480 153 480 202C480 229 467 248 444 259C469 270 483 291 483 321C483 366 451 386 390 386H257ZM326 184V230H382C400 230 409 222 409 207S400 184 382 184ZM326 282V328H392C411 328 420 321 420 305S411 282 392 282Z" fill="${C.ice}"/>
  <path d="M55 430H457" stroke="${C.electric}" stroke-width="14"/><text x="256" y="472" fill="${C.ice}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="800" letter-spacing="8">PNEUS</text>
</svg>`
);

assets.set(
  "tire-token.svg",
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Pneu coletável XB">
  ${defs("token")}
  <circle cx="256" cy="256" r="232" fill="${C.navy}" stroke="${C.electric}" stroke-width="12"/>
  <circle cx="256" cy="256" r="154" fill="#0b0f13" stroke="#47545c" stroke-width="44"/>
  <g stroke="${C.steel}" stroke-width="10" opacity=".62">${Array.from({ length: 12 }, (_, i) => `<path d="M256 80V128" transform="rotate(${i * 30} 256 256)"/>`).join("")}</g>
  <circle cx="256" cy="256" r="84" fill="${C.electric}"/><text x="256" y="280" text-anchor="middle" fill="${C.navy}" font-family="Arial,sans-serif" font-size="72" font-weight="900">XB</text>
</svg>`
);

assets.set(
  "reference.svg",
  frame(
    "race",
    "ROTA XB",
    "ADERÊNCIA • RESISTÊNCIA • ESCALA",
    `
  <path d="M525 900L740 250H860L1115 900Z" fill="#242b30"/>
  <path d="M648 900L773 250M990 900L827 250" stroke="#f1f4f5" stroke-width="12" stroke-dasharray="72 56" opacity=".8"/>
  <path d="M510 900L730 250M1126 900L870 250" stroke="${C.electric}" stroke-width="9"/>
  <g opacity=".75">${Array.from({ length: 10 }, (_, i) => `<rect x="${40 + i * 154}" y="${270 + (i % 3) * 30}" width="92" height="${170 + (i % 4) * 44}" fill="#102f49" stroke="#365a73"/><g fill="${C.electric}" opacity=".45">${Array.from({ length: 6 }, (_, j) => `<rect x="${52 + i * 154 + (j % 2) * 34}" y="${292 + (i % 3) * 30 + Math.floor(j / 2) * 38}" width="17" height="18"/>`).join("")}</g>`).join("")}</g>
  ${truck(555, 522, 0.95)}
  <g transform="translate(1240 180)"><rect width="270" height="170" fill="${C.navy}" stroke="${C.electric}" stroke-width="8"/><text x="135" y="78" fill="${C.ice}" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="900">XBPNEUS</text><text x="135" y="120" fill="${C.electric}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">TURBO RACING</text></g>
`
  )
);

assets.set(
  "billboard.svg",
  frame(
    "billboard",
    "XBPNEUS",
    "GESTÃO INTELIGENTE DE PNEUS",
    `
  <g transform="translate(210 150)" filter="url(#shadow-billboard)"><rect width="1180" height="470" rx="12" fill="${C.navy}" stroke="${C.electric}" stroke-width="18"/><path d="M0 365L380 0H1180V470H0Z" fill="${C.navy2}" opacity=".72"/><text x="590" y="245" text-anchor="middle" fill="${C.ice}" font-family="Arial,sans-serif" font-size="138" font-weight="900">XB <tspan fill="${C.electric}">PNEUS</tspan></text><text x="590" y="326" text-anchor="middle" fill="${C.ice}" font-family="Arial,sans-serif" font-size="30" letter-spacing="12">DO PEDAL AO PLANETA</text></g>
  <rect x="760" y="620" width="80" height="220" fill="url(#metal-billboard)"/>
`
  )
);

assets.set(
  "asphalt.svg",
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#272d31"/>
  <filter id="noise"><feTurbulence baseFrequency=".65" numOctaves="4" seed="22"/><feColorMatrix values=".18 0 0 0 0  0 .18 0 0 0  0 0 .18 0 0  0 0 0 .55 0"/></filter>
  <rect width="512" height="512" filter="url(#noise)" opacity=".55"/>
  <path d="M30 100L120 72M220 184L302 142M380 92L470 66M44 340L130 310M236 414L322 376M384 300L466 266" stroke="#647078" stroke-width="5" opacity=".32"/>
</svg>`
);

assets.set(
  "vehicle-progression.svg",
  frame(
    "fleet",
    "EVOLUÇÃO DA FROTA",
    "BICICLETA → MOTO → UTILITÁRIO → CAMINHÃO → PLANETÁRIO",
    `
  <path d="M120 650H1490" stroke="${C.electric}" stroke-width="9"/><path d="M120 690H1490" stroke="#86a3b3" stroke-width="2"/>
  <g fill="none" stroke="${C.electric}" stroke-width="14"><circle cx="170" cy="575" r="48"/><circle cx="350" cy="575" r="48"/><path d="M170 575L240 480L350 575L260 575L310 465M240 480L310 465"/></g>
  <g transform="translate(430 390) scale(.58)">${truck(0, 0, 1, C.cyan)}</g>
  <g transform="translate(720 360) scale(.72)">${truck(0, 0, 1, C.green)}</g>
  <g transform="translate(1040 320) scale(.88)">${truck(0, 0, 1, C.electric)}</g>
  <g transform="translate(1390 410)"><circle r="105" fill="none" stroke="${C.electric}" stroke-width="16"/><path d="M-68 0H68M0-68V68M-48-48L48 48M48-48L-48 48" stroke="${C.ice}" stroke-width="9"/></g>
`
  )
);

assets.set(
  "garage-hub.svg",
  frame(
    "garage",
    "CENTRO DE EVOLUÇÃO",
    "OFICINA • FROTA • COMPOSTOS",
    `
  <g transform="translate(125 128)" filter="url(#shadow-garage)"><path d="M0 190L220 0H1110L1280 190V590H0Z" fill="#15364c" stroke="#6e8795" stroke-width="8"/><rect x="120" y="220" width="610" height="370" fill="#20272d" stroke="${C.electric}" stroke-width="8"/><g stroke="#596a74" stroke-width="8">${Array.from({ length: 7 }, (_, i) => `<path d="M${150 + i * 85} 220V590"/>`).join("")}</g><rect x="850" y="245" width="290" height="210" fill="${C.navy}" stroke="${C.electric}" stroke-width="8"/><text x="995" y="360" text-anchor="middle" fill="${C.ice}" font-family="Arial,sans-serif" font-size="54" font-weight="900">XB</text></g>
  ${truck(360, 520, 1.2)}
  <g transform="translate(1250 560)">${wheel(0, 0, 95)}${wheel(155, 0, 95, C.cyan)}</g>
`
  )
);

const baseScene = (id, title, subtitle, tier, accent, extras = "") =>
  frame(
    id,
    title,
    subtitle,
    `
  <g transform="translate(800 400)" filter="url(#shadow-${id})">
    <path d="M-630 120L0-240L630 120L0 480Z" fill="#17384d" stroke="#5a7180" stroke-width="8"/>
    <path d="M-520 110L0-185L520 110L0 405Z" fill="#22313a" stroke="${accent}" stroke-width="5"/>
    ${Array.from({ length: tier + 2 }, (_, i) => {
      const x = -360 + (i % 4) * 240;
      const y = -40 + Math.floor(i / 4) * 150;
      const h = 100 + (i % 3) * 48;
      return `<g transform="translate(${x} ${y})"><path d="M0 30L80-15L160 30L80 75Z" fill="${accent}" opacity=".3"/><path d="M0 30V${30 + h}L80 ${75 + h}V75Z" fill="#425663"/><path d="M160 30V${30 + h}L80 ${75 + h}V75Z" fill="#293c49"/><path d="M0 30L80-15L160 30L80 75Z" fill="#78909c"/><rect x="68" y="${82 + h * 0.25}" width="24" height="${h * 0.5}" fill="${C.electric}"/></g>`;
    }).join("")}
    <g transform="translate(-170 230) scale(.64)">${truck(0, 0, 1, accent)}</g>
  </g>${extras}
`
  );

assets.set(
  "base-local.svg",
  baseScene(
    "local",
    "PÁTIO LOCAL XB",
    "CIDADES • PRIMEIROS CONTRATOS",
    1,
    C.electric
  )
);
assets.set(
  "base-regional.svg",
  baseScene(
    "regional",
    "CENTRAL REGIONAL",
    "ESTADOS • CORREDORES LOGÍSTICOS",
    3,
    C.green
  )
);
assets.set(
  "base-global.svg",
  baseScene(
    "global",
    "MEGAHUB GLOBAL",
    "PAÍSES • REDE INTERCONTINENTAL",
    5,
    C.cyan,
    `<g transform="translate(1270 170)"><circle r="105" fill="none" stroke="${C.cyan}" stroke-width="8"/><ellipse rx="105" ry="42" fill="none" stroke="${C.ice}" stroke-width="4"/><path d="M0-105V105M-74-74L74 74M74-74L-74 74" stroke="${C.ice}" stroke-width="4"/></g>`
  )
);
assets.set(
  "base-planetary.svg",
  baseScene(
    "planetary-base",
    "CENTRAL PLANETÁRIA",
    "MUNDOS • REDE SOLAR XB",
    6,
    C.electric,
    `<g transform="translate(1300 185)"><circle r="122" fill="${C.navy3}"/><path d="M-100-18Q0 40 100-18M-82 48Q0 90 82 48" fill="none" stroke="${C.steel}" stroke-width="12"/><ellipse rx="174" ry="44" fill="none" stroke="${C.electric}" stroke-width="8" transform="rotate(-12)"/></g>`
  )
);

assets.set(
  "planetary-hub.svg",
  frame(
    "planet",
    "REDE SOLAR XB",
    "DA ESTRADA AOS NOVOS MUNDOS",
    `
  <circle cx="1240" cy="420" r="350" fill="${C.navy3}"/><path d="M930 320Q1230 500 1540 320M970 520Q1230 660 1500 520" fill="none" stroke="${C.steel}" stroke-width="32" opacity=".56"/>
  <ellipse cx="1240" cy="420" rx="480" ry="118" fill="none" stroke="${C.electric}" stroke-width="15" transform="rotate(-10 1240 420)"/>
  <g fill="${C.ice}">${Array.from({ length: 40 }, (_, i) => `<circle cx="${45 + ((i * 137) % 1500)}" cy="${65 + ((i * 83) % 680)}" r="${2 + (i % 4)}" opacity="${0.35 + (i % 5) * 0.12}"/>`).join("")}</g>
  <g transform="translate(270 290)"><path d="M0 180L250 20L500 180L250 340Z" fill="#1d3d50" stroke="${C.cyan}" stroke-width="8"/><path d="M125 180L250 100L375 180L250 260Z" fill="${C.electric}" opacity=".75"/><path d="M230 5H270V100H230Z" fill="${C.ice}"/></g>
`
  )
);

assets.set(
  "building-evolution.svg",
  frame(
    "buildings",
    "EVOLUÇÃO DA CENTRAL",
    "FUNDAÇÃO → OPERAÇÃO → CENTRO AVANÇADO",
    `
  ${[0, 1, 2]
    .map(n => {
      const x = 130 + n * 490;
      const h = 160 + n * 105;
      return `<g transform="translate(${x} ${610 - h})"><rect width="360" height="${h}" fill="#17384d" stroke="${n === 2 ? C.electric : C.steel}" stroke-width="8"/><path d="M0 0L180-90L360 0L180 90Z" fill="${n === 2 ? C.electric : "#6f8794"}" opacity="${n === 2 ? 0.72 : 0.5}"/><g fill="${C.electric}">${Array.from({ length: (n + 2) * 3 }, (_, i) => `<rect x="${40 + (i % 3) * 105}" y="${50 + Math.floor(i / 3) * 60}" width="48" height="28"/>`).join("")}</g><text x="180" y="${h + 70}" text-anchor="middle" fill="${C.ice}" font-family="Arial,sans-serif" font-size="26" font-weight="800">${["FUNDAÇÃO", "OPERAÇÃO", "AVANÇADO"][n]}</text></g>`;
    })
    .join("")}
`
  )
);

assets.set(
  "tire-compounds.svg",
  frame(
    "compounds",
    "COMPOSTOS XB",
    "URB • WET • PRO • MAX • TRR • PX",
    `
  <g transform="translate(165 380)">${[
    ["URB", C.electric],
    ["WET", C.cyan],
    ["PRO", "#5aa7e8"],
    ["MAX", C.green],
    ["TRR", C.steel],
    ["PX", "#b8d9ff"],
  ]
    .map(
      ([code, color], i) =>
        `<g transform="translate(${i * 250} 0)"><circle r="104" fill="#0b0f13" stroke="${color}" stroke-width="18"/><circle r="52" fill="#33434d" stroke="${C.ice}" stroke-width="6"/><text y="10" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="34" font-weight="900">${code}</text><path d="M-75-72L-50-98M-35-98L-10-72M10-72L35-98M50-98L75-72" stroke="${C.steel}" stroke-width="10"/></g>`
    )
    .join("")}</g>
`
  )
);

assets.set(
  "route-conditions.svg",
  frame(
    "conditions",
    "CONDIÇÕES DE ROTA",
    "PREVISÃO OPERACIONAL EM TEMPO REAL",
    `
  <g transform="translate(90 190)">${[
    ["ABERTO", C.electric, "☀"],
    ["CHUVA", C.cyan, "☂"],
    ["CALOR", C.navy3, "♨"],
    ["POEIRA", C.steel, "≋"],
    ["FRIO", "#b8d9ff", "❄"],
    ["TEMPESTADE", "#9a8ee8", "ϟ"],
  ]
    .map(
      ([label, color, symbol], i) =>
        `<g transform="translate(${(i % 3) * 500} ${Math.floor(i / 3) * 250})"><path d="M0 0H430L390 190H0Z" fill="#092842" stroke="${color}" stroke-width="6"/><text x="80" y="112" fill="${color}" font-family="Arial,sans-serif" font-size="84" text-anchor="middle">${symbol}</text><text x="145" y="98" fill="${C.ice}" font-family="Arial,sans-serif" font-size="28" font-weight="900">${label}</text><text x="145" y="132" fill="${C.steel}" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">ANÁLISE XB</text></g>`
    )
    .join("")}</g>
`
  )
);

assets.set(
  "daily-missions.svg",
  frame(
    "missions",
    "TURNO XB",
    "MISSÕES DIÁRIAS • PROGRESSO • RECOMPENSA",
    `
  <g transform="translate(180 150)" filter="url(#shadow-missions)"><path d="M0 0H1240L1160 610H0Z" fill="#082842" stroke="#516b7a" stroke-width="8"/><rect x="70" y="70" width="1100" height="100" fill="${C.navy}" stroke="${C.electric}" stroke-width="6"/><text x="120" y="136" fill="${C.ice}" font-family="Arial,sans-serif" font-size="42" font-weight="900">ORDEM OPERACIONAL DO DIA</text>${[0, 1, 2].map(i => `<g transform="translate(80 ${220 + i * 112})"><circle cx="42" cy="42" r="36" fill="${i === 0 ? C.electric : C.navy3}"/><text x="42" y="53" text-anchor="middle" fill="${i === 0 ? C.navy : C.ice}" font-family="Arial,sans-serif" font-size="30" font-weight="900">0${i + 1}</text><rect x="105" y="8" width="780" height="26" fill="#6c8491" opacity=".45"/><rect x="105" y="52" width="${[620, 420, 260][i]}" height="18" fill="${i === 0 ? C.electric : C.cyan}"/><rect x="930" y="12" width="190" height="60" fill="${i === 0 ? C.electric : C.navy3}"/><text x="1025" y="51" text-anchor="middle" fill="${i === 0 ? C.navy : C.ice}" font-family="Arial,sans-serif" font-size="22" font-weight="900">${i === 0 ? "COLETAR" : "EM CURSO"}</text></g>`).join("")}</g>
`
  )
);

await mkdir(output, { recursive: true });
for (const [name, content] of assets) {
  await writeFile(path.join(output, name), content, "utf8");
}

// Installable-app icon reuses the audited, local vector mark.
await writeFile(
  path.join(output, "app-icon.svg"),
  assets.get("logo-symbol.svg"),
  "utf8"
);
console.log(`Generated ${assets.size + 1} local SVG assets in ${output}`);
