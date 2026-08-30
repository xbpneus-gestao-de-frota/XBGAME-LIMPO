import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const GLB_DIR = path.resolve(process.cwd(), "client/public/assets/glb");
// As pecas de curva, rampa e praca continuam no repositorio para as fases
// planejadas, mas fora de client/public: o jogador nao baixa 311 KB de
// geometria que o runtime nunca carrega.
const RESERVE_DIR = path.resolve(process.cwd(), "assets-source/glb");
const RUNTIME_SOURCE = path.resolve(
  process.cwd(),
  "client/src/game/GltfAssetRuntime.ts"
);
const WORKER_SOURCE = path.resolve(process.cwd(), "client/public/sw-v320.js");

const glbNames = (source: string): string[] =>
  [...source.matchAll(/"([A-Za-z0-9_]+\.glb)"/g)].map(match => match[1]!);

interface Glb {
  json: Record<string, any>;
  binBytes: number;
  fileBytes: number;
}

/**
 * Le o container GLB de verdade em vez de confiar no nome do arquivo: um
 * arquivo truncado ou exportado errado precisa reprovar aqui, nao no navegador
 * do jogador.
 */
async function readGlb(file: string): Promise<Glb> {
  const buffer = await readFile(path.join(GLB_DIR, file));
  expect(buffer.subarray(0, 4).toString("ascii")).toBe("glTF");
  expect(buffer.readUInt32LE(4)).toBe(2);
  expect(buffer.readUInt32LE(8)).toBe(buffer.byteLength);
  let offset = 12;
  let json: Record<string, any> | null = null;
  let binBytes = 0;
  while (offset < buffer.byteLength) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
    if (type === 0x004e4942) binBytes = chunk.byteLength;
    offset += 8 + length;
  }
  expect(json).not.toBeNull();
  return { json: json!, binBytes, fileBytes: buffer.byteLength };
}

const triangleCount = (json: Record<string, any>): number =>
  (json.meshes ?? []).reduce(
    (total: number, mesh: any) =>
      total +
      mesh.primitives.reduce(
        (sum: number, primitive: any) =>
          sum +
          Math.floor(
            (primitive.indices !== undefined
              ? json.accessors[primitive.indices].count
              : json.accessors[primitive.attributes.POSITION].count) / 3
          ),
        0
      ),
    0
  );

describe("kit de assets glTF", () => {
  // Invariante, nao inventario: o que viaja para o jogador e exatamente o que o
  // runtime carrega. Uma peca a mais e peso morto no download; uma a menos e
  // 404 no meio da partida.
  it("o pacote embarcado e exatamente o que o runtime carrega", async () => {
    const runtime = await readFile(RUNTIME_SOURCE, "utf8");
    const loaded = [...new Set(glbNames(runtime))].sort();
    expect(loaded.length).toBeGreaterThan(0);
    expect((await readdir(GLB_DIR)).sort()).toEqual(loaded);
  });

  it("as pecas de reserva ficam no repositorio, fora do pacote", async () => {
    const reserve = await readdir(RESERVE_DIR);
    expect(reserve.length).toBeGreaterThan(0);
    const shipped = new Set(await readdir(GLB_DIR));
    for (const file of reserve) {
      expect(file.endsWith(".glb")).toBe(true);
      expect(shipped.has(file)).toBe(false);
      // Reserva tambem precisa continuar carregavel: guardar um GLB quebrado
      // para o futuro nao guarda nada.
      const buffer = await readFile(path.join(RESERVE_DIR, file));
      expect(buffer.subarray(0, 4).toString("ascii")).toBe("glTF");
      expect(buffer.readUInt32LE(8)).toBe(buffer.byteLength);
    }
  });

  it("a peca reta traz geometria e os quatro materiais originais", async () => {
    const { json } = await readGlb("XB_Road_Straight.glb");
    expect(triangleCount(json)).toBeGreaterThan(50);
    const materials = (json.materials ?? []).map((m: any) => m.name).sort();
    expect(materials).toEqual([
      "XB_Asfalto",
      "XB_Calcada",
      "XB_Faixa",
      "XB_Guia",
    ]);
    // Sem textura: a peca depende so de cor solida, entao nada pode faltar.
    expect(json.images ?? []).toHaveLength(0);
  });

  it("a peca reta mede 8 m de lado, medida que a escala do jogo assume", async () => {
    const { json } = await readGlb("XB_Road_Straight.glb");
    const bounds = json.meshes[0].primitives.map((primitive: any) => {
      const accessor = json.accessors[primitive.attributes.POSITION];
      return { min: accessor.min, max: accessor.max };
    });
    const minX = Math.min(...bounds.map((b: any) => b.min[0]));
    const maxX = Math.max(...bounds.map((b: any) => b.max[0]));
    const minZ = Math.min(...bounds.map((b: any) => b.min[2]));
    const maxZ = Math.max(...bounds.map((b: any) => b.max[2]));
    expect(maxX - minX).toBeCloseTo(8, 1);
    expect(maxZ - minZ).toBeCloseTo(8, 1);
  });

  it("o asfalto rodavel tem 6 m, que a escala 2,3 leva aos 13,8 do jogo", async () => {
    const { json } = await readGlb("XB_Road_Straight.glb");
    const asfalto = json.meshes[0].primitives.find(
      (primitive: any) =>
        json.materials[primitive.material].name === "XB_Asfalto"
    );
    const accessor = json.accessors[asfalto.attributes.POSITION];
    const width = accessor.max[0] - accessor.min[0];
    expect(width).toBeCloseTo(6, 1);
    expect(width * 2.3).toBeGreaterThan(13);
    expect(width * 2.3).toBeLessThan(14.5);
  });

  it("o entregador vem com esqueleto, textura e as tres animacoes", async () => {
    const { json, fileBytes } = await readGlb("entregador_web.glb");
    expect(json.skins).toHaveLength(1);
    expect(json.skins[0].joints.length).toBe(24);
    expect((json.animations ?? []).map((a: any) => a.name).sort()).toEqual([
      "idle",
      "pedal",
      "walk",
    ]);
    expect(json.images ?? []).toHaveLength(1);
    expect(json.images[0].mimeType).toBe("image/webp");
    expect(triangleCount(json)).toBeGreaterThan(5000);
    // Guarda de peso: o pacote binario anterior custava 7,36 MB.
    expect(fileBytes).toBeLessThan(1_100_000);
  });

  it("o kit inteiro cabe folgado no orcamento de download", async () => {
    const files = await readdir(GLB_DIR);
    let total = 0;
    for (const file of files) {
      const { fileBytes } = await readGlb(file);
      total += fileBytes;
    }
    expect(total).toBeLessThan(1_000_000);
  });

  it("o pre-cache do worker cobre o que o runtime carrega, e nada alem", async () => {
    const worker = await readFile(WORKER_SOURCE, "utf8");
    const precached = [...worker.matchAll(/"\/assets\/glb\/([^"]+)"/g)]
      .map(match => match[1]!)
      .sort();
    const runtime = await readFile(RUNTIME_SOURCE, "utf8");
    expect(precached).toEqual([...new Set(glbNames(runtime))].sort());
    const onDisk = new Set(await readdir(GLB_DIR));
    precached.forEach(file => expect(onDisk.has(file)).toBe(true));
  });
});
