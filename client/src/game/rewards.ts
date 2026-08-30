/**
 * Auditável por construção: o contrato-base continua sendo a principal fonte
 * de receita e os coletáveis só acrescentam uma parcela limitada. Assim, um
 * objeto capturado nunca transforma a primeira entrega em um salto econômico.
 */
export interface CollectibleRewardInput {
  baseReward: number;
  vehicleOrder: number;
  cargoCount: number;
  tireTokenCount: number;
}

export interface CollectibleRewardBreakdown {
  cargoUnit: number;
  tireTokenUnit: number;
  cargoBonus: number;
  tireTokenBonus: number;
  rawBonus: number;
  cap: number;
  totalBonus: number;
}

const safeWhole = (value: number): number =>
  Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

/**
 * Coletáveis crescem com a maturidade do contrato, não com números absolutos
 * desconectados. O bônus agregado é limitado a 50% do contrato-base.
 */
export function collectibleRewardBreakdown(
  input: CollectibleRewardInput
): CollectibleRewardBreakdown {
  const baseReward = safeWhole(input.baseReward);
  const vehicleOrder = Math.min(5, safeWhole(input.vehicleOrder));
  const cargoCount = safeWhole(input.cargoCount);
  const tireTokenCount = safeWhole(input.tireTokenCount);

  const cargoUnit = Math.max(
    1,
    Math.round(baseReward * (0.1 + vehicleOrder * 0.01))
  );
  const tireTokenUnit = Math.max(
    1,
    Math.round(baseReward * (0.06 + vehicleOrder * 0.005))
  );
  const rawCargoBonus = cargoCount * cargoUnit;
  const rawTireTokenBonus = tireTokenCount * tireTokenUnit;
  const rawBonus = rawCargoBonus + rawTireTokenBonus;
  const cap = Math.max(0, Math.round(baseReward * 0.5));
  const cargoBonus = Math.min(rawCargoBonus, cap);
  const tireTokenBonus = Math.min(
    rawTireTokenBonus,
    Math.max(0, cap - cargoBonus)
  );

  return {
    cargoUnit,
    tireTokenUnit,
    cargoBonus,
    tireTokenBonus,
    rawBonus,
    cap,
    totalBonus: cargoBonus + tireTokenBonus,
  };
}

export function perfectRouteReward(
  baseReward: number,
  eligible: boolean
): number {
  if (!eligible) return 0;
  return Math.max(0, Math.round(safeWhole(baseReward) * 0.18));
}
