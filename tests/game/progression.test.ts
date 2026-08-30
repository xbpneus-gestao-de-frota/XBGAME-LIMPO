/**
 * A curva de XP e o ritmo do jogo inteiro. Ela ja foi quadratica ate o nivel
 * 500 e pedia 499.000 de XP — um muro de repeticao no fim da campanha. Estes
 * testes travam as tres propriedades que importam: ela sempre sobe, a abertura
 * (1..30) permanece exatamente como era, e o total ate o teto e humano.
 */
import { describe, expect, it } from "vitest";
import {
  COMPANY_LEVEL_XP,
  MAX_COMPANY_LEVEL,
  companyLevelFromXp,
  companyXpRequiredForLevel,
} from "../../client/src/game/progression";

/** Curva original: 2*(L-1)^2 + 2*(L-1). */
const legacyQuadratic = (level: number): number =>
  (level - 1) * (level - 1) * 2 + (level - 1) * 2;

describe("curva de experiência da empresa", () => {
  it("é estritamente crescente em todos os 500 níveis", () => {
    expect(MAX_COMPANY_LEVEL).toBe(500);
    for (let level = 2; level <= MAX_COMPANY_LEVEL; level += 1) {
      const previous = companyXpRequiredForLevel(level - 1);
      const current = companyXpRequiredForLevel(level);
      expect(
        current,
        `nível ${level} não exige mais XP que ${level - 1}`
      ).toBeGreaterThan(previous);
    }
    expect(companyXpRequiredForLevel(1)).toBe(0);
  });

  it("mantém a abertura 1..30 idêntica à quadrática original", () => {
    for (let level = 1; level <= 30; level += 1) {
      expect(companyXpRequiredForLevel(level)).toBe(legacyQuadratic(level));
    }
    // O ponto de virada nao pode criar degrau: o nivel 31 segue o 30.
    expect(companyXpRequiredForLevel(31)).toBeGreaterThan(
      companyXpRequiredForLevel(30)
    );
    expect(
      companyXpRequiredForLevel(31) - companyXpRequiredForLevel(30)
    ).toBeLessThan(legacyQuadratic(31) - legacyQuadratic(30));
  });

  it("mantém o topo abaixo de 120.000 de XP", () => {
    const total = companyXpRequiredForLevel(MAX_COMPANY_LEVEL);
    expect(total).toBeLessThan(120_000);
    // E a curva antiga custava 499.000: o alívio precisa ser real.
    expect(total).toBeLessThan(legacyQuadratic(MAX_COMPANY_LEVEL) / 3);
  });

  it("protege as bordas e converte XP em nível de forma consistente", () => {
    expect(companyXpRequiredForLevel(0)).toBe(companyXpRequiredForLevel(1));
    expect(companyXpRequiredForLevel(-40)).toBe(companyXpRequiredForLevel(1));
    expect(companyXpRequiredForLevel(9_999)).toBe(
      companyXpRequiredForLevel(MAX_COMPANY_LEVEL)
    );
    expect(COMPANY_LEVEL_XP).toHaveLength(MAX_COMPANY_LEVEL);

    for (const level of [1, 2, 15, 30, 31, 60, 200, 499, MAX_COMPANY_LEVEL]) {
      const required = companyXpRequiredForLevel(level);
      expect(companyLevelFromXp(required)).toBe(level);
      if (level > 1) expect(companyLevelFromXp(required - 1)).toBe(level - 1);
    }
    expect(companyLevelFromXp(0)).toBe(1);
    expect(companyLevelFromXp(-10)).toBe(1);
    expect(companyLevelFromXp(Number.MAX_VALUE)).toBe(MAX_COMPANY_LEVEL);
  });
});
