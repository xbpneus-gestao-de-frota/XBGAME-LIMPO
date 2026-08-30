/**
 * O minimapa e a unica leitura espacial que o piloto tem no HUD: precisa sair
 * da origem, chegar ao destino e nunca escapar da moldura de 100x100.
 */
import { describe, expect, it } from "vitest";
import {
  XB_CITY_ROUTE,
  XB_CITY_STREETS,
  minimapRoutePath,
  minimapRouteSnapshot,
} from "../../client/src/game/minimap";

describe("minimapa da Cidade XB", () => {
  it("inicia na origem, termina no destino e trava entradas inválidas", () => {
    const origin = minimapRouteSnapshot(-2);
    const destination = minimapRouteSnapshot(4);

    expect(origin.point).toEqual(XB_CITY_ROUTE[0]);
    expect(destination.point).toEqual(XB_CITY_ROUTE.at(-1));
    expect(origin.progress).toBe(0);
    expect(destination.progress).toBe(1);
    expect(destination.completed).toBe(true);
    expect(origin.completed).toBe(false);
    expect(minimapRouteSnapshot(Number.NaN).point).toEqual(XB_CITY_ROUTE[0]);
  });

  it("interpola sem escapar da moldura e é determinístico", () => {
    for (let index = 0; index <= 100; index += 1) {
      const snapshot = minimapRouteSnapshot(index / 100);
      expect(snapshot.point.x).toBeGreaterThanOrEqual(0);
      expect(snapshot.point.x).toBeLessThanOrEqual(100);
      expect(snapshot.point.y).toBeGreaterThanOrEqual(0);
      expect(snapshot.point.y).toBeLessThanOrEqual(100);
      expect(Number.isFinite(snapshot.headingDegrees)).toBe(true);
      expect(snapshot.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(snapshot.segmentIndex).toBeLessThan(XB_CITY_ROUTE.length - 1);
      expect(snapshot.nextCheckpoint).toEqual(
        XB_CITY_ROUTE[snapshot.segmentIndex + 1]
      );
    }
    expect(minimapRouteSnapshot(0.37)).toEqual(minimapRouteSnapshot(0.37));
  });

  it("avança monotonicamente ao longo da rota", () => {
    let travelled = 0;
    let previous = minimapRouteSnapshot(0).point;
    for (let index = 1; index <= 200; index += 1) {
      const current = minimapRouteSnapshot(index / 200).point;
      travelled += Math.hypot(current.x - previous.x, current.y - previous.y);
      expect(
        minimapRouteSnapshot(index / 200).segmentIndex
      ).toBeGreaterThanOrEqual(
        minimapRouteSnapshot((index - 1) / 200).segmentIndex
      );
      previous = current;
    }
    // O caminho percorrido tem de bater com o comprimento da polilinha.
    const total = XB_CITY_ROUTE.slice(0, -1).reduce(
      (sum, point, index) =>
        sum +
        Math.hypot(
          XB_CITY_ROUTE[index + 1]!.x - point.x,
          XB_CITY_ROUTE[index + 1]!.y - point.y
        ),
      0
    );
    expect(travelled).toBeGreaterThan(total * 0.99);
    expect(travelled).toBeLessThan(total * 1.01);
  });

  it("descreve a rota e as ruas em um caminho SVG utilizável", () => {
    const path = minimapRoutePath();
    expect(path.startsWith("M 14 88")).toBe(true);
    expect(path.split("L")).toHaveLength(XB_CITY_ROUTE.length);
    expect(minimapRouteSnapshot(0.5).routePath).toBe(path);
    expect(XB_CITY_STREETS.length).toBeGreaterThan(0);
    XB_CITY_STREETS.forEach(street => {
      expect(street.points.length).toBeGreaterThanOrEqual(2);
      street.points.forEach(point => {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(100);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(100);
      });
    });
  });
});
