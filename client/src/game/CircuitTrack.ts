/**
 * O circuito fechado de 800 m, vindo do Unreal, no lugar da esteira de nove
 * segmentos que fingia curva.
 *
 * O jogo nao move o jogador: move o mundo. Aqui vale a mesma regra — o
 * circuito inteiro e um no so, e a cada quadro ele e girado e transladado de
 * modo que o ponto da volta onde o jogador esta caia na origem, virado para
 * +Z. O jogador continua parado; a volta e que passa por baixo dele.
 *
 * Duas medidas mandam neste arquivo e nao se trocam uma pela outra:
 *   - o arquivo esta em METRO de verdade (o exportador usa escala 0,01);
 *   - o jogo mede em UNIDADE, e a unidade dele vale 1/2,3 de metro, porque o
 *     entregador tem 4,14 unidades para 1,80 m de gente.
 */
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";

const PASTA = "/assets/glb/";
const ARQUIVO = "XB_Circuito_Vestido.glb";

/**
 * Escala unica, igual nos tres eixos. A pista procedural usava 2,3 na largura
 * e 1 no comprimento; uma reta tolera isso, uma curva nao — o circuito sairia
 * oval e a pista mudaria de largura ao virar.
 *
 * Com 2,3 o asfalto de 6,00 m chega com 13,8 unidades, contra os 14,5 que a
 * pista procedural desenhava: 5% de diferenca, dentro do que as faixas
 * toleram.
 */
export const ESCALA_CIRCUITO = 2.3;

/**
 * A velocidade do jogo anda em unidades por segundo tratando 1 unidade como
 * 1 metro. Com o mundo a 2,3 unidades por metro, cada metro percorrido custa
 * 2,3 unidades de volta: sem esta conversao o jogador andaria 2,3 vezes mais
 * devagar do que o velocimetro diz.
 */
export const UNIDADES_POR_METRO = ESCALA_CIRCUITO;

/** As 100 pecas de via chamam-se XB_Via_01..XB_Via_100, em ordem de percurso. */
const PREFIXO_VIA = "XB_Via_";

/**
 * O asfalto do arquivo tem 6 cm de espessura e o topo dele fica a 0,06 m do
 * zero do modelo. Em unidades sao 0,138 — descontados para o piso do circuito
 * cair onde a pista procedural deixava o jogador.
 */
const ALTURA_DO_PISO = -0.06 * ESCALA_CIRCUITO;

interface Ponto {
  x: number;
  z: number;
}

/**
 * Os quatro comercios do bairro, batizados. A chave e o nome da malha dentro
 * do arquivo; a ordem aqui nao importa, quem manda e onde eles cairam na
 * volta — medido, nao escolhido.
 */
const COMERCIOS: Record<string, { nome: string; papel: PapelDoLugar }> = {
  "building-k": { nome: "Mercado XB", papel: "comercio" },
  "building-skyscraper-a": { nome: "Base XB", papel: "base" },
  "building-n": { nome: "Hospital", papel: "comercio" },
  "building-l": { nome: "Pizzaria", papel: "comercio" },
};

export type PapelDoLugar = "base" | "comercio" | "casa";

export interface LugarNaVolta {
  /** Nome da malha no arquivo. */
  chave: string;
  nome: string;
  papel: PapelDoLugar;
  /** Distancia do inicio da volta ate a frente do lugar, em unidades. */
  distancia: number;
  /** +1 a direita de quem anda, -1 a esquerda. */
  lado: 1 | -1;
  /** Posicao dentro do circuito, antes da escala — para pendurar coisas la. */
  local: Ponto;
}

export interface PoseNaVolta {
  x: number;
  z: number;
  /** Rumo em radianos, medido de +Z na direcao de +X. */
  rumo: number;
}

export class CircuitTrack {
  private readonly scene: Scene;
  private readonly root: TransformNode;
  private malhas: AbstractMesh[] = [];
  /** Eixo da via, ja na escala do jogo. */
  private pontos: Ponto[] = [];
  /** Distancia acumulada ate cada ponto, em unidades. */
  private acumulado: number[] = [];
  private comprimento = 0;
  private percorrido = 0;
  private pronto = false;
  private lugares: LugarNaVolta[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = new TransformNode("xb-circuito", scene);
    this.root.scaling.setAll(ESCALA_CIRCUITO);
    this.root.setEnabled(false);
  }

  get isReady(): boolean {
    return this.pronto;
  }

  /** Comprimento da volta, em unidades do jogo. */
  get lapLength(): number {
    return this.comprimento;
  }

  /** Quantas pecas de via foram encontradas. Zero significa arquivo errado. */
  get pieceCount(): number {
    return this.pontos.length;
  }

  async load(): Promise<boolean> {
    try {
      const pacote = await SceneLoader.ImportMeshAsync(
        "",
        PASTA,
        ARQUIVO,
        this.scene
      );
      this.malhas = pacote.meshes;
      pacote.meshes.forEach(malha => {
        if (!malha.parent) malha.parent = this.root;
        malha.isPickable = false;
        // A volta inteira e um no so: sem isto o descarte por frustum some
        // com pedacos quando o no gira.
        malha.alwaysSelectAsActiveMesh = false;
      });
      pacote.transformNodes?.forEach(no => {
        if (!no.parent) no.parent = this.root;
      });
      this.extrairEixo();
      this.extrairLugares();
      if (this.pontos.length < 4) {
        this.dispose();
        return false;
      }
      this.root.setEnabled(true);
      this.pronto = true;
      this.aplicarPose();
      return true;
    } catch {
      this.dispose();
      return false;
    }
  }

  /**
   * Le o eixo da via nas proprias pecas: cada peca de via da um ponto, e elas
   * ja vem em ordem de percurso no arquivo. Nao ha lista escrita a mao —
   * numero escrito a mao e numero que mente calado quando a peca muda.
   */
  private extrairEixo(): void {
    this.root.rotation.y = 0;
    this.root.position.set(0, 0, 0);
    this.root.computeWorldMatrix(true);

    const vias: { ordem: number; ponto: Ponto }[] = [];
    this.scene.meshes.forEach(malha => {
      if (!malha.name.startsWith(PREFIXO_VIA)) return;
      const numero = Number.parseInt(malha.name.slice(PREFIXO_VIA.length), 10);
      if (!Number.isFinite(numero)) return;
      malha.computeWorldMatrix(true);
      const centro = malha.getAbsolutePosition();
      vias.push({ ordem: numero, ponto: { x: centro.x, z: centro.z } });
    });
    vias.sort((a, b) => a.ordem - b.ordem);
    this.pontos = vias.map(via => via.ponto);

    this.acumulado = [];
    let soma = 0;
    for (let i = 0; i < this.pontos.length; i += 1) {
      this.acumulado.push(soma);
      const atual = this.pontos[i];
      const proximo = this.pontos[(i + 1) % this.pontos.length];
      soma += Math.hypot(proximo.x - atual.x, proximo.z - atual.z);
    }
    this.comprimento = soma;
  }

  /**
   * Acha os comercios e as casas, e mede onde cada um cai na volta. Ninguem
   * escreve distancia a mao: se a peca mudar de lugar no mapa, a distancia
   * muda junto. Numero escrito a mao e numero que mente calado.
   */
  private extrairLugares(): void {
    const achados: LugarNaVolta[] = [];
    this.scene.meshes.forEach(malha => {
      const comercio = Object.keys(COMERCIOS).find(chave =>
        malha.name.startsWith(chave)
      );
      const casa = malha.name.includes("_Casa_");
      if (!comercio && !casa) return;
      malha.computeWorldMatrix(true);
      const centro = malha.getAbsolutePosition();
      const medida = this.medirNaVolta(centro.x, centro.z);
      achados.push({
        chave: malha.name,
        nome: comercio ? COMERCIOS[comercio]!.nome : "Residencia",
        papel: comercio ? COMERCIOS[comercio]!.papel : "casa",
        distancia: medida.distancia,
        lado: medida.lado,
        local: {
          x: centro.x / ESCALA_CIRCUITO,
          z: centro.z / ESCALA_CIRCUITO,
        },
      });
    });
    achados.sort((a, b) => a.distancia - b.distancia);
    this.lugares = achados;
  }

  /** Projeta um ponto no eixo da via: onde ele cai na volta e de que lado. */
  private medirNaVolta(
    px: number,
    pz: number
  ): { distancia: number; lado: 1 | -1 } {
    let melhor = Number.POSITIVE_INFINITY;
    let distancia = 0;
    let lado: 1 | -1 = 1;
    const total = this.pontos.length;
    for (let i = 0; i < total; i += 1) {
      const a = this.pontos[i]!;
      const b = this.pontos[(i + 1) % total]!;
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const l2 = vx * vx + vz * vz;
      const t =
        l2 > 0
          ? Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / l2))
          : 0;
      const qx = a.x + t * vx;
      const qz = a.z + t * vz;
      const d = Math.hypot(px - qx, pz - qz);
      if (d < melhor) {
        melhor = d;
        distancia = this.acumulado[i]! + t * Math.hypot(vx, vz);
        lado = vx * (pz - a.z) - vz * (px - a.x) > 0 ? 1 : -1;
      }
    }
    return { distancia, lado };
  }

  /** Comercios, base e casas, ja com a distancia medida na volta. */
  get places(): readonly LugarNaVolta[] {
    return this.lugares;
  }

  /**
   * Um ponto na beira da via, dentro do circuito e antes da escala: serve para
   * pendurar marcacao no meio-fio do lado certo. `afastamento` vai em metro,
   * porque o interior do circuito e metro — a escala mora no no de cima.
   */
  roadsideLocal(
    distancia: number,
    lado: 1 | -1,
    afastamento: number
  ): { x: number; z: number } {
    const pose = this.poseAt(distancia);
    // Para um rumo a, a direita de quem anda e (cos a, -sen a).
    const cos = Math.cos(pose.rumo);
    const sen = Math.sin(pose.rumo);
    return {
      x: pose.x / ESCALA_CIRCUITO + lado * afastamento * cos,
      z: pose.z / ESCALA_CIRCUITO - lado * afastamento * sen,
    };
  }

  /** Pendura um no dentro do circuito, para ele viajar junto com o mundo. */
  attach(no: TransformNode): void {
    no.parent = this.root;
  }

  /** Onde o jogador esta na volta, e para onde a via aponta ali. */
  poseAt(distancia: number): PoseNaVolta {
    const total = this.pontos.length;
    if (total < 2 || this.comprimento <= 0) return { x: 0, z: 0, rumo: 0 };
    let s = distancia % this.comprimento;
    if (s < 0) s += this.comprimento;

    let i = 0;
    while (i + 1 < total && this.acumulado[i + 1] <= s) i += 1;

    const inicio = this.pontos[i];
    const fim = this.pontos[(i + 1) % total];
    const trecho =
      (i + 1 < total ? this.acumulado[i + 1] : this.comprimento) -
      this.acumulado[i];
    const t = trecho > 0 ? (s - this.acumulado[i]) / trecho : 0;
    const dx = fim.x - inicio.x;
    const dz = fim.z - inicio.z;
    return {
      x: inicio.x + dx * t,
      z: inicio.z + dz * t,
      rumo: Math.atan2(dx, dz),
    };
  }

  /** Anda a volta. `movimento` vem em unidades do jogo. */
  advance(movimento: number): void {
    if (!this.pronto || this.comprimento <= 0) return;
    this.percorrido = (this.percorrido + movimento) % this.comprimento;
    if (this.percorrido < 0) this.percorrido += this.comprimento;
    this.aplicarPose();
  }

  reset(): void {
    this.percorrido = 0;
    if (this.pronto) this.aplicarPose();
  }

  /** Fracao da volta ja percorrida, de 0 a 1. */
  get lapFraction(): number {
    return this.comprimento > 0 ? this.percorrido / this.comprimento : 0;
  }

  /**
   * Gira e translada a volta inteira para que o ponto atual caia na origem,
   * virado para +Z.
   *
   * A matriz de mundo do no e escala, depois giro, depois translacao. Um ponto
   * p vai para p·R + T, e o giro em Y do Babylon leva (x, z) para
   * (x·cos + z·sen, −x·sen + z·cos). Querendo p na origem: T = −(p·R).
   */
  private aplicarPose(): void {
    const pose = this.poseAt(this.percorrido);
    const giro = -pose.rumo;
    const cos = Math.cos(giro);
    const sen = Math.sin(giro);
    this.root.rotation.y = giro;
    this.root.position.x = -(pose.x * cos + pose.z * sen);
    this.root.position.y = ALTURA_DO_PISO;
    this.root.position.z = -(-pose.x * sen + pose.z * cos);
  }

  dispose(): void {
    this.pronto = false;
    this.malhas.forEach(malha => malha.dispose(false, true));
    this.malhas = [];
    this.pontos = [];
    this.acumulado = [];
    this.lugares = [];
    this.root.dispose();
  }
}
