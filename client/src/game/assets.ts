export const GAME_ASSETS = {
  // Arte de abertura: o entregador e os dois mascotes no portao da trilha.
  reference: "/assets/XB_Abertura_Jornada.webp",
  // A mesma cena continuada para os lados e para cima e para baixo. Servem de
  // fundo para a arte nunca ficar cercada de preto: em tela deitada entra a
  // larga, em tela em pe entra a alta.
  referenceWide: "/assets/XB_Abertura_Larga.webp",
  referenceTall: "/assets/XB_Abertura_Alta.webp",
  // Arte em pe: a mesma trilha com a cidade XB ao fundo, feita na proporcao do
  // celular. Entra no lugar da quadrada quando a tela e mais alta que larga.
  referenceVertical: "/assets/XB_Abertura_Vertical.webp",
  referenceVerticalTall: "/assets/XB_Abertura_Vertical_Alta.webp",
  soundtrack: "/assets/XB_Trilha_Abertura.mp3",
  // Filme de abertura: roda uma vez so, na primeira vez que a pessoa entra.
  openingClip: "/assets/XB_Abertura_Cena.mp4",
  // Mesmo filme em outro formato: ha navegador que nao traz o codec do mp4.
  openingClipWebm: "/assets/XB_Abertura_Cena.webm",
  openingClipPoster: "/assets/XB_Abertura_Cena.webp",
  driver: "/assets/driver-mascot-v3.webp",
  logo: "/assets/logo-xb-mark-v3.webp",
  brandLockup: "/assets/logo-xb-metal-v3.webp",
  tireToken: "/assets/tire-token.svg",
  billboard: "/assets/billboard.svg",
  asphalt: "/assets/asphalt.svg",
  vehicleProgression: "/assets/vehicle-progression.svg",
  garage: "/assets/garage-hub.svg",
  planetary: "/assets/planetary-hub.svg",
  baseLocal: "/assets/base-local.svg",
  baseRegional: "/assets/base-regional.svg",
  baseGlobal: "/assets/base-global.svg",
  basePlanetary: "/assets/base-planetary.svg",
  buildingEvolution: "/assets/building-evolution.svg",
  tireCompounds: "/assets/tire-compounds.svg",
  routeConditions: "/assets/route-conditions.svg",
  dailyMissions: "/assets/daily-missions.svg",
} as const;
