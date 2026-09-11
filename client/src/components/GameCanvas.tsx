/**
 * Direção visual: Pit Lane Industrial — azul-marinho, ciano elétrico, placas
 * técnicas assimétricas e telemetria legível. React moldura a cena Babylon e
 * mantém toda a interação de gestão fora do motor gráfico.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Engine } from "@babylonjs/core/Engines/engine";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  Check,
  CircleGauge,
  Coins,
  Flag,
  Gauge,
  Globe2,
  Home,
  LockKeyhole,
  LogOut,
  MapPinned,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
} from "lucide-react";
import { GAME_ASSETS } from "@/game/assets";
import { criarTrilhaSonora, type TrilhaSonora } from "@/game/music";
import { deveRodarAbertura, marcarAberturaVista } from "@/game/openingScene";
import { precisaSeApresentar } from "@/game/identity";
import type { EntregadorId } from "@/game/identity";
import Welcome from "./Welcome";
import MapaDoBairro from "./MapaDoBairro";
import type { ParadaNoMapa, SituacaoDaParada } from "./MapaDoBairro";
import { BASE, COMERCIOS, CASAS } from "@/game/addresses";
import { metrosDaRota, rota } from "@/game/rotas";
import { montarCorrida } from "@/game/aParada";
import { MAPA, METROS_POR_PIXEL } from "@/game/streets";
import BaseScreen from "./BaseScreen";
import FirstDelivery, { ehPrimeiraEntrada } from "./FirstDelivery";

/*
 * A tela de primeira entrada esta pronta e testada, mas desligada: o Fernando
 * pediu para parar e definir a historia do jogo antes de trocar o comeco. Ela
 * fica aqui inteira, a uma palavra de distancia — trocar para true liga.
 * Deixar o codigo pronto e desligado e melhor do que deixa-lo solto na mesa:
 * assim ele nao se perde nem entra sem ser convidado.
 */
const PRIMEIRA_ENTRADA_APROVADA = false;

/*
 * TODOS OS PINOS ACESOS AO MESMO TEMPO — DESLIGADO, e o lugar dele e desligado.
 *
 * Foi ligada a pedido dele para conferir a marcacao que ele pintou a mao, e
 * fez o trabalho: com o bairro inteiro aceso, um pino em cima de arvore ou
 * dois pinos brigando pelo mesmo telhado saltam aos olhos — foi assim que os
 * tres erros de leitura do desenho dele apareceram, um atras do outro.
 *
 * Conferido, ele encerrou: "deve aparecer na tela apenas ativos, os outros
 * devem ficar invisiveis". E o mesmo que ele ja tinha dito no comeco — "pinos
 * devem existir mas invisivel ao jogador" — e e o certo para o jogo: o bairro
 * inteiro aceso vira tapete e esconde justamente o que aponta.
 *
 * A chave fica aqui, pronta, para a proxima marcacao que ele mandar.
 */
const TODOS_OS_PINOS = false;
import ExperienceSettings from "./ExperienceSettings";
import RoutesScreen from "./RoutesScreen";
import { ENTREGADORES } from "@/game/identity";
import ChamadaDeVideo from "./ChamadaDeVideo";
import XBWApp from "./xbwapp/XBWApp";
import { acoplar } from "@/game/xbwapp/ponte";
import {
  kmDaCorrida,
  kmDaEntrega,
  prazoEmMinutos,
} from "@/game/xbwapp/distancias";
import { Contador, Icone } from "./xbwapp/pecas";
import {
  estadoInicial as estadoInicialDoApp,
  irParaOPasso,
  semear,
  totalNaoLidas,
} from "@/game/xbwapp/estado";
import type { IdContato } from "@/game/xbwapp/tipos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { ESPERA_DA_CHAMADA_MS, QUEM_LIGA } from "@/game/aChamada";
import { XBW_ICONES } from "@/game/xbwapp/icones";
import {
  nomeDe,
  oRenanFoiContratado,
  oRenanRecebeuEquipamento,
} from "@/game/xbwapp/contatos";
import { tocarAvisoDeMensagem } from "@/game/oToqueDoAviso";
import { calcularFrete } from "@/game/freight";
import {
  ofertasAbertas,
  passarUmSegundo,
  rotaDe,
  trajeto,
} from "@/game/xbwapp/entregaRapida";
import { emReais } from "@/game/xbwapp/catalogo";
import {
  esperaNoMapa,
  pinosDaRota,
  planoPara,
  progressoNoPlano,
  type PlanoDoPercurso,
  type TracadoDoPercurso,
} from "@/game/oPercursoNoMapa";
import type { ComandoDoEntregador } from "@/components/Entregador";
import { retratoDoCandidato } from "@/game/candidatos";

/*
 * O QUE O AVISO MOSTRA.
 *
 * E a primeira frase que o Renan diz depois que a caixa abre. Fica escrita
 * aqui, e nao lida do roteiro, porque o aviso aparece ANTES de a conversa
 * abrir: nesse instante o roteiro ainda nao entregou fala nenhuma, e nao ha
 * de onde ler. Se a frase mudar no roteiro, muda aqui junto.
 */
const PRIMEIRA_FALA_DEPOIS_DO_BAU = "Achei que era minha pizza";
import {
  ESPERA_DEPOIS_DA_ULTIMA_MS,
  ESPERA_PARA_LIGAR_DE_NOVO_MS,
  PASSO_DA_COBRANCA,
  ESPERA_PARA_FECHAR_SOZINHO_MS,
  PASSO_DEPOIS_DE_RESOLVER,
  ULTIMA_FALA_DA_ABERTURA,
  RECUSAS_ATE_A_MENSAGEM,
} from "@/game/aConversa";

/**
 * SE A TELA DE SELECAO APARECE.
 *
 * Escondida a pedido dele em 07/09/2026: "esconda tela de selecao por
 * enquanto". Ela vai voltar mudada — a ideia dele e que deixe de ser um
 * formulario e vire a APRESENTACAO DA EQUIPE, cada um com seus atributos: um
 * mais rapido, outro mais cuidadoso, outro mais forte.
 *
 * Nada foi apagado. A tela inteira continua aqui atras desta chave, com os oito
 * entregadores e o campo de nome, para voltar quando os atributos existirem.
 */
const TELA_DE_SELECAO = false;

/**
 * O nome que entra enquanto nao ha quem pergunte.
 *
 * Some junto com a chave acima. Fica curto e neutro de proposito: e o nome que
 * a central usa para falar com a pessoa, e um nome de brincadeira apareceria em
 * tela sem ela ter escolhido.
 */
const NOME_PROVISORIO = "XB";
import TireStrategyPanel from "./TireStrategyPanel";
import LiveMinimap from "./LiveMinimap";
import PilotFocusLayer from "./PilotFocusLayer";
import {
  TIRE_MAX_LEVEL,
  TIRE_STATS,
  getVehicle,
  tireUpgradeCost,
  vehicleCargoCapacity,
  vehicleDisplaySpeedKmh,
} from "@/game/config";
import {
  BIKE_PARTS,
  MAX_BIKE_PART_LEVEL,
  ROUTES,
  VEHICLE_UNLOCK_LEVELS,
  bikePartUpgradeCost,
  companyLevelFromXp,
  vehicleUpgradeCost,
} from "@/game/progression";
import { bikeMaintenanceCost } from "@/game/operations";
import type { GameHandle } from "@/game/scene";
import {
  GameFeedback,
  loadFeedbackPreferences,
  type FeedbackPreferences,
} from "@/game/feedback";
import {
  babylonHardwareScalingLevel,
  loadQualityPreference,
  resolveQualitySettings,
  saveQualityPreference,
  type QualityPreference,
} from "@/game/quality";
import type {
  BikePartId,
  GameSnapshot,
  TireStat,
  VehicleConfig,
} from "@/game/types";
import { formatCredits, money } from "./format";
import { useFocusTrap } from "./useFocusTrap";

function BrandLockup({
  compact = false,
  artwork = false,
}: {
  compact?: boolean;
  artwork?: boolean;
}) {
  if (artwork) {
    return (
      <div className="brand-lockup brand-lockup--artwork">
        <img
          src={GAME_ASSETS.brandLockup}
          alt="Logotipo metálico XB Technology"
        />
      </div>
    );
  }

  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <img src={GAME_ASSETS.logo} alt="Símbolo da XB Technology" />
      <div>
        <strong>XB TECHNOLOGY</strong>
        <span>DO PEDAL AO PLANETA</span>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-chip">
      <span className="stat-chip__icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

/**
 * O filme de abertura. Nao abre o jogo: ele responde ao PLAY GAME.
 *
 * A ordem foi escolhida pelo Fernando e faz diferenca. A pessoa ve a arte
 * parada, aperta o botao, o botao some e a MESMA cena comeca a se mexer —
 * parece que o quadro ganhou vida, e nao que um comercial passou na frente do
 * jogo. Por isso o filme entra por cima da tela de entrada, aparecendo devagar,
 * em vez de trocar de tela.
 *
 * Roda uma vez na vida do aparelho. Da segunda vez, o botao leva direto.
 *
 * Tres cuidados que nao aparecem na tela mas decidem se isto presta:
 *
 * 1. PULAR existe desde o primeiro segundo. Filme que prende a pessoa vira
 *    obstaculo, e este roda justamente na hora em que ela quer e entrar.
 * 2. Se o video nao carregar — arquivo faltando, formato recusado, internet
 *    caindo — o jogo entra assim mesmo. Uma abertura nunca pode ser porta
 *    trancada. Por isso o prazo de espera e o aviso de erro terminam a cena.
 * 3. Navegador nenhum deixa comecar com som antes de um gesto. Tenta-se com
 *    som; recusado, o filme roda mudo e o primeiro toque devolve o audio.
 */
function OpeningScene({ onFinish }: { onFinish(assistida: boolean): void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let vivo = true;
    const soltar: Array<() => void> = [];

    const liberarSom = () => {
      if (!vivo) return;
      const atual = videoRef.current;
      if (!atual) return;
      atual.muted = false;
      setMudo(false);
    };

    video.muted = false;
    const tentativa = video.play();
    if (tentativa && typeof tentativa.catch === "function") {
      void tentativa.catch(() => {
        if (!vivo) return;
        const atual = videoRef.current;
        if (!atual) return;
        atual.muted = true;
        setMudo(true);
        void atual.play().catch(() => onFinish(false));
        window.addEventListener("pointerdown", liberarSom, { once: true });
        window.addEventListener("keydown", liberarSom, { once: true });
        soltar.push(() => {
          window.removeEventListener("pointerdown", liberarSom);
          window.removeEventListener("keydown", liberarSom);
        });
      });
    }

    // Rede ruim ou arquivo grande: depois disto o jogo entra sem o filme.
    const prazo = window.setTimeout(() => {
      if (vivo && (videoRef.current?.readyState ?? 0) < 2) onFinish(false);
    }, 8000);
    soltar.push(() => window.clearTimeout(prazo));

    return () => {
      vivo = false;
      soltar.forEach(fechar => fechar());
    };
  }, [onFinish]);

  return (
    <div
      className="abertura"
      role="presentation"
      style={
        {
          "--abertura-cartaz": `url(${GAME_ASSETS.openingClipPoster})`,
        } as CSSProperties
      }
    >
      <video
        ref={videoRef}
        className="abertura__filme"
        poster={GAME_ASSETS.openingClipPoster}
        playsInline
        preload="auto"
        onEnded={() => onFinish(true)}
        /*
         * Erro nao marca como vista. Se o aparelho nao soube tocar o filme, a
         * pessoa nao assistiu — e nao seria justo tirar dela a abertura para
         * sempre por causa de um codec que faltava naquele dia.
         */
        onError={() => onFinish(false)}
      >
        <source src={GAME_ASSETS.openingClipWebm} type="video/webm" />
        <source src={GAME_ASSETS.openingClip} type="video/mp4" />
      </video>
      {mudo && <span className="abertura__aviso">TOQUE PARA O SOM</span>}
      <button className="abertura__pular" onClick={() => onFinish(true)}>
        PULAR
      </button>
    </div>
  );
}

/**
 * Tela de entrada. Uma unica arte, do tamanho que ela nasceu, com tres pontos
 * animados por cima: o mapa projetado sobre o mascote, o mostrador na mao dele
 * e as luzes da caixa de fios. As posicoes sao porcentagens medidas na propria
 * imagem — trocar a arte exige remedir os tres pontos.
 */
function MenuScreen({ onPlay }: { onPlay(): void }) {
  return (
    <section
      className="game-screen entrada"
      aria-label="XB Technology - inicio da jornada"
    >
      <div className="entrada__fundo" aria-hidden="true" />
      <div className="entrada__palco">
        {/*
         * A cena continuada mora DENTRO do palco, e nao numa camada da tela
         * inteira. E de proposito: assim ela e medida em porcentagem do proprio
         * palco e nunca sai do lugar. Quando era fundo de tela, bastava a
         * janela ter uma forma em que a arte nao encostasse nas bordas para as
         * duas copias saírem de registro e aparecerem sobrepostas.
         */}
        <picture className="entrada__ambiente" aria-hidden="true">
          <source
            media="(min-aspect-ratio: 3 / 4)"
            srcSet={GAME_ASSETS.referenceWide}
          />
          <img src={GAME_ASSETS.referenceVerticalTall} alt="" />
        </picture>
        <picture className="entrada__quadro">
          {/* Tela em pe recebe a arte em pe; deitada, a quadrada. Cada forma
              de tela ganha a arte desenhada para ela. */}
          <source
            media="(max-aspect-ratio: 3 / 4)"
            srcSet={GAME_ASSETS.referenceVertical}
          />
          <img
            className="entrada__arte"
            src={GAME_ASSETS.reference}
            alt="Entregador de bicicleta no portao da trilha, ao lado dos dois mascotes"
          />
        </picture>
        <div className="entrada__vida" aria-hidden="true">
          <span className="entrada__mapa" />
          <span className="entrada__pino" />
          <span className="entrada__relogio" />
          <span className="entrada__aro" />
          <span className="entrada__led entrada__led--a" />
          <span className="entrada__led entrada__led--b" />
          <span className="entrada__led entrada__led--c" />
          <span className="entrada__led entrada__led--d" />
        </div>
      </div>
      <button className="entrada__jogar" onClick={onPlay}>
        PLAY GAME
      </button>
    </section>
  );
}

function VehicleCard({
  vehicle,
  snapshot,
  handle,
}: {
  vehicle: VehicleConfig;
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const { campaign } = snapshot;
  const unlocked = campaign.unlockedVehicles.includes(vehicle.id);
  const selected = campaign.selectedVehicleId === vehicle.id;
  const companyLevel = companyLevelFromXp(campaign.companyXp);
  const companyRequired = VEHICLE_UNLOCK_LEVELS[vehicle.id];
  const companyReady = companyLevel >= companyRequired;
  const garageRequired = vehicle.id === "bike" ? 0 : Math.min(5, vehicle.order);
  const garageReady = campaign.buildingLevels.garage >= garageRequired;
  const reputationReady = campaign.reputation >= vehicle.reputationRequired;
  const creditReady = campaign.credits >= vehicle.cost;
  const available =
    companyReady && garageReady && reputationReady && creditReady;
  const isFinal = vehicle.id === "planetary";
  const vehicleLevel = campaign.vehicleLevels[vehicle.id] || 0;
  const atMax = vehicleLevel >= 5;
  const garageLimit = Math.max(1, Math.min(5, campaign.buildingLevels.garage));
  const upgradeCost = vehicleUpgradeCost(
    vehicle.cost,
    Math.max(1, vehicleLevel)
  );

  return (
    <article
      className={`vehicle-card ${selected ? "is-selected" : ""} ${
        unlocked ? "is-unlocked" : "is-locked"
      } ${available ? "is-available" : ""}`}
      data-vehicle={vehicle.id}
      data-era-index={vehicle.order + 1}
    >
      <div className="vehicle-card__topline">
        <span>
          {unlocked
            ? `NÍVEL ${vehicleLevel}/5`
            : `ERA ${String(vehicle.order + 1).padStart(2, "0")}`}
        </span>
        {unlocked ? <Check size={15} /> : <LockKeyhole size={14} />}
      </div>
      <div className="vehicle-card__icon">
        {vehicle.id === "bike" ? <Bike /> : isFinal ? <Globe2 /> : <Truck />}
      </div>
      <p>{vehicle.era}</p>
      <h3>{vehicle.shortName}</h3>
      <span className="vehicle-route">
        <Route size={13} /> {vehicle.route}
      </span>
      <div className="vehicle-specs">
        <span>
          <Gauge size={13} /> {vehicleDisplaySpeedKmh(vehicle.id, vehicleLevel)}{" "}
          km/h
        </span>
        <span>
          <PackageCheck size={13} />{" "}
          {vehicleCargoCapacity(
            vehicle,
            Math.max(1, vehicleLevel),
            campaign.tireLevels.capacity
          )}{" "}
          vol.
        </span>
      </div>

      {unlocked && (
        <div
          className="vehicle-level-track"
          aria-label={`${vehicle.shortName}: nível ${vehicleLevel}`}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className={index < vehicleLevel ? "filled" : ""}
            />
          ))}
        </div>
      )}

      {!unlocked && (
        <div className="vehicle-requirements">
          <span className={companyReady ? "ready" : ""}>
            N{companyRequired}
          </span>
          <span className={garageReady ? "ready" : ""}>
            <Wrench size={12} /> G{garageRequired}
          </span>
          <span className={reputationReady ? "ready" : ""}>
            <Star size={12} /> {vehicle.reputationRequired}
          </span>
          <span className={creditReady ? "ready" : ""}>
            XB$ {money.format(vehicle.cost)}
          </span>
        </div>
      )}

      <div className="vehicle-actions-stack">
        <button
          className="vehicle-action"
          onClick={() =>
            unlocked
              ? handle.selectVehicle(vehicle.id)
              : handle.buyVehicle(vehicle.id)
          }
        >
          {selected
            ? "EM OPERAÇÃO"
            : unlocked
              ? "SELECIONAR"
              : available
                ? "ADQUIRIR"
                : "VER REQUISITOS"}
        </button>
        {unlocked && (
          <button
            className="vehicle-upgrade-action"
            onClick={() => handle.upgradeVehicle(vehicle.id)}
            disabled={atMax}
          >
            {atMax
              ? "MÁXIMO"
              : vehicleLevel >= garageLimit
                ? `EXIGE GARAGEM ${vehicleLevel + 1}`
                : `MELHORAR · ${formatCredits(upgradeCost)}`}
          </button>
        )}
      </div>
    </article>
  );
}

function TireUpgrade({
  stat,
  snapshot,
  handle,
}: {
  stat: (typeof TIRE_STATS)[number];
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const level = snapshot.campaign.tireLevels[stat.id];
  const atMax = level >= TIRE_MAX_LEVEL;
  const cost = tireUpgradeCost(stat.id, level);
  const workshopLevel = snapshot.campaign.buildingLevels.workshop;
  const cappedByWorkshop = level >= workshopLevel && !atMax;

  return (
    <article className="tire-upgrade">
      <div className="tire-upgrade__head">
        <span className="tire-code">{stat.shortLabel}</span>
        <span>
          NÍVEL {level}/{TIRE_MAX_LEVEL} · OFICINA {workshopLevel}
        </span>
      </div>
      <h3>{stat.label}</h3>
      <p>{stat.description}</p>
      <div className="level-track" aria-label={`${stat.label}: nível ${level}`}>
        {Array.from({ length: TIRE_MAX_LEVEL }).map((_, index) => (
          <span key={index} className={index < level ? "filled" : ""} />
        ))}
      </div>
      <div className="tire-upgrade__footer">
        <span className="benefit">{stat.benefit}</span>
        <button
          onClick={() => handle.upgradeTire(stat.id as TireStat)}
          disabled={atMax}
        >
          {atMax
            ? "MÁXIMO"
            : cappedByWorkshop
              ? `EXIGE OFICINA ${level + 1}`
              : `${formatCredits(cost)}`}
        </button>
      </div>
    </article>
  );
}

function BikePartUpgrade({
  part,
  snapshot,
  handle,
}: {
  part: (typeof BIKE_PARTS)[number];
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const level = snapshot.campaign.bikePartLevels[part.id];
  const companyLevel = companyLevelFromXp(snapshot.campaign.companyXp);
  const nextTier = part.tiers.find(tier => tier.level === level + 1);
  const cost = bikePartUpgradeCost(part.id, level);
  const unlocked = companyLevel >= part.unlockLevel;
  const atMax = level >= MAX_BIKE_PART_LEVEL || !nextTier || cost === null;

  return (
    <article
      className={`bike-part-upgrade ${unlocked ? "is-unlocked" : "is-locked"}`}
    >
      <div className="bike-part-upgrade__head">
        <span>{part.shortName.toUpperCase()}</span>
        <strong>
          NÍVEL {level}/{MAX_BIKE_PART_LEVEL}
        </strong>
      </div>
      <h3>{level > 0 ? part.tiers[level - 1]?.name : part.name}</h3>
      <p>{part.description}</p>
      <div
        className="bike-part-levels"
        role="progressbar"
        aria-label={`${part.name}: nível ${level}`}
        aria-valuemin={0}
        aria-valuemax={MAX_BIKE_PART_LEVEL}
        aria-valuenow={level}
      >
        {Array.from({ length: MAX_BIKE_PART_LEVEL }).map((_, index) => (
          <i key={index} className={index < level ? "is-on" : ""} />
        ))}
      </div>
      <div className="bike-part-upgrade__next">
        <span>
          {atMax
            ? "CONFIGURAÇÃO MÁXIMA"
            : unlocked
              ? `PRÓXIMO · ${nextTier?.name ?? part.name}`
              : `LIBERA NO NÍVEL ${part.unlockLevel}`}
        </span>
        <button
          onClick={() => handle.upgradeBikePart(part.id as BikePartId)}
          disabled={!unlocked || atMax}
        >
          {atMax
            ? "MÁXIMO"
            : !unlocked
              ? "BLOQUEADO"
              : `MELHORAR · ${formatCredits(cost ?? 0)}`}
        </button>
      </div>
    </article>
  );
}

function GarageScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const selected = getVehicle(snapshot.campaign.selectedVehicleId);
  const companyLevel = companyLevelFromXp(snapshot.campaign.companyXp);
  const selectedLevel = snapshot.campaign.vehicleLevels[selected.id] || 1;
  const bikeCondition = snapshot.campaign.tireCondition.bike;
  const bikeServiceCost = bikeMaintenanceCost(
    bikeCondition,
    snapshot.campaign.bikePartLevels
  );

  return (
    <section
      className="game-screen garage-screen"
      style={{ backgroundImage: `url(${GAME_ASSETS.garage})` }}
    >
      <div className="garage-shade" />
      <header className="garage-header">
        <BrandLockup compact />
        <div className="garage-header__metrics">
          <span>
            <Coins size={16} /> XB$ {money.format(snapshot.campaign.credits)}
          </span>
          <span>
            <Star size={16} /> {money.format(snapshot.campaign.reputation)} REP
          </span>
          <span>
            <Building2 size={16} /> NÍVEL {companyLevel}
          </span>
          <button onClick={() => handle.goBase()}>VOLTAR À CENTRAL</button>
        </div>
      </header>

      <main className="garage-content">
        <section className="garage-intro">
          <div>
            <p className="eyebrow">
              <span>OFICINA</span> CENTRO DE EVOLUÇÃO
            </p>
            <h1>
              TRANSFORME CADA
              <br />
              <em>QUILÔMETRO</em> EM ESCALA.
            </h1>
          </div>
          <div className="selected-operation">
            <small>OPERAÇÃO ATUAL</small>
            <strong>{selected.name}</strong>
            <span>
              Nível {selectedLevel}/5 · {selected.era} · {selected.route}
            </span>
            <img
              className="garage-mascot"
              src={GAME_ASSETS.driver}
              alt="Mascote em uniforme azul-marinho fazendo sinal de positivo"
            />
          </div>
        </section>

        <img
          className="garage-progression-art"
          src={GAME_ASSETS.reference}
          alt="Frota evoluindo da bicicleta ao transporte planetário"
        />

        {snapshot.notice && (
          <div className="game-notice" role="status" aria-live="polite">
            <Sparkles size={16} /> {snapshot.notice}
          </div>
        )}

        <section className="bike-parts-workshop">
          <div className="section-heading">
            <span>MVP</span>
            <div>
              <small>DA PRIMEIRA ENTREGA À MICROFROTA</small>
              <h2>OFICINA DA BICICLETA</h2>
            </div>
          </div>
          <div className="bike-parts-summary">
            <div>
              <small>CONDIÇÃO MECÂNICA</small>
              <strong>{Math.round(bikeCondition)}%</strong>
              <div
                role="progressbar"
                aria-label="Condição da bicicleta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(bikeCondition)}
              >
                <i style={{ width: `${bikeCondition}%` }} />
              </div>
            </div>
            <button
              onClick={() => handle.maintainBike()}
              disabled={bikeCondition >= 100}
            >
              <Wrench size={16} />{" "}
              {bikeCondition >= 100
                ? "REVISÃO EM DIA"
                : `REVISAR · ${formatCredits(bikeServiceCost)}`}
            </button>
          </div>
          <div className="bike-parts-grid">
            {BIKE_PARTS.map(part => (
              <BikePartUpgrade
                key={part.id}
                part={part}
                snapshot={snapshot}
                handle={handle}
              />
            ))}
          </div>
        </section>

        <div className="garage-panels">
          <section className="vehicle-catalog">
            <div className="section-heading">
              <span>01</span>
              <div>
                <small>ESCALA DA EMPRESA</small>
                <h2>FROTA, NÍVEIS & NOVAS ERAS</h2>
              </div>
            </div>
            <div className="vehicle-grid">
              {snapshot.vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  snapshot={snapshot}
                  handle={handle}
                />
              ))}
            </div>
          </section>

          <section className="tire-workshop">
            <div className="section-heading">
              <span>02</span>
              <div>
                <small>TECNOLOGIA CENTRAL</small>
                <h2>PNEUS XB PERFORMANCE</h2>
              </div>
            </div>
            <div className="tire-stack">
              {TIRE_STATS.map(stat => (
                <TireUpgrade
                  key={stat.id}
                  stat={stat}
                  snapshot={snapshot}
                  handle={handle}
                />
              ))}
            </div>
            <div className="tire-principle">
              <ShieldCheck size={28} />
              <p>
                <strong>
                  Oficina nível {snapshot.campaign.buildingLevels.workshop}.
                </strong>{" "}
                Cada pesquisa afeta controle, integridade, receita ou capacidade
                em tempo real.
              </p>
            </div>
          </section>
        </div>

        <TireStrategyPanel campaign={snapshot.campaign} handle={handle} />

        <div className="garage-bottom-actions">
          <button
            className="xb-button xb-button--primary"
            onClick={() => handle.goRoutes()}
          >
            <Flag size={18} /> ESCOLHER ROTA PARA PILOTAR
          </button>
          <button
            className="reset-button"
            onClick={() => {
              if (window.confirm("Reiniciar toda a campanha?"))
                handle.resetProgress();
            }}
          >
            <RotateCcw size={15} /> REINICIAR CAMPANHA
          </button>
        </div>
      </main>
    </section>
  );
}

function RunningHud({
  snapshot,
  handle,
  canvasRef,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const run = snapshot.run as typeof snapshot.run & {
    routeId?: string;
    routeName?: string;
  };
  const vehicle = getVehicle(
    run.vehicleId ?? snapshot.campaign.selectedVehicleId
  );
  const routeName =
    run.routeName ??
    ROUTES.find(route => route.id === run.routeId)?.name ??
    vehicle.route;

  useEffect(() => {
    // O motor escuta o teclado no próprio canvas: sem foco a rota não responde.
    const frame = window.requestAnimationFrame(() =>
      canvasRef.current?.focus()
    );
    return () => window.cancelAnimationFrame(frame);
  }, [canvasRef]);

  return (
    <section
      className="running-hud"
      data-pilot-focus="active"
      data-v270-input={
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0
          ? "touch"
          : "keyboard"
      }
      aria-label="Telemetria da corrida"
    >
      <div className="hud-topline">
        <BrandLockup compact />
        <div className="route-chip">
          <span>ERA {String(vehicle.order + 1).padStart(2, "0")}</span>
          <strong>{routeName}</strong>
        </div>
        <div className="hud-score">
          <small>PONTUAÇÃO</small>
          <strong>{money.format(snapshot.run.score)}</strong>
        </div>
        <button
          className="pause-button"
          onClick={() => handle.pauseRun()}
          aria-label="Pausar corrida"
        >
          <Pause size={18} /> <span>PAUSAR</span>
        </button>
      </div>

      <PilotFocusLayer snapshot={snapshot} />

      <div className="hud-navigation-stack">
        <LiveMinimap progress={snapshot.run.progress} routeName={routeName} />
      </div>

      <div
        key={snapshot.run.impactSerial}
        className={snapshot.run.impactSerial ? "impact-frame" : ""}
      />

      <div className="touch-controls">
        <button
          data-v270-control="left"
          onClick={() => handle.moveLeft()}
          aria-label="Mover para a faixa esquerda"
        >
          <ArrowLeft />
          <span>ESQUERDA</span>
        </button>
        <button
          data-v270-control="right"
          onClick={() => handle.moveRight()}
          aria-label="Mover para a faixa direita"
        >
          <ArrowRight />
          <span>DIREITA</span>
        </button>
        <button
          data-v270-control="turbo"
          className={`turbo-action ${snapshot.run.turboActive ? "is-active" : ""}`}
          onClick={() => handle.activateTurbo()}
          disabled={snapshot.run.turboActive || snapshot.run.turboEnergy < 100}
          aria-label={
            snapshot.run.turboActive
              ? "Turbo Borracha XB ativo"
              : snapshot.run.turboEnergy >= 100
                ? "Ativar Turbo Borracha XB"
                : `Turbo Borracha XB carregando, ${Math.round(snapshot.run.turboEnergy)} por cento`
          }
        >
          <Sparkles />
          <span>
            {snapshot.run.turboActive
              ? "TURBO ATIVO"
              : snapshot.run.turboEnergy >= 100
                ? "ATIVAR TURBO"
                : `${Math.round(snapshot.run.turboEnergy)}%`}
          </span>
        </button>
      </div>

      <div className="hud-instruction" aria-hidden="true">
        ← → / A D <span>MUDE DE FAIXA</span> · ESPAÇO <span>TURBO</span> · P{" "}
        <span>PAUSAR</span>
      </div>
    </section>
  );
}

function PauseOverlay({ handle }: { handle: GameHandle }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  useFocusTrap(panelRef, { onEscape: () => handle.resumeRun() });

  return (
    <section
      className="pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div ref={panelRef} className="pause-panel">
        <Pause size={38} aria-hidden="true" />
        <p className="eyebrow">
          <span>BOX</span> OPERAÇÃO PAUSADA
        </p>
        <h1 id="pause-title">PIT STOP.</h1>
        <p>
          A rota está segura. Continue quando estiver pronto ou encerre a
          viagem.
        </p>
        <div className="pause-actions">
          <button
            ref={resumeRef}
            className="xb-button xb-button--primary"
            onClick={() => handle.resumeRun()}
          >
            <Play size={18} /> CONTINUAR
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.abortRun()}
          >
            <LogOut size={18} /> ENCERRAR E VER RELATÓRIO
          </button>
          <button
            className="pause-menu-button"
            onClick={() => {
              handle.abortRun();
              handle.goMenu();
            }}
          >
            <LogOut size={16} /> VOLTAR AO MENU INICIAL
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const result = snapshot.lastResult;
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const run = snapshot.run as typeof snapshot.run & {
    routeId?: string;
    routeName?: string;
    operatingCost?: number;
  };
  const resultRouteId = result?.routeId ?? run.routeId;

  useEffect(() => {
    primaryActionRef.current?.focus();
  }, []);

  useFocusTrap(panelRef, { onEscape: () => handle.goRoutes() });

  if (!result) return null;
  const vehicle = getVehicle(
    result.vehicleId ?? run.vehicleId ?? snapshot.campaign.selectedVehicleId
  );
  const resultRoute = ROUTES.find(route => route.id === resultRouteId);
  const resultRouteName = run.routeName ?? resultRoute?.name ?? vehicle.route;
  const operatingCost = result.operatingCost ?? run.operatingCost;
  const wasAborted = Boolean(result.aborted);
  const netCredits = result.netCreditsEarned ?? result.creditsEarned;
  const repeatValidation = resultRouteId
    ? handle.previewRoute(resultRouteId)
    : { ok: false, message: "Escolha um contrato na Central de Rotas." };
  const canRepeat = Boolean(resultRouteId && repeatValidation.ok);

  return (
    <section
      className="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div
        ref={panelRef}
        className={`result-panel ${wasAborted ? "is-aborted" : result.success ? "is-success" : "is-failure"}`}
      >
        <div className="result-stamp">
          {wasAborted ? <LogOut /> : result.success ? <Check /> : <Wrench />}
        </div>
        <p className="eyebrow">
          <span>RELATÓRIO</span> ROTA FINALIZADA
        </p>
        <h1 id="result-title">
          {wasAborted
            ? "ROTA ENCERRADA."
            : result.success
              ? "ENTREGA CONCLUÍDA."
              : "HORA DE REVISAR."}
        </h1>
        <p>
          {wasAborted
            ? `A operação ${resultRouteName} foi encerrada voluntariamente. O custo já mobilizado não é reembolsável.`
            : result.success
              ? `${resultRouteName} agora faz parte da história da sua empresa.`
              : "A carga voltou para a base. Melhore a durabilidade e tente novamente."}
        </p>

        <div className="result-primary">
          <small>
            {wasAborted ? "SALDO LÍQUIDO DO ENCERRAMENTO" : "SALDO LÍQUIDO"}
          </small>
          <strong>XB$ {money.format(netCredits)}</strong>
          <span>+{result.reputationEarned} reputação</span>
          {result.perfectRoute && (
            <em className="perfect-route-badge">
              <Sparkles size={14} /> ROTA PERFEITA · BÔNUS TURBO XB
            </em>
          )}
        </div>

        <div className="result-grid">
          <span>
            <small>DISTÂNCIA</small>
            <strong>{result.distance} km</strong>
          </span>
          <span>
            <small>VOLUMES</small>
            <strong>{result.cargo}</strong>
          </span>
          <span>
            <small>PNEUS XB</small>
            <strong>{result.tireTokens}</strong>
          </span>
          <span>
            <small>INTEGRIDADE</small>
            <strong>{result.integrity}%</strong>
          </span>
          {typeof operatingCost === "number" && (
            <span>
              <small>CUSTO OPERACIONAL</small>
              <strong>XB$ {money.format(operatingCost)}</strong>
            </span>
          )}
          {typeof result.baseCreditsEarned === "number" && (
            <span>
              <small>CONTRATO BASE</small>
              <strong>XB$ {money.format(result.baseCreditsEarned)}</strong>
            </span>
          )}
          {typeof result.collectibleBonusCredits === "number" &&
            result.collectibleBonusCredits > 0 && (
              <span>
                <small>BÔNUS DE COLETA</small>
                <strong>
                  XB$ {money.format(result.collectibleBonusCredits)}
                </strong>
              </span>
            )}
          {typeof result.perfectRouteBonusCredits === "number" &&
            result.perfectRouteBonusCredits > 0 && (
              <span>
                <small>BÔNUS ROTA PERFEITA</small>
                <strong>
                  XB$ {money.format(result.perfectRouteBonusCredits)}
                </strong>
              </span>
            )}
          {typeof result.grossCreditsEarned === "number" && (
            <span>
              <small>RECEITA BRUTA</small>
              <strong>XB$ {money.format(result.grossCreditsEarned)}</strong>
            </span>
          )}
          {typeof result.turboActivations === "number" &&
            result.turboActivations > 0 && (
              <span>
                <small>TURBO XB</small>
                <strong>{result.turboActivations}× ATIVADO</strong>
              </span>
            )}
        </div>

        {!canRepeat && (
          <p
            className="result-repeat-status"
            id="result-repeat-status"
            role="status"
          >
            <Wrench size={15} aria-hidden="true" /> Para repetir:{" "}
            {repeatValidation.message}
          </p>
        )}

        <div className="result-actions">
          <button
            ref={primaryActionRef}
            className="xb-button xb-button--primary"
            onClick={() => handle.goBase()}
          >
            <Home size={18} /> IR PARA CENTRAL
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.goRoutes()}
          >
            <MapPinned size={18} /> ESCOLHER ROTA
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => canRepeat && handle.startRun(resultRouteId)}
            disabled={!canRepeat}
            aria-describedby={canRepeat ? undefined : "result-repeat-status"}
          >
            <Route size={18} /> REPETIR
          </button>
        </div>
      </div>
    </section>
  );
}

function CompleteScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const finalResult =
    snapshot.lastResult?.routeId === "rede-solar-final"
      ? snapshot.lastResult
      : null;
  return (
    <section
      className="game-screen complete-screen"
      style={{ backgroundImage: `url(${GAME_ASSETS.planetary})` }}
    >
      <div className="complete-shade" />
      <header className="complete-header">
        <BrandLockup />
      </header>
      <main className="complete-copy">
        <p className="eyebrow">
          <span>ERA 06</span> ROTA PLANETÁRIA
        </p>
        <h1>
          VOCÊ MOVEU
          <br />
          <em>O MUNDO.</em>
        </h1>
        <p>
          Da primeira entrega de bicicleta à maior operação logística da
          história da XB Technology. Agora, cada horizonte é uma nova rota.
        </p>
        <div className="complete-stats">
          <span>
            <small>ENTREGAS</small>
            <strong>{money.format(snapshot.campaign.deliveries)}</strong>
          </span>
          <span>
            <small>DISTÂNCIA</small>
            <strong>{money.format(snapshot.campaign.totalDistance)} km</strong>
          </span>
          <span>
            <small>REPUTAÇÃO</small>
            <strong>{money.format(snapshot.campaign.reputation)}</strong>
          </span>
          {finalResult && (
            <>
              <span>
                <small>SALDO LÍQUIDO DA ROTA</small>
                <strong>
                  XB${" "}
                  {money.format(
                    finalResult.netCreditsEarned ?? finalResult.creditsEarned
                  )}
                </strong>
              </span>
              <span>
                <small>CUSTO OPERACIONAL</small>
                <strong>
                  XB$ {money.format(finalResult.operatingCost ?? 0)}
                </strong>
              </span>
            </>
          )}
        </div>
        <div className="menu-actions">
          <button
            className="xb-button xb-button--primary"
            onClick={() => handle.goRoutes()}
          >
            <Globe2 size={19} /> ESCOLHER OPERAÇÃO
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.goBase()}
          >
            <Building2 size={18} /> CENTRAL LOGÍSTICA
          </button>
        </div>
      </main>
    </section>
  );
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const handleRef = useRef<GameHandle | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const feedbackRef = useRef<GameFeedback | null>(null);
  const trilhaRef = useRef<TrilhaSonora | null>(null);
  const modeRef = useRef<string>("loading");
  const [qualityPreference, setQualityPreference] = useState<QualityPreference>(
    loadQualityPreference
  );
  const qualitySettings = useMemo(
    () => resolveQualitySettings(qualityPreference),
    [qualityPreference]
  );
  const qualitySettingsRef = useRef(qualitySettings);
  const [feedbackPreferences, setFeedbackPreferences] =
    useState<FeedbackPreferences>(loadFeedbackPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /*
   * Decidido uma vez, na primeira pintura: se isto fosse recalculado a cada
   * volta do React, marcar como vista faria o filme sumir no meio.
   */
  /*
   * O filme so comeca quando a pessoa aperta PLAY GAME — por isso nasce
   * desligado, e nao com deveRodarAbertura(). Quem pergunta se ainda ha filme
   * a ver e o clique, na hora do clique.
   */
  const [filmeRodando, setFilmeRodando] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  /*
   * O MAPA E A TELA PRINCIPAL DO JOGO, e nao uma tela de passagem.
   *
   * A pessoa abre o jogo e esta no bairro, nao numa planilha. Por isso o mapa
   * NAO some sozinho depois de aparecer uma vez, como o filme faz: ele fica,
   * e a pessoa sai dele quando quiser.
   *
   * Quem ja se apresentou cai direto nele ao entrar.
   */
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  /*
   * A CHAMADA QUE COMECA O JOGO.
   *
   * Sete segundos depois de o bairro aparecer, o telefone toca. Nao e enrolacao:
   * e o tempo de a pessoa OLHAR o lugar antes de alguem falar com ela. Se a
   * ligacao entrasse junto com o mapa, ela nunca teria visto onde a historia
   * acontece.
   *
   * "Ja atendeu" fica separado de "esta tocando" porque as duas coisas nao sao a
   * mesma: a ligacao toca uma vez por entrada, e nao volta a tocar quando a
   * pessoa vai a central e devolve para o mapa.
   */
  const [chamando, setChamando] = useState(false);
  const jaChamou = useRef(false);
  /*
   * QUANTAS VEZES ELA JA FOI RECUSADA, e a conversa que veio depois.
   *
   * "Se o usuario tem a possibilidade de nao atender por duas vezes, na terceira
   * ja abre com a mensagem de Renan."
   *
   * Recusar nao e caminho morto: e o caminho que tem a melhor piada. Na terceira
   * ele desiste do telefone e manda mensagem, que e o que qualquer um faz depois
   * de duas ligacoes ignoradas — e a brincadeira so funciona porque a pessoa
   * SABE que ignorou duas vezes.
   */
  const [recusas, setRecusas] = useState(0);
  /**
   * QUANDO A LIGACAO CAI DENTRO DO APLICATIVO.
   *
   * Ordem dele, 07/09/2026: "apos atender chamada, iremos conectar whats app
   * app real dentro do game para comunicacao real entre npcs".
   *
   * Nao ha mais uma tela de conversa so da abertura. Atender abre o XBWAPP JA
   * DENTRO da conversa do Renan — a primeira coisa que a pessoa faz no jogo
   * acontece na ferramenta que ela vai usar o jogo inteiro, e nao numa tela
   * especial que some depois e nunca mais volta.
   */
  const [abrirNaConversa, setAbrirNaConversa] = useState<IdContato | null>(
    null
  );
  /** O aviso de pedido novo abre o aplicativo direto no balcao. */
  const [abrirNaAba, setAbrirNaAba] = useState<"entregaRapida" | null>(null);

  /*
   * O DRONE DA XB — a resposta ao "vamos resolver isso".
   *
   * "Quando diz 'vamos resolver isso', um drone passa por nossos olhos icando a
   * caixa, voa proximo do entregador, desce a caixa no chao e volta para frente
   * de nossos olhos."
   *
   * Ele vive AQUI, e nao dentro da conversa, porque a cena acontece no bairro
   * depois que o telefone sai da frente — e porque a caixa fica no chao quando o
   * voo acaba. Estado que morre junto com a tela que o criou levaria a encomenda
   * embora.
   */
  const [droneEntregando, setDroneEntregando] = useState(false);
  /*
   * A conversa escrita fica PARADA enquanto o drone voa. Ela so volta quando
   * a caixa abre — junto com o aviso no alto da tela. Sem isso o Renan
   * comentava o bau antes de o bau existir.
   */
  const [cenaLigada, setCenaLigada] = useState(true);
  /*
   * A praca volta a ser so a praca depois que a pessoa sai do XBWAPP.
   *
   * Ordem dele, 08/09/2026. A conversa termina com quem joga mandando o
   * Renan ir buscar a pizza — entao ele foi. Deixar o menino parado ao lado
   * da caixa aberta contaria que ele continua esperando ali.
   *
   * A marca guarda que o bau chegou a abrir: sair do aplicativo ANTES da
   * cena nao esvazia a praca, senao a encomenda sumiria antes de acontecer.
   */
  const oBauAbriu = useRef(false);
  const [pracaLimpa, setPracaLimpa] = useState(false);
  /*
   * ── O AVISO DO XBWAPP, NO CANTO DE CIMA ──────────────────────────────────
   *
   * Ordem dele, 08/09/2026: "apos abrir o bau chega uma notificacao XB no
   * topo direito da tela, igual WhatsApp; ao abrir, mostra na conversa a
   * imagem enviada pelo Renan".
   *
   * A mala abre no bairro, e o telefone avisa. E o mesmo minuto em que a
   * pessoa esta olhando o que chegou — o aviso nao interrompe a cena, ele
   * chega junto com ela.
   *
   * O aviso FICA ate ser tocado, e nao some sozinho como o do telefone de
   * verdade. Aqui ele nao e um recado a mais no dia: e por onde a historia
   * continua. Um aviso que some levaria a historia junto.
   */
  const [avisoDoApp, setAvisoDoApp] = useState<{
    /* De quem e a mensagem — e a conversa que o toque no aviso abre. */
    de: IdContato;
    quem: string;
    texto: string;
    /*
     * QUANDO O AVISO NAO E DE UMA PESSOA.
     *
     * Pedido novo no balcao nao abre conversa nenhuma: abre a aba do balcao.
     * Quando este campo vem preenchido, o toque no aviso leva a pessoa direto
     * para a aba — e o selo do cartao vira o prata, que e o da propria XB.
     */
    aba?: "entregaRapida";
  } | null>(null);

  /*
   * O XBWAPP — o aplicativo de mensagens do jogo.
   *
   * O estado dele mora AQUI, e nao dentro do aplicativo, por um motivo: fechar
   * o aplicativo nao pode apagar a conversa. Quem avisou a dona Ilda que ia
   * atrasar, avisou — e o aviso continua valendo quando ela volta do mapa.
   *
   * E e daqui que o aviso de nao lidas sai para o botao do mapa: sem isso, a
   * pessoa so descobriria que a loja chamou se abrisse o aplicativo por acaso.
   */
  /*
   * O JOGO ACOPLA A PONTE DO APLICATIVO.
   *
   * O XBWAPP nao conhece o jogo: ele conhece uma ponte com quatro perguntas —
   * que horas sao, qual a distancia, qual o prazo, quem e o jogador. Aqui o
   * jogo responde as quatro. Sem isto o aplicativo continua abrindo, so que
   * sem bairro.
   */
  const nomeDoJogador = useRef("Entregador");

  useEffect(() => {
    acoplar({
      /*
       * O RELOGIO DO APLICATIVO E O RELOGIO DO BAIRRO.
       *
       * Antes esta resposta era 9h fixo, e por isso o tempo dentro do
       * aplicativo nunca andava — prazo de entrega parado nao e prazo. Agora
       * ela le o relogio que o efeito abaixo empurra.
       */
      minutoDoDia: () => minutoDoBairro.current,
      kmDaCorrida,
      kmDaEntrega,
      prazoEmMinutos,
      /*
       * O PRECO SAI DA MESMA TABELA QUE PAGA O RESTO DO JOGO. O aplicativo
       * pergunta; quem responde e o freight, com as fontes anotadas la.
       */
      freteDaCorrida: (km, volumes) => calcularFrete("bicicleta", km, volumes),
      jogador: () => ({ nome: nomeDoJogador.current }),
    });
    return () => acoplar(null);
  }, []);

  const [appAberto, setAppAberto] = useState(false);
  const [estadoDoApp, setEstadoDoApp] = useState<EstadoDoApp>(() =>
    semear(estadoInicialDoApp(), ["padaria", "grupo-bairro", "xb"])
  );
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

  /*
   * "VAMOS RESOLVER ISSO" E O GANCHO, e ele mora no ESTADO DA CONVERSA.
   *
   * Quando a pessoa manda essa resposta, o roteiro do Renan anda para o passo
   * seguinte — e e isso que o jogo escuta. Nao ha um aviso especial ligando a
   * tela de mensagens a cena do drone: a conversa faz o que uma conversa faz, e
   * o jogo repara no que ela virou.
   *
   * Espera um instante antes de tirar o telefone da frente: a fala dela precisa
   * POUSAR na conversa antes de a tela sair. Cortar no mesmo quadro em que ela
   * toca em enviar faria parecer que o botao fecha o aplicativo, e nao que a
   * frase fez alguma coisa acontecer no bairro.
   *
   * E o que o Renan escreve depois fica esperando com o aviso de nao lida no
   * botao do mapa — que e exatamente o que um telefone de verdade faz.
   */
  /*
   * ── TODA MENSAGEM QUE CHEGA COM O APLICATIVO FECHADO VIRA AVISO ──────────
   *
   * Ordem dele, 08/09/2026: "precisamos comecar a receber notificacoes no
   * topo da tela; independente do zoom, a notificacao fica no topo".
   *
   * Antes so a caixa abrindo levantava um aviso. Agora e qualquer mensagem:
   * o jogo olha a conta de nao lidas e, sempre que ela CRESCE com o
   * aplicativo fechado, mostra quem mandou e o que mandou.
   *
   * Vale a conta, e nao a lista de mensagens: assim uma mensagem que a pessoa
   * ja leu e o aplicativo re-anotando alguma coisa nao viram aviso do nada.
   *
   * O primeiro numero visto NAO avisa. Sem isso, quem volta a um jogo salvo
   * com mensagens pendentes levaria um aviso de recado velho na cara.
   */
  const naoLidasAntes = useRef<number | null>(null);
  useEffect(() => {
    const agora = totalNaoLidas(estadoDoApp);
    const antes = naoLidasAntes.current;
    naoLidasAntes.current = agora;
    if (antes === null || agora <= antes) return;
    if (appAberto) return;

    /* A ultima que chegou de outra pessoa: e ela que o aviso mostra. */
    const ultima = [...estadoDoApp.mensagens]
      .reverse()
      .find(m => m.de !== "voce");
    if (!ultima) return;
    setAvisoDoApp({
      de: ultima.de as IdContato,
      quem: nomeDe(ultima.de),
      texto:
        ultima.tipo === "foto"
          ? (ultima.texto ?? "Foto")
          : ultima.tipo === "audio"
            ? "Áudio"
            : ultima.texto,
    });
  }, [estadoDoApp, appAberto]);

  /*
   * O TOQUE DE MENSAGEM NOVA.
   *
   * Ordem dele, 08/09/2026: "PRECISAMOS GERAR UM TOQUE CADA VEZ QUE RECEBERMOS
   * NOTIFICACOES."
   *
   * Ele toca quando o aviso NASCE, e nao a cada vez que o aviso muda de texto:
   * a mesma conversa que continua chegando trocaria a frase do cartao varias
   * vezes seguidas, e um toque por troca viraria metralhadora. Por isso a
   * comparacao guarda de QUEM era o aviso anterior — mensagem nova de outra
   * pessoa toca de novo; a mesma pessoa emendando, nao.
   */
  const deQuemEraOAviso = useRef<IdContato | null>(null);
  useEffect(() => {
    const de = avisoDoApp?.de ?? null;
    if (de && de !== deQuemEraOAviso.current) {
      tocarAvisoDeMensagem(feedbackPreferences.soundEnabled);
    }
    deQuemEraOAviso.current = de;
  }, [avisoDoApp, feedbackPreferences.soundEnabled]);

  /*
   * ── O RELOGIO DO BAIRRO ──────────────────────────────────────────────────
   *
   * O aplicativo tinha um relogio que nunca andava: a ponte respondia "sao 9h"
   * para sempre. Dava para viver com isso enquanto o aplicativo so tinha
   * conversa; com o balcao de Entrega Rapida nao da mais, porque o prazo dele
   * corre desde a publicacao — ordem dele — e prazo parado nao e prazo.
   *
   * O passo e de UM SEGUNDO, e o segundo do balcao e um segundo de verdade —
   * medida dele: "tempo normal de entrega seria 10 segundos entre coleta e
   * entrega". Sendo assim, a bolinha muda de cor enquanto a pessoa olha, que e
   * exatamente o que ele pediu. O relogio de conversa continua andando bem
   * mais devagar, um minuto para cada minuto de balcao.
   */
  const minutoDoBairro = useRef(estadoDoApp.minuto);
  minutoDoBairro.current = estadoDoApp.minuto;
  const segundosDoBalcao = useRef(estadoDoApp.relogioDoBalcao);
  segundosDoBalcao.current = estadoDoApp.relogioDoBalcao;
  const quantosNaEquipe = useRef(0);
  /*
   * O BALCAO SO ABRE DEPOIS DA HISTORIA.
   *
   * `pracaLimpa` fica verdadeiro quando a pessoa sai do aplicativo depois da
   * conversa do Renan — ou seja, quando a abertura acabou. Antes disso o
   * relogio nao anda e o bairro nao publica nada: pedido chegando por cima da
   * cena que ensina o jogo roubaria a cena, e pior, os primeiros pedidos
   * estourariam sozinhos enquanto a pessoa ainda nem sabe que existe um
   * balcao.
   */
  const bairroRodando =
    mostrandoMapa && pracaLimpa && !apresentando && !filmeRodando && !chamando;
  useEffect(() => {
    if (!bairroRodando) return;
    const relogio = window.setInterval(() => {
      setEstadoDoApp(atual => {
        /*
         * O TAMANHO DA EQUIPE entra no balcao a cada segundo porque e ele que
         * traz cliente perdido de volta: quem saiu da carteira so reabre a
         * porta quando a XB fica maior do que era no dia em que ele saiu.
         */
        const comBalcao = passarUmSegundo(atual, quantosNaEquipe.current);
        /*
         * O relogio de CONVERSA anda a cada minuto de balcao, e nao a cada
         * segundo: "12:30" no alto da mensagem e o horario do bairro, e o
         * bairro nao vive um dia inteiro em quinze minutos de jogo.
         */
        return comBalcao.relogioDoBalcao % 60 === 0
          ? { ...comBalcao, minuto: comBalcao.minuto + 1 }
          : comBalcao;
      });
    }, 1000);
    return () => window.clearInterval(relogio);
  }, [bairroRodando]);

  /*
   * ── QUEM A XB TEM NA RUA ─────────────────────────────────────────────────
   *
   * Livre e quem nao esta numa entrega do jogo NEM num pedido do balcao. Sem a
   * segunda metade, o mesmo entregador seria mandado em tres pedidos ao mesmo
   * tempo e a tela mentiria para quem despacha.
   */
  const equipeDaXB = useMemo(() => {
    const ocupadosNoBalcao = new Set(
      estadoDoApp.ofertas
        .filter(o => o.situacao === "na-fila" || o.situacao === "rodando")
        .map(o => o.entregador)
        .filter((n): n is string => Boolean(n))
    );
    const contratados = snapshot?.campaign.hiredCouriers ?? [];
    const naRua = snapshot?.campaign.activeDeliveries ?? [];
    return contratados.map(c => ({
      id: c.id,
      nome: c.name,
      /*
       * O RETRATO DE CADA UM. O Renan tem desenho proprio; os outros sete saem
       * dos oito desenhos de entregador, na ordem da lista de candidatos.
       * Quem nao tiver retrato aparece com a inicial, como no resto do
       * aplicativo — ninguem fica sem cara.
       */
      foto:
        c.candidatoId === QUEM_LIGA.id
          ? GAME_ASSETS.renanEquipado
          : retratoDoCandidato(c.candidatoId),
      livre:
        !ocupadosNoBalcao.has(c.name) &&
        !naRua.some(d => d.operatorId === c.id),
    }));
  }, [snapshot, estadoDoApp.ofertas]);
  quantosNaEquipe.current = equipeDaXB.length;

  /*
   * ── O AVISO DE PEDIDO NOVO ───────────────────────────────────────────────
   *
   * Ele so aparece com o aplicativo FECHADO, e so depois que a historia da
   * abertura terminou: pedido chegando por cima da conversa do Renan roubaria
   * a cena que ensina o jogo.
   *
   * O selo dele e o prata, porque quem esta avisando e a propria XB, e tocar
   * nele leva direto ao balcao — nao a uma conversa.
   */
  const ultimoPedidoAvisado = useRef<string | null>(null);
  useEffect(() => {
    if (appAberto || !pracaLimpa) return;
    const abertas = ofertasAbertas(estadoDoApp);
    const ultima = abertas[abertas.length - 1];
    if (!ultima || ultimoPedidoAvisado.current === ultima.id) return;
    ultimoPedidoAvisado.current = ultima.id;
    setAvisoDoApp({
      de: "xb",
      quem: `Pedido ${ultima.id}`,
      texto: `${trajeto(ultima)} · ${emReais(ultima.frete)} · ${ultima.prazoS}s`,
      aba: "entregaRapida",
    });
  }, [estadoDoApp, appAberto, pracaLimpa]);

  /*
   * ── O PERCURSO DESENHADO NO MAPA ─────────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: "ao clicar em aceitar, apareca o icone de coleta,
   * e entrega e entregador comece percurso".
   *
   * Enquanto ninguem aceitou nada, o mapa segue mostrando a corrida de
   * abertura — que e a que a historia usa. Assim que ha uma rota com parada, o
   * mapa passa a mostrar ELA: os pinos do que falta passar, o tracado pelas
   * ruas e o entregador andando.
   *
   * Mostra a rota de QUEM TEM UMA. Com uma pessoa so na empresa, e sempre a
   * mesma; quando houver equipe, esta e a linha que vira "qual entregador o
   * mapa esta seguindo" — e ai vira escolha dele.
   */
  /*
   * ── O RENAN E O ENTREGADOR DO MAPA — um so, com um relogio so ───────────
   *
   * Ordem dele, 10/09/2026: "retire a bola azul do game, a bola azul deve ser
   * Renan coletando e entregando".
   *
   * A rota seguida e a do Renan. Se ele estiver sem pedido e outra pessoa da
   * equipe estiver rodando, o mapa segue quem esta rodando — o mesmo criterio
   * de antes. Sem pedido nenhum, ele fica em pe com a bicicleta na porta do
   * ultimo lugar onde parou (no comeco do dia, a pizzaria).
   */
  const rotaNoMapa = useMemo(() => {
    const doRenan = rotaDe(estadoDoApp, QUEM_LIGA.nome);
    if (doRenan.paradas.length > 0) return doRenan;
    return (
      Object.values(estadoDoApp.rotas).find(r => r.paradas.length > 0) ??
      doRenan
    );
  }, [estadoDoApp.rotas]);
  /*
   * O DESENHO DA ROTA SO E REFEITO QUANDO A ROTA MUDA DE VERDADE — outro
   * lugar de partida, outra fila de paradas, outro veiculo. O relogio do
   * balcao troca o estado a cada segundo; se o tracado fosse refeito junto, o
   * menino voltaria ao comeco do caminho uma vez por segundo.
   */
  const chaveDoTracado = [
    rotaNoMapa.em,
    rotaNoMapa.veiculo,
    ...rotaNoMapa.paradas.map(p => `${p.pedido}:${p.o}:${p.lugar}`),
  ].join("|");
  const rotaDoTracado = useRef(rotaNoMapa);
  rotaDoTracado.current = rotaNoMapa;
  /*
   * UM CAMINHO SO PARA A CORRIDA INTEIRA (ver planoPara, em oPercursoNoMapa):
   * passar por uma porta nao refaz o caminho — so a corrida mudar de verdade,
   * com pedido novo na fila. Refazer a cada porta parava o jogo um quarto de
   * segundo e deixava o Renan sumido nesse tempo.
   */
  const planoAnterior = useRef<PlanoDoPercurso | null>(null);
  const plano = useMemo(() => {
    const novo = planoPara(rotaDoTracado.current, planoAnterior.current);
    planoAnterior.current = novo;
    return novo;
  }, [chaveDoTracado]);
  const espera = useMemo(
    () => (plano ? null : esperaNoMapa(rotaDoTracado.current)),
    [plano, chaveDoTracado]
  );
  const tracado: TracadoDoPercurso = plano ?? espera!;
  const progresso = useMemo(
    () => (plano ? progressoNoPlano(rotaNoMapa, plano) : null),
    [rotaNoMapa, plano]
  );
  const percurso =
    rotaNoMapa.paradas.length > 0
      ? { paradas: pinosDaRota(rotaNoMapa), onde: progresso?.onde }
      : null;
  const comandoDoEntregador = useMemo<ComandoDoEntregador>(
    () => ({
      metros: progresso?.metros ?? 0,
      ate: progresso?.ate ?? 0,
      // Com o balcao parado (historia, filme, chamada), o desenho para junto.
      metrosPorSegundo: bairroRodando ? (progresso?.metrosPorSegundo ?? 0) : 0,
      naPorta: progresso?.naPorta ?? null,
      parado: !progresso || progresso.parado,
    }),
    [progresso, bairroRodando]
  );

  /*
   * ── A MAO QUE MOSTRA ONDE TOCAR, E O AVISO QUE ABRE SOZINHO ─────────────
   *
   * Ordem dele, 08/09/2026: "depois de drone voar ate renan, devemos mostrar a
   * usuario onde ele deve clicar, gere algum formato de mao mostrando onde
   * usuario deve clicar, caso nao clique 5 segundos 10 segundos notificacao e
   * aberta automaticamente na tela".
   *
   * A mao aparece junto com o aviso: quem nunca jogou nao sabe que aquele
   * cartao no alto e clicavel, e a abertura inteira depende de ele ser
   * clicado. Passados dez segundos sem toque, o jogo abre por conta propria —
   * porque uma historia que fica esperando um clique que nao vem nao e
   * historia, e uma tela travada.
   *
   * O relogio so corre no aviso da ABERTURA. Aviso de pedido, mais tarde, e
   * decisao de quem joga: abrir sozinho seria o jogo respondendo no lugar dela.
   */
  const ESPERA_ATE_ABRIR_SOZINHO_MS = 10000;
  const avisoEDaAbertura = Boolean(avisoDoApp && !avisoDoApp.aba);
  useEffect(() => {
    if (!avisoEDaAbertura || appAberto) return;
    const relogio = window.setTimeout(() => {
      setAvisoDoApp(atual => {
        if (!atual) return atual;
        setAbrirNaConversa(atual.de);
        setAppAberto(true);
        return null;
      });
    }, ESPERA_ATE_ABRIR_SOZINHO_MS);
    return () => window.clearTimeout(relogio);
  }, [avisoEDaAbertura, appAberto]);

  /*
   * ── O SEGUNDO FECHAMENTO: a conversa acabou ─────────────────────────────
   *
   * Ordem dele, 08/09/2026: "apos finalizar conversa renan nao deve mais estar
   * na praca, e app fecha sozinho".
   *
   * O sinal de fim e a ULTIMA FRASE da abertura aparecendo na conversa — nao
   * um passo, nao um contador. Passo e contador mudam quando alguem mexe no
   * roteiro; a frase e a mesma coisa que a pessoa acabou de ler na tela, e por
   * isso e o sinal mais dificil de quebrar sem perceber.
   *
   * Aqui sim a praca fica limpa: a historia terminou, o Renan foi buscar a
   * pizza dele e o bairro volta a ser so o bairro.
   */
  const jaAcabouAConversa = useRef(false);
  useEffect(() => {
    if (jaAcabouAConversa.current) return;
    const acabou = estadoDoApp.mensagens.some(
      m => m.texto === ULTIMA_FALA_DA_ABERTURA
    );
    if (!acabou) return;
    jaAcabouAConversa.current = true;
    window.setTimeout(() => {
      setAppAberto(false);
      setAbrirNaConversa(null);
      setAbrirNaAba(null);
      setPracaLimpa(true);
    }, ESPERA_PARA_FECHAR_SOZINHO_MS);
  }, [estadoDoApp.mensagens]);

  const jaChamouODrone = useRef(false);
  useEffect(() => {
    if (jaChamouODrone.current) return;
    if (estadoDoApp.passo[QUEM_LIGA.id] !== PASSO_DEPOIS_DE_RESOLVER) return;
    jaChamouODrone.current = true;
    setCenaLigada(false);
    /*
     * ── A BICICLETA DO BAU E DO RENAN ──────────────────────────────────────
     *
     * Ordem dele, 08/09/2026: quem joga comeca sem bicicleta e entrega a
     * primeira ao amigo, que vira o primeiro entregador.
     *
     * O gancho e o mesmo que solta o drone: quando a conversa chega no passo
     * de depois de resolver, a caixa sai voando. A bicicleta entra na frota
     * no mesmo instante, e o Renan entra com ela — ele nao e agregado, e
     * frotista: nao trouxe veiculo nenhum, recebeu o nosso.
     */
    handleRef.current?.entregarAPrimeiraBike(QUEM_LIGA.nome, QUEM_LIGA.id);
    /*
     * E no mesmo instante ele deixa de ser o amigo que pediu ajuda e vira o
     * primeiro entregador da empresa. O RETRATO NAO MUDA AQUI: muda quando a
     * caixa abrir e o equipamento chegar na mao dele — ordem dele, 08/09/2026.
     */
    oRenanFoiContratado();
    window.setTimeout(() => {
      /*
       * O PRIMEIRO FECHAMENTO: o aplicativo sai da frente para o drone voar.
       *
       * A PRACA CONTINUA COM ELES. Ordem dele, 08/09/2026: "renan deve sair da
       * praca no segundo fechamento do app, nao no primeiro". Faz sentido: o
       * drone ainda vai descer a caixa AO LADO do Renan, e uma praca vazia
       * neste instante deixaria a caixa caindo sozinha no chao, sem dono.
       */
      setAppAberto(false);
      setAbrirNaConversa(null);
      setAbrirNaAba(null);
      setDroneEntregando(true);
    }, ESPERA_DEPOIS_DA_ULTIMA_MS);
  }, [estadoDoApp.passo]);
  const [engineError, setEngineError] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Refs não podem ser escritas durante o render: renders descartados vazariam.
  useEffect(() => {
    qualitySettingsRef.current = qualitySettings;
  }, [qualitySettings]);

  /*
   * A trilha nasce uma vez so e vive enquanto a tela do jogo viver. Se ela
   * fosse criada de novo a cada mudanca de preferencia, a musica recomecaria
   * do zero toda vez que alguem mexesse no interruptor.
   */
  useEffect(() => {
    const trilha = criarTrilhaSonora({
      criarAudio: caminho => new Audio(caminho),
      janela: window,
      documento: document,
    });
    trilhaRef.current = trilha;
    trilha.definirLigada(feedbackPreferences.soundEnabled);
    return () => {
      trilhaRef.current = null;
      trilha.encerrar();
    };
    // A trilha acompanha o interruptor por definirLigada, sem recriar o audio.
  }, []);

  useEffect(() => {
    const feedback = new GameFeedback({
      initialPreferences: feedbackPreferences,
      contextProvider: () => ({
        paused: modeRef.current === "paused",
        hidden: document.hidden,
      }),
    });
    feedbackRef.current = feedback;
    return () => {
      feedbackRef.current = null;
      void feedback.dispose();
    };
    // Preferences are updated through setPreferences without recreating audio.
  }, []);

  const changeQuality = (preference: QualityPreference) => {
    saveQualityPreference(preference);
    const nextSettings = resolveQualitySettings(preference);
    qualitySettingsRef.current = nextSettings;
    setQualityPreference(preference);
    engineRef.current?.setHardwareScalingLevel(
      babylonHardwareScalingLevel(nextSettings)
    );
  };

  /*
   * PLAY GAME: na primeira vez chama o filme; depois, entra direto.
   * Vai pelo ref e nao pelo `handle`, que so existe mais abaixo no render —
   * assim estas duas funcoes nascem estaveis e nao mudam a cada pintura.
   */
  const comecarJornada = useCallback(() => {
    if (deveRodarAbertura()) {
      setFilmeRodando(true);
      return;
    }
    entrarNoJogo();
  }, []);

  /*
   * Depois do filme vem a apresentacao, e so entao a central.
   *
   * A pergunta "ja se apresentou?" sai do SAVE e nao de uma marca do
   * navegador: quem apagou o save comeca de novo do zero, inclusive escolhendo
   * de novo quem pedala. Se fosse marca do navegador, um save zerado entraria
   * numa central que chama a pessoa por um nome que ela nao lembra de ter
   * dado.
   */
  const entrarNoJogo = useCallback(() => {
    const campanha = handleRef.current?.getSnapshot().campaign;
    if (campanha && precisaSeApresentar(campanha)) {
      if (TELA_DE_SELECAO) {
        setApresentando(true);
        return;
      }
      /*
       * COM A SELECAO ESCONDIDA, alguem ainda precisa dizer quem e o jogador —
       * o motor nao entra no mapa sem nome nem sem entregador. Entao entra o
       * primeiro da lista, calado, e a pessoa cai direto no bairro.
       *
       * O nome vazio nao serve: o motor recusa, e recusar aqui deixaria a
       * pessoa presa numa tela que nao existe mais.
       */
      handleRef.current?.definirJogador(NOME_PROVISORIO, ENTREGADORES[0]!.id);
    }
    // Ja se apresentou: cai no mapa, que e onde o jogo mora.
    setMostrandoMapa(true);
  }, []);

  const encerrarAbertura = useCallback(
    (assistida: boolean) => {
      if (assistida) marcarAberturaVista();
      setFilmeRodando(false);
      entrarNoJogo();
    },
    [entrarNoJogo]
  );

  const apresentar = useCallback((nome: string, entregadorId: EntregadorId) => {
    const resultado = handleRef.current?.definirJogador(nome, entregadorId);
    // So sai da tela se o motor aceitou. Sair com a escolha recusada
    // deixaria a pessoa numa central que nao sabe o nome dela.
    if (resultado && !resultado.ok) return;
    setApresentando(false);
    // Da escolha do jogador o caminho vai para o MAPA, e nao direto para a
    // central: a pessoa precisa ver o bairro antes de ver planilha.
    setMostrandoMapa(true);
  }, []);

  useEffect(() => {
    if (!mostrandoMapa || jaChamou.current) return;
    const relogio = window.setTimeout(() => {
      jaChamou.current = true;
      /*
       * ORDEM DELE, 08/09/2026: "o app entrar antes do drone, com a chamada
       * do Renan, ja dentro do novo app".
       *
       * Antes a ligacao era uma tela POR FORA, desenhada em cima do mapa, e o
       * aplicativo so aparecia depois de atender. Agora o aplicativo entra
       * primeiro e o telefone toca DENTRO dele — o jogador ve o XBWAPP com a
       * cara nova ja no primeiro contato, e nao uma tela avulsa que some.
       *
       * A porta ja existia (`chamadaChegando`), so nao estava sendo usada
       * nesta cena. Nada de tela nova: e a mesma do aplicativo.
       */
      setAppAberto(true);
      setChamando(true);
    }, ESPERA_DA_CHAMADA_MS);
    return () => window.clearTimeout(relogio);
  }, [mostrandoMapa]);

  /*
   * ELE LIGA DE NOVO — ate a terceira, quando desiste e escreve.
   *
   * A terceira nao toca: ela ABRE a conversa. Fazer o telefone tocar de novo e
   * so entao mostrar a mensagem seria dizer a mesma coisa duas vezes.
   */
  /** Atender abre o aplicativo direto na conversa de quem ligou. */
  const caiNoAplicativo = useCallback((passo?: string) => {
    if (passo) {
      setEstadoDoApp(atual => irParaOPasso(atual, QUEM_LIGA.id, passo));
    }
    setAbrirNaConversa(QUEM_LIGA.id);
    setAppAberto(true);
  }, []);

  /*
   * Recusou (ou deixou tocar ate perder). O aplicativo NAO fecha: quem recusa
   * uma ligacao continua com o telefone na mao. Ele liga de novo, e na terceira
   * desiste e escreve.
   */
  const recusar = useCallback(() => {
    setChamando(false);
    setRecusas(quantas => {
      const agora = quantas + 1;
      if (agora > RECUSAS_ATE_A_MENSAGEM) return agora;
      window.setTimeout(() => {
        if (agora >= RECUSAS_ATE_A_MENSAGEM) {
          caiNoAplicativo(PASSO_DA_COBRANCA);
        } else {
          setChamando(true);
        }
      }, ESPERA_PARA_LIGAR_DE_NOVO_MS);
      return agora;
    });
  }, [caiNoAplicativo]);

  /*
   * Atendeu dentro do aplicativo: cai na conversa de quem ligou. O aplicativo
   * ja esta aberto, entao aqui so se desliga o toque e se aponta a conversa.
   */
  const atender = useCallback(() => {
    setChamando(false);
    caiNoAplicativo();
  }, [caiNoAplicativo]);

  const sairDoMapa = useCallback(() => {
    setMostrandoMapa(false);
    handleRef.current?.goBase();
  }, []);

  /*
   * A primeira corrida, montada em cima do bairro medido: sai da base, pega no
   * comercio mais perto dela e entrega na casa mais perto do comercio. Nao e
   * escolhida a mao — assim ela continua fazendo sentido se o mapa mudar.
   */
  const primeiraCorrida = useMemo(() => {
    const perto = (
      a: { em: readonly [number, number] },
      b: { em: readonly [number, number] }
    ) => Math.hypot(a.em[0] - b.em[0], a.em[1] - b.em[1]);
    const coleta = [...COMERCIOS].sort(
      (a, b) => perto(a, BASE) - perto(b, BASE)
    )[0];
    const entrega = coleta
      ? [...CASAS].sort((a, b) => perto(a, coleta) - perto(b, coleta))[0]
      : CASAS[0];
    /*
     * O pino pousa EM CIMA DA BOLA que o Fernando pintou: "bolas vermelhas e
     * verdes devem ser onde pinos devem ficar". A porta continua mandando na
     * distancia a pe, e nao no desenho.
     */
    const daCorrida: ParadaNoMapa[] = [
      { papel: "base", nome: BASE.nome, em: BASE.frente },
      ...(coleta
        ? [{ papel: "coleta" as const, nome: coleta.nome, em: coleta.frente }]
        : []),
      ...(entrega
        ? [
            {
              papel: "entrega" as const,
              nome: entrega.nome,
              em: entrega.frente,
            },
          ]
        : []),
    ];
    /*
     * TODOS OS PINOS DE UMA VEZ — para olhar, nao para jogar.
     *
     * Pedido do Fernando: "habilite todos os pinos no mapa para
     * vizualizarmos". Com o bairro inteiro aceso da para conferir a marcacao
     * dele de relance: pino em cima de arvore, pino no meio da rua, dois
     * pinos brigando pelo mesmo telhado — tudo isso salta aos olhos assim, e
     * nao se ve com dois pinos por vez.
     *
     * NAO E ASSIM QUE O JOGO FICA. Em partida sao tres pinos: de onde se sai,
     * onde se pega e onde se entrega. Cento e oitenta e sete pinos acesos
     * viram um tapete e escondem o bairro que eles apontam — foi por isso que
     * ele mesmo pediu o pino 20% menor, "senao teremos tela muito poluida".
     * Esta chave existe para conferir e para voltar a false.
     */
    const umaSituacao = (eADaVez: boolean): SituacaoDaParada =>
      eADaVez ? "agora" : "espera";
    const paradas: ParadaNoMapa[] = TODOS_OS_PINOS
      ? [
          {
            papel: "base" as const,
            nome: BASE.nome,
            em: BASE.frente,
            situacao: "agora" as const,
          },
          ...COMERCIOS.map(c => ({
            papel: "coleta" as const,
            nome: c.nome,
            em: c.frente,
            /*
             * O BAIRRO INTEIRO ACESO SO CABE NA TELA PORQUE O RESTO FICA
             * LAVADO. As tres paradas da corrida ficam vivas e todas as
             * outras viram lembrete apagado: da para conferir a marcacao
             * dele sem perder de vista para onde o entregador vai.
             */
            situacao: umaSituacao(c.nome === coleta?.nome),
          })),
          ...CASAS.map(c => ({
            papel: "entrega" as const,
            nome: c.nome,
            em: c.frente,
            situacao: umaSituacao(c.nome === entrega?.nome),
          })),
        ]
      : daCorrida;
    /*
     * O CAMINHO, e nao so as pontas: base -> loja -> casa, tudo em cima do
     * asfalto. E ele que o entregador segue, e e a soma dele que vale como
     * distancia da corrida — a distancia ate a casa contada a partir da base
     * ignorava a parada na loja, que e justamente o desvio da entrega.
     */
    /*
     * AS DUAS PERNAS, SEPARADAS — e nao mais um tracado so.
     *
     * Emendadas, o entregador passava RETO pela loja: pegava a encomenda em
     * movimento e so parava no fim. Separadas, cada perna sabe onde termina, e
     * e nesse metro que a bicicleta fica enquanto ele vai a pe ate a porta.
     */
    const pernaDaColeta = coleta ? rota(BASE.em, coleta.em) : [];
    const pernaDaEntrega = coleta && entrega ? rota(coleta.em, entrega.em) : [];
    const montada =
      coleta && entrega
        ? montarCorrida(
            [
              {
                papel: "coleta" as const,
                endereco: coleta,
                caminho: pernaDaColeta,
              },
              {
                papel: "entrega" as const,
                endereco: entrega,
                caminho: pernaDaEntrega,
              },
            ],
            MAPA.largura,
            MAPA.altura,
            METROS_POR_PIXEL
          )
        : { caminho: [], paradas: [] };
    const caminho = montada.caminho;
    const paradasDaEntrega = montada.paradas;
    const metros =
      caminho.length > 1
        ? metrosDaRota(caminho)
        : entrega
          ? entrega.metrosDaBase
          : 0;
    return {
      paradas,
      caminho,
      paradasDaEntrega,
      metros,
      pagamento: Math.max(6, Math.round(metros / 40)),
    };
  }, []);

  /*
   * A trilha sai de cena enquanto o filme roda e volta quando ele acaba. Sem
   * isto os dois tocariam juntos: o clique no PLAY GAME e o mesmo gesto que
   * libera o som da musica no navegador.
   */
  useEffect(() => {
    trilhaRef.current?.definirLigada(
      feedbackPreferences.soundEnabled && !filmeRodando
    );
  }, [filmeRodando, feedbackPreferences.soundEnabled]);

  const changeFeedback = (preferences: FeedbackPreferences) => {
    setFeedbackPreferences(preferences);
    feedbackRef.current?.setPreferences(preferences);
    trilhaRef.current?.definirLigada(preferences.soundEnabled && !filmeRodando);
    if (preferences.soundEnabled) void feedbackRef.current?.unlockAudio();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    let initializationExpired = false;
    let unsubscribe: (() => void) | null = null;
    let initializationTimer: number | null = null;
    let idleTickTimer: number | null = null;
    let renderFrameId: number | null = null;
    let idleTransitionFrameId: number | null = null;
    let resizeFrameId: number | null = null;
    let engine: Engine | null = null;
    let stopRenderLoop: (() => void) | null = null;
    let resumeRenderLoop: (() => void) | null = null;
    let renderingSuspended = false;

    // Cada resize recria o framebuffer do Babylon: um quadro por rajada basta.
    const onResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        engine?.resize();
      });
    };

    // Aba escondida no meio da rota é corrida às cegas: pausamos por segurança.
    const onVisibilityChange = () => {
      if (!document.hidden || modeRef.current !== "running") return;
      handleRef.current?.pauseRun();
    };

    const cancelPendingFrames = () => {
      if (renderFrameId !== null) {
        window.cancelAnimationFrame(renderFrameId);
        renderFrameId = null;
      }
      if (idleTransitionFrameId !== null) {
        window.cancelAnimationFrame(idleTransitionFrameId);
        idleTransitionFrameId = null;
      }
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
        resizeFrameId = null;
      }
    };

    // Toda saída — expiração, falha ou desmontagem — passa por aqui.
    const releaseEngine = () => {
      cancelPendingFrames();
      if (initializationTimer !== null) {
        window.clearTimeout(initializationTimer);
        initializationTimer = null;
      }
      if (idleTickTimer !== null) {
        window.clearInterval(idleTickTimer);
        idleTickTimer = null;
      }
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopRenderLoop = null;
      resumeRenderLoop = null;
      unsubscribe?.();
      unsubscribe = null;
      handleRef.current?.dispose();
      handleRef.current = null;
      engineRef.current = null;
      engine?.dispose();
      engine = null;
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    initializationTimer = window.setTimeout(() => {
      if (cancelled) return;
      initializationExpired = true;
      initializationTimer = null;
      setEngineError(true);
      releaseEngine();
      startedRef.current = false;
    }, 12_000);

    Promise.all([
      import("@babylonjs/core/Engines/engine"),
      import("@/game/scene"),
    ])
      .then(([{ Engine: BabylonEngine }, { createGameScene }]) => {
        if (cancelled || initializationExpired) return null;
        const settings = qualitySettingsRef.current;
        engine = new BabylonEngine(canvas, settings.antialias, {
          preserveDrawingBuffer: false,
          stencil: false,
          adaptToDeviceRatio: true,
        });
        engineRef.current = engine;
        engine.setHardwareScalingLevel(babylonHardwareScalingLevel(settings));
        // Um reset de GPU no Android deixava a pista preta sem qualquer aviso.
        engine.onContextLostObservable.add(() => {
          renderingSuspended = true;
          stopRenderLoop?.();
          setContextLost(true);
        });
        engine.onContextRestoredObservable.add(() => {
          renderingSuspended = false;
          setContextLost(false);
          engine?.resize();
          resumeRenderLoop?.();
        });
        return createGameScene(engine, canvas, {
          glow: settings.preset !== "performance",
          // Sombra projetada e o que faz a luz parecer luz: sem ela, sol de
          // fim de tarde e so um filtro laranja. A area de sombra e fixa e
          // pequena em volta do jogador, que nunca sai da origem, entao o
          // custo e limitado e vale ate no preset de desempenho.
          shadows: true,
        });
      })
      .then(handle => {
        if (!handle) return;
        if (cancelled || initializationExpired) {
          handle.dispose();
          return;
        }
        if (initializationTimer !== null) {
          window.clearTimeout(initializationTimer);
          initializationTimer = null;
        }
        handleRef.current = handle;
        let lastRenderAt = 0;
        let previousSnapshot: GameSnapshot | null = null;
        const renderScene = () => {
          if (cancelled || renderingSuspended || engine?.isDisposed) return;
          engine?.beginFrame();
          handle.scene.render();
          engine?.endFrame();
        };
        const stopContinuousRender = () => {
          if (renderFrameId === null) return;
          window.cancelAnimationFrame(renderFrameId);
          renderFrameId = null;
        };
        const startContinuousRender = () => {
          if (renderFrameId !== null || renderingSuspended) return;
          if (modeRef.current !== "running") return;
          renderFrameId = window.requestAnimationFrame(timestamp => {
            renderFrameId = null;
            if (modeRef.current !== "running") return;
            const minimumFrameTime =
              1_000 / qualitySettingsRef.current.targetFps;
            if (timestamp - lastRenderAt >= minimumFrameTime - 1) {
              renderScene();
              lastRenderAt = timestamp;
            }
            startContinuousRender();
          });
        };
        const requestIdleTransitionRender = () => {
          if (idleTransitionFrameId !== null || renderingSuspended) return;
          idleTransitionFrameId = window.requestAnimationFrame(() => {
            idleTransitionFrameId = null;
            if (modeRef.current !== "running") renderScene();
          });
        };
        stopRenderLoop = stopContinuousRender;
        resumeRenderLoop = () => {
          if (modeRef.current === "running") startContinuousRender();
          else requestIdleTransitionRender();
        };
        unsubscribe = handle.subscribe(nextSnapshot => {
          if (previousSnapshot) {
            const feedback = feedbackRef.current;
            if (
              nextSnapshot.run.impactSerial > previousSnapshot.run.impactSerial
            ) {
              void feedback?.trigger("collision");
            } else if (
              nextSnapshot.run.cargo > previousSnapshot.run.cargo ||
              nextSnapshot.run.tireTokens > previousSnapshot.run.tireTokens
            ) {
              void feedback?.trigger("pickup");
            }
            if (
              nextSnapshot.run.turboActive &&
              !previousSnapshot.run.turboActive
            ) {
              void feedback?.trigger("boost");
            }
            if (
              nextSnapshot.mode === "result" &&
              previousSnapshot.mode !== "result"
            ) {
              void feedback?.trigger(
                nextSnapshot.lastResult?.success ? "success" : "error"
              );
            }
          }
          previousSnapshot = nextSnapshot;
          modeRef.current =
            nextSnapshot.mode === "running" && nextSnapshot.run.paused
              ? "paused"
              : nextSnapshot.mode;
          setSnapshot(nextSnapshot);
          if (modeRef.current === "running") {
            if (idleTransitionFrameId !== null) {
              window.cancelAnimationFrame(idleTransitionFrameId);
              idleTransitionFrameId = null;
            }
            startContinuousRender();
          } else {
            stopContinuousRender();
            requestIdleTransitionRender();
          }
        });
        idleTickTimer = window.setInterval(() => {
          if (modeRef.current === "running") return;
          renderScene();
          setSnapshot(handle.getSnapshot());
        }, 1_000);
      })
      .catch(() => {
        if (cancelled || initializationExpired) return;
        setEngineError(true);
        releaseEngine();
        startedRef.current = false;
      });

    return () => {
      cancelled = true;
      releaseEngine();
      startedRef.current = false;
    };
  }, []);

  const handle = handleRef.current;
  const canvasHidden = snapshot?.mode !== "running" || snapshot.run.paused;

  // aria-hidden com foco dentro esconde do leitor de tela o elemento focado.
  useEffect(() => {
    if (!canvasHidden) return;
    const canvas = canvasRef.current;
    if (canvas && document.activeElement === canvas) canvas.blur();
  }, [canvasHidden]);

  // Enquanto desenha, guarda o nome mais recente para a ponte ler.
  nomeDoJogador.current = snapshot?.campaign.playerName || "Entregador";

  return (
    <div
      className="game-shell"
      onPointerDownCapture={event => {
        const feedback = feedbackRef.current;
        void feedback?.unlockAudio();
        if ((event.target as HTMLElement).closest("button"))
          void feedback?.trigger("button");
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        style={{ touchAction: "none" }}
        aria-label="Estrada 3D da rota. Use as setas esquerda e direita ou as teclas A e D para mudar de faixa."
        aria-hidden={canvasHidden}
        tabIndex={canvasHidden ? -1 : 0}
      />

      {engineError ? (
        <div
          className="engine-error-screen"
          role="alert"
          aria-labelledby="engine-error-title"
        >
          <Wrench size={44} aria-hidden="true" />
          <strong id="engine-error-title">A PISTA 3D NÃO INICIOU</strong>
          <p>
            Feche outros aplicativos pesados e recarregue o jogo. Seu progresso
            permanece salvo.
          </p>
          <button
            className="xb-button xb-button--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={18} /> TENTAR NOVAMENTE
          </button>
        </div>
      ) : !snapshot || !handle ? (
        <div
          className="loading-screen"
          role="status"
          aria-live="polite"
          aria-label="Preparando a rota"
        >
          <img src={GAME_ASSETS.logo} alt="XB Technology" />
          <strong>PREPARANDO A ROTA</strong>
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : (
        <div
          className="game-ui"
          data-mode={snapshot.mode}
          data-primeira={
            PRIMEIRA_ENTRADA_APROVADA &&
            snapshot.mode === "base" &&
            ehPrimeiraEntrada(snapshot)
              ? "sim"
              : undefined
          }
        >
          {snapshot.mode === "base" &&
            (PRIMEIRA_ENTRADA_APROVADA && ehPrimeiraEntrada(snapshot) ? (
              <FirstDelivery snapshot={snapshot} handle={handle} />
            ) : (
              <BaseScreen snapshot={snapshot} handle={handle} />
            ))}
          {snapshot.mode === "routes" && (
            <RoutesScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "menu" && <MenuScreen onPlay={comecarJornada} />}
          {snapshot.mode === "garage" && (
            <GarageScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "running" && !snapshot.run.paused && (
            <RunningHud
              snapshot={snapshot}
              handle={handle}
              canvasRef={canvasRef}
            />
          )}
          {snapshot.mode === "running" && snapshot.run.paused && (
            <PauseOverlay handle={handle} />
          )}
          {snapshot.mode === "result" && (
            <ResultScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "complete" && (
            <CompleteScreen snapshot={snapshot} handle={handle} />
          )}
          {filmeRodando && <OpeningScene onFinish={encerrarAbertura} />}
          {TELA_DE_SELECAO && apresentando && !filmeRodando && (
            <Welcome aoComecar={apresentar} />
          )}
          {mostrandoMapa && !apresentando && !filmeRodando && (
            <MapaDoBairro
              nomeDoJogador={snapshot.campaign.playerName}
              /*
               * SEM PEDIDO ACEITO, SEM PINO NENHUM.
               *
               * Ordem dele, 08/09/2026: "reiniciei o game e pinos ja aparecem
               * no inicio do game, isso nao deve acontecer".
               *
               * Ele esta certo, e o motivo e o mesmo pelo qual os pinos ficaram
               * desligados tanto tempo: pino e RECADO. No comeco nao ha recado
               * nenhum — nao ha pedido, nao ha coleta, nao ha entrega. Pino
               * aceso ali e uma promessa que o jogo nao tem como cumprir.
               *
               * A corrida de abertura continua calculada (o filme e o drone
               * usam o tracado dela); o que sai e o desenho dos pinos.
               */
              paradas={percurso ? percurso.paradas : []}
              /*
               * O RENAN SO APARECE NA RUA DEPOIS DA HISTORIA.
               *
               * Ordem dele, 10/09/2026: "apos app finalizar no inicio renan ja
               * esta andando pela rua, isso nao deve acontecer, ainda estamos
               * na cutscene" — e "o boneco do lado da fonte e renan". Enquanto
               * a abertura roda, o Renan e o menino sem uniforme ao lado da
               * fonte; o de bicicleta nao existe ainda. Caminho vazio = nenhum
               * entregador no mapa.
               *
               * Depois da historia, ele anda pela conta do balcao — o mesmo
               * relogio que fecha o pedido — e desce na coleta e na entrega.
               */
              caminho={pracaLimpa ? tracado.caminho : []}
              entregadorEm={percurso?.onde}
              paradasDaEntrega={pracaLimpa ? tracado.paradasDaEntrega : []}
              comandoDoEntregador={comandoDoEntregador}
              metros={primeiraCorrida.metros}
              pagamento={primeiraCorrida.pagamento}
              entregaDoDrone={droneEntregando}
              pracaLimpa={pracaLimpa}
              aoAbrirAMala={() => {
                oBauAbriu.current = true;
                /*
                 * O EQUIPAMENTO CHEGOU. Ordem dele: "renan so muda de desenho
                 * no aplicativo, apos receber equipamentos". A caixa abrindo e
                 * esse instante — dentro dela estao o uniforme, a luva e a
                 * bicicleta. Dai em diante o retrato dele no aplicativo e o de
                 * quem esta de uniforme.
                 */
                oRenanRecebeuEquipamento();
                setCenaLigada(true);
                setAvisoDoApp({
                  de: QUEM_LIGA.id,
                  quem: QUEM_LIGA.nome,
                  texto: PRIMEIRA_FALA_DEPOIS_DO_BAU,
                });
              }}
              aoSair={sairDoMapa}
            />
          )}
          {mostrandoMapa &&
            !apresentando &&
            !filmeRodando &&
            !appAberto &&
            !chamando && (
              <button
                type="button"
                className="mapa__xbwapp"
                onClick={() => setAppAberto(true)}
                aria-label={
                  totalNaoLidas(estadoDoApp) > 0
                    ? `Abrir o XBWAPP — ${totalNaoLidas(estadoDoApp)} mensagens não lidas`
                    : "Abrir o XBWAPP"
                }
              >
                <Icone nome="abaConversas" />
                <Contador quantas={totalNaoLidas(estadoDoApp)} />
              </button>
            )}
          {avisoDoApp && !appAberto && (
            <button
              type="button"
              className={
                avisoDoApp.aba
                  ? "xbw-avisinho"
                  : "xbw-avisinho xbw-avisinho--chamando"
              }
              onClick={() => {
                /*
                 * Tocar no aviso abre o aplicativo JA DENTRO da conversa de
                 * quem mandou — nao na lista. Um aviso que larga a pessoa na
                 * lista faz ela procurar o que acabou de ser avisado.
                 */
                const quemMandou = avisoDoApp.de;
                const abaDoAviso = avisoDoApp.aba ?? null;
                setAvisoDoApp(null);
                setAbrirNaAba(abaDoAviso);
                setAbrirNaConversa(abaDoAviso ? null : quemMandou);
                setAppAberto(true);
              }}
            >
              <span className="xbw-avisinho__selo" aria-hidden="true">
                {/*
                  * A COR DIZ QUEM MANDOU, antes de a pessoa ler o nome.
                  * Verde e gente falando; prata e a propria XB avisando.
                  */}
                <img
                  src={
                    avisoDoApp.aba || avisoDoApp.de === "xb"
                      ? XBW_ICONES.avisoPrata
                      : XBW_ICONES.avisoVerde
                  }
                  alt=""
                  draggable={false}
                />
              </span>
              {/*
                * A LUVA. Ela mora DENTRO do botao de proposito: assim ela anda
                * junto com o cartao, entra e sai com ele, e nao ha um segundo
                * em que a mao aponta para um lugar vazio.
                */}
              <span className="xbw-avisinho__texto">
                <span className="xbw-avisinho__linha">
                  <strong>{avisoDoApp.quem}</strong>
                  <em>XBWAPP</em>
                </span>
                <small>{avisoDoApp.texto}</small>
                {/*
                  * ONDE TOCAR, ESCRITO.
                  *
                  * Houve aqui uma mao DESENHADA POR MIM apontando o cartao.
                  * Saiu em 08/09/2026 porque ficou ruim e depois ficou
                  * obscena. As palavras ficaram no lugar dela.
                  *
                  * Elas continuam aqui mesmo agora que existe a luva dele: o
                  * desenho puxa o olho, a palavra diz o que fazer, e quem joga
                  * sem som nem cor forte le do mesmo jeito.
                  */}
                {!avisoDoApp.aba && (
                  <em className="xbw-avisinho__toque">toque para abrir</em>
                )}
              </span>
              {/*
                * A LUVA XB, agora desenhada por ele — folha de 09/09/2026.
                *
                * E a mao que faltava: luva branca, punho preto com o XB aceso
                * e as ondinhas do toque ja no proprio desenho. Nao ha indicador
                * em pe sozinho, nao ha silhueta ambigua: e um botao de "toque
                * aqui", e le assim em qualquer lugar do mundo.
                *
                * Fica no canto de baixo do cartao, encostando nele, e bate no
                * ritmo do halo. `aria-hidden` porque quem usa leitor de tela ja
                * ouve o nome do botao inteiro — a luva seria repeticao.
                */}
              {!avisoDoApp.aba && (
                <img
                  className="xbw-avisinho__luva"
                  src={GAME_ASSETS.luvaToque}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
              )}
            </button>
          )}
          {appAberto && (
            <XBWApp
              aoFechar={() => {
                setAppAberto(false);
                setAbrirNaConversa(null);
                setAbrirNaAba(null);
                if (oBauAbriu.current) setPracaLimpa(true);
              }}
              chamadaChegando={
                chamando
                  ? { contato: QUEM_LIGA.id, tipo: "video" as const }
                  : undefined
              }
              aoAtenderChamada={atender}
              aoPerderChamada={recusar}
              comSom={feedbackPreferences.soundEnabled}
              cenaLigada={cenaLigada}
              conversaInicial={abrirNaConversa ?? undefined}
              abaInicial={abrirNaAba ?? undefined}
              equipe={equipeDaXB}
              entregador={{ nome: snapshot.campaign.playerName }}
              estadoInicialDoJogo={estadoDoApp}
              aoMudarEstado={setEstadoDoApp}
            />
          )}
          {/*
           * A TELA DE CHAMADA POR FORA fica de reserva.
           *
           * Desde 08/09 a ligacao do Renan toca DENTRO do aplicativo. Esta
           * tela continua aqui, e nao foi apagada, porque serve para qualquer
           * ligacao que precise acontecer com o aplicativo fechado. Hoje nao
           * ha nenhuma — por isso ela so aparece se o aplicativo estiver
           * fechado, o que na abertura nunca acontece.
           */}
          {chamando && !appAberto && (
            <ChamadaDeVideo
              comSom={feedbackPreferences.soundEnabled}
              aoAtender={atender}
              aoRecusar={recusar}
            />
          )}
          {snapshot.isDemo && (
            <div className="demo-badge" role="status">
              <CircleGauge size={14} /> DEMONSTRAÇÃO AUTOMÁTICA
            </div>
          )}
          {snapshot.mode !== "running" && snapshot.mode !== "result" && (
            <ExperienceSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              qualityPreference={qualityPreference}
              resolvedPreset={qualitySettings.preset}
              onQualityChange={changeQuality}
              feedback={feedbackPreferences}
              onFeedbackChange={changeFeedback}
              aoRecomecarApresentacao={() =>
                handleRef.current?.esquecerJogador()
              }
            />
          )}
        </div>
      )}

      {contextLost && !engineError && (
        <div
          className="engine-error-screen"
          role="alert"
          aria-labelledby="context-lost-title"
        >
          <Wrench size={44} aria-hidden="true" />
          <strong id="context-lost-title">A PLACA DE VÍDEO REINICIOU</strong>
          <p>
            O navegador perdeu o contexto 3D da pista. Recarregue para voltar à
            rota; seu progresso permanece salvo no dispositivo.
          </p>
          <button
            className="xb-button xb-button--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={18} /> RECARREGAR
          </button>
        </div>
      )}
    </div>
  );
}
