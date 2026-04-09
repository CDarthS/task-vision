/**
 * 25 gradientes CSS inspirados no Planka/kanban-vision.
 * Cada workspace recebe um aleatoriamente ao ser criado.
 */

export interface WorkspaceGradient {
  name: string;
  css: string;
}

export const WORKSPACE_GRADIENTS: WorkspaceGradient[] = [
  { name: "old-lime", css: "linear-gradient(to bottom, #7b920a, #add100)" },
  { name: "ocean-dive", css: "linear-gradient(to top, #062e53, #1ad0e0)" },
  {
    name: "tzepesch-style",
    css: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  },
  {
    name: "jungle-mesh",
    css: "linear-gradient(to top, #0a4a2e, #0db861)",
  },
  {
    name: "strawberry-dust",
    css: "linear-gradient(to bottom, #bf3a5e, #ff6b8a)",
  },
  {
    name: "purple-rose",
    css: "linear-gradient(128deg, rgba(116,43,62,1) 19%, rgba(192,71,103,1) 90%)",
  },
  {
    name: "sun-scream",
    css: "linear-gradient(to right, #fc4a1a, #f7b733)",
  },
  {
    name: "warm-rust",
    css: "linear-gradient(to bottom, #6a3906, #d4a259)",
  },
  {
    name: "sky-change",
    css: "linear-gradient(to top, #1e3c72, #2a5298)",
  },
  {
    name: "green-eyes",
    css: "linear-gradient(to bottom, #1d976c, #93f9b9)",
  },
  {
    name: "blue-xchange",
    css: "linear-gradient(to top, #005c97, #363795)",
  },
  {
    name: "blood-orange",
    css: "linear-gradient(360deg, #d64759 10%, #da7352 360%)",
  },
  {
    name: "sour-peel",
    css: "linear-gradient(to right, #11998e, #38ef7d)",
  },
  {
    name: "green-ninja",
    css: "linear-gradient(to bottom, #1f5e2e, #2ecc71)",
  },
  {
    name: "algae-green",
    css: "linear-gradient(to top, #134e5e, #71b280)",
  },
  {
    name: "coral-reef",
    css: "linear-gradient(to bottom, #ff6b6b, #ee5a24)",
  },
  {
    name: "steel-grey",
    css: "radial-gradient(circle farthest-corner at -4% -12.9%, rgba(74,98,110,1), rgba(30,33,48,1) 90.2%)",
  },
  {
    name: "heat-waves",
    css: "linear-gradient(to right, #e55d87, #5fc3e4)",
  },
  {
    name: "velvet-lounge",
    css: "linear-gradient(to bottom, #43235c, #7b4397)",
  },
  {
    name: "purple-rain",
    css: "linear-gradient(to top, #2b1055, #d147a3)",
  },
  {
    name: "blue-steel",
    css: "linear-gradient(to bottom, #2c3e50, #4ca1af)",
  },
  {
    name: "blueish-curve",
    css: "linear-gradient(to top, #2193b0, #6dd5ed)",
  },
  {
    name: "prism-light",
    css: "linear-gradient(to right, #c94b4b, #4b134f)",
  },
  {
    name: "green-mist",
    css: "linear-gradient(to bottom, #0f9b0f, #000000)",
  },
  {
    name: "red-curtain",
    css: "linear-gradient(to bottom, #6c0000, #ed213a)",
  },
];

/**
 * Retorna um gradiente aleatorio.
 */
export function getRandomGradient(): WorkspaceGradient {
  const index = Math.floor(Math.random() * WORKSPACE_GRADIENTS.length);
  return WORKSPACE_GRADIENTS[index];
}

/**
 * Busca um gradiente pelo nome. Retorna o primeiro se nao encontrar.
 */
export function getGradientByName(
  name: string
): WorkspaceGradient {
  return (
    WORKSPACE_GRADIENTS.find((g) => g.name === name) ?? WORKSPACE_GRADIENTS[0]
  );
}
