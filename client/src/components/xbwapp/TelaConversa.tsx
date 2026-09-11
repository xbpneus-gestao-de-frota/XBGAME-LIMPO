/**
 * A CONVERSA — a tela onde o jogo acontece por escrito.
 *
 * ── ELE DIGITA ANTES DE FALAR ─────────────────────────────────────────────
 *
 * A fala nao aparece pronta: primeiro entra o "digitando…", e so depois o
 * balao. Sao um segundo e pouco, e fazem toda a diferenca — mensagem que nasce
 * pronta na tela e texto de jogo; mensagem que aparece depois de alguem
 * digitar e alguem falando com voce.
 *
 * ── AS RESPOSTAS PRONTAS E O TECLADO CONVIVEM ─────────────────────────────
 *
 * As duas coisas servem a momentos diferentes: no meio de uma corrida contra o
 * relogio, escolher e mais rapido que digitar; parado, escrever diz o que
 * nenhuma lista preve. Com o teclado em pe as respostas viram uma linha que
 * corre para o lado, e devolvem a altura para a conversa.
 *
 * ── QUEM RESPONDE AO QUE FOI DIGITADO ─────────────────────────────────────
 *
 * A IA, quando ele acoplar; o entendimento por palavra, que funciona sem
 * internet e sem custo; e, se nada reconhecer, uma frase honesta de quem nao
 * entendeu. Chutar seria pior que as tres.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTATOS, contato, nomeDe } from "@/game/xbwapp/contatos";
import { roteiroDe } from "@/game/xbwapp/roteiros";
import {
  abrirConversa,
  aplicarEfeito,
  enviar,
  hora,
  passoAtual,
  receber,
  responder,
  silenciar,
} from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  apagarParaMim,
  apagarParaTodos,
  editar,
  encaminhar,
  fixarMensagem,
  mensagem as acharMensagem,
  mensagensVisiveis,
  procurarNaConversa,
  reagir,
} from "@/game/xbwapp/mensagens";
import {
  mandarAudio,
  mandarCartao,
  mandarDocumento,
  mandarEnquete,
  mandarFigurinha,
  mandarFoto,
  mandarLocal,
  mandarPagamento,
  mandarTexto,
  responderCobranca,
  tipoDoArquivo,
  votar,
} from "@/game/xbwapp/enviar";
import { mostraTiqueAzul, papelDa } from "@/game/xbwapp/ajustes";
import {
  deuCerto,
  efeitoDaResposta,
  pedirResposta,
  type Situacao,
} from "@/game/xbwapp/atendimento";
import type { Boca } from "@/game/xbwapp/entender";
import { comoEstaAReputacao } from "@/game/xbwapp/efeitos";
import { XBW_ICONES } from "@/game/xbwapp/icones";
import type { IdContato, Mensagem, Resposta } from "@/game/xbwapp/tipos";
import { BotaoIcone, Icone, Retrato } from "./pecas";
import Balao from "./Balao";
import AcoesDaMensagem, { PerguntaDeApagar } from "./AcoesDaMensagem";
import BarraDeEscrever, { type Anexo } from "./BarraDeEscrever";

/** Quanto tempo o "digitando…" fica antes de cada fala dele aparecer. */
const DIGITANDO_MS = 1300;
/** E o intervalo entre uma fala e a proxima. */
const ENTRE_FALAS_MS = 620;
/*
 * O tempo entre a ultima fala dele e o comeco da resposta.
 *
 * E o instante em que alguem LE o que chegou antes de levar a mao ao teclado.
 * Sem ele a resposta comeca a ser digitada no mesmo quadro em que a fala
 * aparece, e a conversa deixa de parecer conversa: vira duas maquinas
 * revezando.
 */
const LER_ANTES_DE_RESPONDER_MS = 1500;

/** As figurinhas que o aplicativo traz. Sao emoji, e nao arquivos. */
const FIGURINHAS = [
  "👍",
  "😂",
  "🚲",
  "🍞",
  "❤️",
  "🙏",
  "😅",
  "🔥",
  "💪",
  "🎉",
  "😮",
  "😢",
];

/** Documentos plausiveis de um entregador. */
const DOCUMENTOS = [
  { nome: "nota-fiscal.pdf", tamanhoKb: 240 },
  { nome: "romaneio-do-dia.xlsx", tamanhoKb: 96 },
  { nome: "comprovante.pdf", tamanhoKb: 180 },
  { nome: "rota.zip", tamanhoKb: 1240 },
];

export default function TelaConversa({
  estado,
  mudar,
  conversa,
  aoVoltar,
  aoLigar,
  aoAbrirPerfil,
  roteiroLigado = false,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  conversa: IdContato;
  aoVoltar: () => void;
  aoLigar?: (tipo: "voz" | "video") => void;
  aoAbrirPerfil?: () => void;
  /*
   * O ROTEIRO SO TOCA QUANDO O JOGO MANDA. Ordem dele, 07/09/2026: "SEM
   * MENSAGENS AUTOMATICAS". A abertura continua tocando porque as falas de la
   * sao dele, ditadas por ele, e o jogo abre o aplicativo dentro dela. Uma
   * conversa aberta pela pessoa nao fala sozinha.
   */
  roteiroLigado?: boolean;
}) {
  const quem = contato(conversa) ?? estado.grupos.find(g => g.id === conversa);
  const tipoDoContato = (contato(conversa)?.tipo ??
    (estado.grupos.some(g => g.id === conversa) ? "grupo" : "pessoa")) as Boca;
  const roteiro = roteiroDe(conversa);
  const passo = passoAtual(estado, conversa);
  const bloco = roteiro && passo ? roteiro.passos[passo] : undefined;

  const online =
    tipoDoContato !== "grupo" &&
    !estado.bloqueados.includes(conversa) &&
    Boolean(contato(conversa)?.online);

  const entregues = estado.entregues[conversa] ?? 0;
  const [digitando, setDigitando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [esperando, setEsperando] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);
  const [respondendo, setRespondendo] = useState<Mensagem | undefined>();
  const [editando, setEditando] = useState<Mensagem | undefined>();
  const [acoesDe, setAcoesDe] = useState<Mensagem | undefined>();

  /*
   * ── A RESPOSTA E DIGITADA, NAO APARECE PRONTA ────────────────────────────
   *
   * Ordem dele, 08/09/2026: "precisamos que a animacao digite as teclas para
   * responder o Renan".
   *
   * Antes, tocar numa resposta pronta mandava a frase no mesmo instante. Ela
   * simplesmente surgia no balao — e o teclado, que e a peca mais trabalhada
   * da tela, ficava ali parado sem fazer nada.
   *
   * Agora a frase e escrita letra por letra no campo, com a tecla acendendo
   * a cada letra, e so entao ela sai. O jogador ve o proprio telefone
   * respondendo por ele. Nada muda no jogo: quando a digitacao termina,
   * quem manda a resposta e a mesma porta de antes, com o mesmo efeito.
   */
  const [digitandoResposta, setDigitandoResposta] = useState<Resposta | null>(
    null
  );
  const [teclaAcesa, setTeclaAcesa] = useState<string | null>(null);
  const [apagando, setApagando] = useState<Mensagem | undefined>();
  const [encaminhando, setEncaminhando] = useState<Mensagem | undefined>();
  const [selecionadas, setSelecionadas] = useState<readonly string[]>([]);
  const [procura, setProcura] = useState<string | null>(null);
  const [anexoAberto, setAnexoAberto] = useState<Anexo["o"] | null>(null);
  const fim = useRef<HTMLDivElement | null>(null);

  const mensagens = useMemo(
    () => mensagensVisiveis(estado, conversa),
    [estado, conversa]
  );
  const fixada = estado.fixadaNaConversa[conversa];
  const modoSelecao = selecionadas.length > 0;

  useEffect(() => {
    mudar(e => abrirConversa(e, conversa));
  }, [conversa, mudar]);

  /* O endereco de cada fala ja entregue, para nenhuma entrar duas vezes. */
  const jaEntregues = useRef<Set<string>>(new Set());

  // As falas do passo entram uma a uma, com o "digitando" na frente.
  useEffect(() => {
    if (!roteiroLigado || !bloco) {
      setDigitando(false);
      return;
    }
    if (entregues >= bloco.falas.length) {
      setDigitando(false);
      return;
    }
    /*
     * ── CADA FALA ENTRA UMA VEZ SO ──────────────────────────────────────
     *
     * Ele viu duas selfies iguais na conversa. A causa: a mesma fala sendo
     * entregue duas vezes — a tela pede a entrega, o estado leva um instante
     * para voltar com a contagem nova, e nesse meio uma segunda passagem
     * pedia a MESMA fala outra vez.
     *
     * A marca abaixo e o endereco exato da fala: qual conversa, qual passo,
     * qual posicao. Entregue uma vez, nao entra de novo.
     */
    const enderecoDaFala = `${conversa}:${passo}:${entregues}`;
    if (jaEntregues.current.has(enderecoDaFala)) return;

    const fala = bloco.falas[entregues]!;
    setDigitando(true);
    /*
     * A fala pode pedir o proprio tempo quando ele importa para a cena — e o
     * caso da selfie do Renan, que tem de chegar dois segundos depois da
     * resposta. Sem pedido, vale o compasso normal.
     */
    const espera =
      fala.esperaMs ??
      (entregues === 0 ? DIGITANDO_MS : ENTRE_FALAS_MS + DIGITANDO_MS / 2);
    const relogio = window.setTimeout(() => {
      jaEntregues.current.add(enderecoDaFala);
      mudar(e => receber(e, conversa, fala, true));
    }, espera);
    return () => window.clearTimeout(relogio);
  }, [roteiroLigado, bloco, entregues, conversa, passo, mudar]);

  // A conversa acompanha a ultima fala — e o teclado, que come metade da tela.
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, digitando, escrevendo]);

  /*
   * O RELOGIO DA DIGITACAO.
   *
   * Uma letra a cada 55 milesimos: rapido o bastante para nao entediar, lento
   * o bastante para a pessoa VER que esta sendo digitado. Depois da ultima
   * letra ha um respiro antes de enviar — e o instante em que alguem confere
   * o que escreveu antes de tocar em enviar.
   *
   * Se a tela fechar no meio, o relogio para junto e nada e enviado.
   */
  useEffect(() => {
    if (!digitandoResposta) return;
    /*
     * UMA RESPOSTA PODE SAIR EM MAIS DE UM BALAO, como gente manda mesmo. As
     * frases seguintes tambem sao DIGITADAS, uma depois da outra, e cada uma
     * sai no seu balao — e nao todas de uma vez no fim. Escrever tudo e
     * despejar junto pareceria um recado colado, e nao alguem escrevendo.
     */
    const frases = [digitandoResposta.texto, ...(digitandoResposta.emSeguida ?? [])];
    let qual = 0;
    let i = 0;
    let vivo = true;
    const relogios: number[] = [];

    const escreve = () => {
      if (!vivo) return;
      const frase = frases[qual]!;
      if (i >= frase.length) {
        setTeclaAcesa(null);
        relogios.push(
          window.setTimeout(() => {
            if (!vivo) return;
            setRascunho("");
            const texto = frase;
            const ultima = qual === frases.length - 1;
            qual += 1;
            i = 0;
            /*
             * ── QUEM VIRA O PASSO E A ULTIMA FRASE ─────────────────────────
             *
             * Defeito visto por ele: "a resposta veio antes da pergunta". A
             * fala saia assim — "Nao posso sair de casa..." e, so depois,
             * "Onde vc vai?" — mas o Renan ja tinha respondido no meio.
             *
             * A causa: a PRIMEIRA frase virava o passo da conversa. O Renan
             * comecava a responder enquanto a segunda frase ainda estava
             * sendo digitada, e a resposta dele chegava antes da pergunta.
             *
             * Agora quem vira o passo e a ULTIMA. As frases de antes saem
             * como mensagens comuns; so quando a pessoa termina de falar e
             * que o outro lado toma a vez. E o que acontece numa conversa de
             * verdade: ninguem responde no meio da frase alheia.
             */
            if (ultima) {
              mudar(e =>
                responder(e, conversa, {
                  ...digitandoResposta,
                  texto,
                  emSeguida: undefined,
                })
              );
            } else {
              mudar(e => enviar(e, conversa, texto));
            }
            if (qual < frases.length) {
              relogios.push(window.setTimeout(escreve, 700));
            } else {
              setDigitandoResposta(null);
            }
          }, 420)
        );
        return;
      }
      const letra = frase[i]!;
      i += 1;
      setRascunho(frase.slice(0, i));
      setTeclaAcesa(letra);
      /* A tecla apaga antes da proxima acender: senao ficam duas acesas. */
      relogios.push(window.setTimeout(() => setTeclaAcesa(null), 38));
      relogios.push(window.setTimeout(escreve, 55));
    };

    relogios.push(window.setTimeout(escreve, 260));
    return () => {
      vivo = false;
      relogios.forEach(r => window.clearTimeout(r));
      setTeclaAcesa(null);
    };
  }, [digitandoResposta, conversa, mudar]);

  /*
   * ── A CONVERSA ANDA SOZINHA ──────────────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: "nesse ponto nao deve aparecer mensagem pronta
   * para clicar, e sim mostrar a digitacao das frases; a conversa deve ficar
   * automatica ate sair do app".
   *
   * Enquanto o roteiro esta ligado, a conversa e uma CENA, e nao um
   * questionario. O Renan fala, a resposta e digitada, o Renan responde de
   * novo — sozinho, do comeco ao fim, ate a pessoa fechar o aplicativo.
   *
   * A vez de responder chega quando todas as falas do passo ja entraram. Ai
   * espera-se um instante — o tempo de alguem ler o que chegou antes de
   * comecar a escrever — e a digitacao comeca.
   *
   * Quando o passo oferece mais de um caminho, segue-se o primeiro. Numa cena
   * que anda sozinha nao ha quem escolha; os caminhos continuam escritos no
   * roteiro, esperando o dia em que a pessoa voltar a decidir.
   */
  const minhaVez =
    roteiroLigado &&
    bloco &&
    entregues >= bloco.falas.length &&
    (bloco.respostas?.length ?? 0) > 0 &&
    !digitandoResposta;

  /*
   * UM PASSO SO E RESPONDIDO UMA VEZ.
   *
   * A ultima resposta da cena nao aponta para lugar nenhum — e assim que a
   * cena acaba. Mas sem esta marca o passo continuaria de pe, ainda com
   * resposta a oferecer, e a conversa escreveria a mesma frase para sempre.
   */
  const jaRespondidos = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!minhaVez || !passo) return;
    const marca = `${conversa}:${passo}`;
    if (jaRespondidos.current.has(marca)) return;
    const escolha = bloco?.respostas?.[0];
    if (!escolha) return;
    jaRespondidos.current.add(marca);
    const relogio = window.setTimeout(() => {
      setRascunho("");
      setDigitandoResposta(escolha);
    }, LER_ANTES_DE_RESPONDER_MS);
    return () => window.clearTimeout(relogio);
  }, [minhaVez, bloco, passo, conversa]);

  const prontas: readonly Resposta[] =
    roteiroLigado && bloco && entregues >= bloco.falas.length
      ? (bloco.respostas ?? [])
      : [];

  const marcar = useCallback((id: string) => {
    setSelecionadas(atuais =>
      atuais.includes(id) ? atuais.filter(x => x !== id) : [...atuais, id]
    );
  }, []);

  /** O personagem responde ao que foi digitado. */
  async function mandarEscrito() {
    const frase = rascunho.trim();
    if (!frase || esperando) return;

    if (editando) {
      const alvo = editando;
      setEditando(undefined);
      setRascunho("");
      mudar(e => editar(e, alvo.id, frase));
      return;
    }

    const citando = respondendo?.id;
    setRascunho("");
    setRespondendo(undefined);
    mudar(e => mandarTexto(e, conversa, frase, citando));
    setEsperando(true);
    setDigitando(true);

    const situacao: Situacao = {
      personagem: conversa,
      quem: nomeDe(conversa),
      tipo: tipoDoContato,
      pedido: estado.pedidos.find(p => p.loja === conversa)?.numero,
      reputacao: comoEstaAReputacao(estado.reputacao[conversa] ?? 50),
    };
    const memoria = mensagens.map(m => ({
      de: m.de === "voce" ? ("voce" as const) : ("outro" as const),
      texto: m.texto,
    }));

    const daIa = await pedirResposta(situacao, [
      ...memoria,
      { de: "voce", texto: frase },
    ]);
    setDigitando(false);
    setEsperando(false);

    /*
     * SE A IA NAO RESPONDEU, NINGUEM RESPONDE.
     *
     * Antes o jogo inventava uma frase por palavra-chave para tapar o buraco.
     * Ordem dele, 07/09/2026: "SEM MENSAGENS AUTOMATICAS". Entao o balao
     * simplesmente nao aparece, e o campo de escrever avisa que a IA ainda nao
     * esta ligada. Silencio honesto e melhor que fala falsa.
     */
    if (!deuCerto(daIa)) return;

    mudar(e =>
      aplicarEfeito(
        receber(e, conversa, { texto: daIa.texto }, true),
        conversa,
        efeitoDaResposta(daIa.intencao)
      )
    );
  }

  function anexar(anexo: Anexo) {
    if (anexo.o === "camera") {
      mudar(e => mandarFoto(e, conversa, "", "Foto da entrega"));
      return;
    }
    if (anexo.o === "local") {
      mudar(e => mandarLocal(e, conversa, "Onde eu estou agora"));
      return;
    }
    if (anexo.o === "local-vivo") {
      mudar(e => mandarLocal(e, conversa, "Onde eu estou agora", true));
      return;
    }
    setAnexoAberto(anexo.o);
  }

  const resultados =
    procura !== null ? procurarNaConversa(estado, conversa, procura) : [];

  return (
    <section
      className="xbw-conversa"
      aria-label={`Conversa com ${nomeDe(conversa)}`}
    >
      {modoSelecao ? (
        <header className="xbw-topo xbw-topo--selecao">
          <button
            type="button"
            className="xbw-botao"
            onClick={() => setSelecionadas([])}
            aria-label="Sair da seleção"
          >
            ✕
          </button>
          <strong className="xbw-marca">{selecionadas.length}</strong>
          <BotaoIcone
            nome="encaminhar"
            rotulo="Encaminhar"
            aoTocar={() =>
              setEncaminhando(acharMensagem(estado, selecionadas[0]!))
            }
          />
          <BotaoIcone
            nome="estrela"
            rotulo="Favoritar"
            aoTocar={() => {
              mudar(e => {
                let atual = e;
                for (const id of selecionadas) {
                  atual = {
                    ...atual,
                    favoritas: atual.favoritas.includes(id)
                      ? atual.favoritas.filter(x => x !== id)
                      : [...atual.favoritas, id],
                  };
                }
                return atual;
              });
              setSelecionadas([]);
            }}
          />
          <BotaoIcone
            nome="lixeira"
            rotulo="Apagar"
            aoTocar={() => {
              mudar(e => {
                let atual = e;
                for (const id of selecionadas) atual = apagarParaMim(atual, id);
                return atual;
              });
              setSelecionadas([]);
            }}
          />
        </header>
      ) : (
        <header className="xbw-topo">
          <button
            type="button"
            className="xbw-botao"
            onClick={aoVoltar}
            aria-label="Voltar"
          >
            <Icone nome="voltar" />
          </button>
          <button
            type="button"
            className="xbw-topo__abrir"
            onClick={aoAbrirPerfil}
            aria-label={`Ver ${nomeDe(conversa)}`}
          >
            <Retrato quem={conversa} tamanho="pequeno" />
            <span className="xbw-topo__quem">
              <strong>{nomeDe(conversa)}</strong>
              {/*
                O "online" e desenho DELE — a bolinha verde e a palavra vem
                juntas na peca. Quando a pessoa NAO esta online, a frase muda
                ("visto por ultimo", "bloqueado", a lista do grupo), e ai volta
                a ser texto: peca com palavra assada so serve onde a palavra e
                sempre a mesma.
              */}
              {online ? (
                <img
                  src={XBW_ICONES.selo}
                  alt="online"
                  className="xbw-selo-img xbw-selo-img--online"
                  draggable={false}
                />
              ) : (
                <small>
                  {tipoDoContato === "grupo"
                    ? (quem as { membros?: readonly IdContato[] })?.membros
                        ?.map(m => nomeDe(m))
                        .join(", ")
                    : estado.bloqueados.includes(conversa)
                      ? "bloqueado"
                      : "visto por último hoje"}
                </small>
              )}
            </span>
          </button>
          <BotaoIcone
            nome="video"
            rotulo="Chamada de vídeo"
            aoTocar={() => aoLigar?.("video")}
          />
          <BotaoIcone
            nome="telefone"
            rotulo="Chamada de voz"
            aoTocar={() => aoLigar?.("voz")}
          />
          <BotaoIcone
            nome="menu"
            rotulo="Mais opções"
            aoTocar={() => setMenu(m => !m)}
          />
        </header>
      )}

      {menu && (
        <nav className="xbw-menu" aria-label="Opções da conversa">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setProcura("");
            }}
          >
            <Icone nome="busca" /> Pesquisar na conversa
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              mudar(e => silenciar(e, conversa));
            }}
          >
            <Icone nome="silenciar" />
            {estado.silenciadas.includes(conversa)
              ? "Reativar notificações"
              : "Silenciar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              aoAbrirPerfil?.();
            }}
          >
            <Icone nome="contato" /> Dados da conversa
          </button>
        </nav>
      )}

      {procura !== null && (
        <div className="xbw-procura xbw-procura--conversa">
          <Icone nome="busca" />
          <input
            type="search"
            value={procura}
            onChange={ev => setProcura(ev.target.value)}
            placeholder="Procurar nesta conversa"
            aria-label="Procurar nesta conversa"
          />
          <button
            type="button"
            onClick={() => setProcura(null)}
            aria-label="Fechar busca"
          >
            ✕
          </button>
        </div>
      )}

      {fixada && procura === null && (
        <button
          type="button"
          className="xbw-fixada"
          onClick={() => mudar(e => fixarMensagem(e, conversa, fixada))}
        >
          <Icone nome="fixar" />
          <span>
            {acharMensagem(estado, fixada)?.texto ?? "Mensagem fixada"}
          </span>
        </button>
      )}

      <div
        className={`xbw-fio xbw-fio--${papelDa(estado, conversa)}`}
        role="log"
        aria-live="polite"
      >
        {procura !== null ? (
          <>
            <p className="xbw-etiqueta">
              {procura.trim()
                ? `${resultados.length} encontrada(s)`
                : "Escreva para procurar"}
            </p>
            {resultados.map(m => (
              <div key={m.id} className="xbw-achado">
                <strong>{m.de === "voce" ? "Você" : nomeDe(m.de)}</strong>
                <small>{m.texto}</small>
                <time>{hora(m.minuto)}</time>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* A tarja "Hoje" e desenho dele: a palavra nunca muda. */}
            <img
              src={XBW_ICONES.seloHoje}
              alt="Hoje"
              className="xbw-selo-img xbw-selo-img--hoje"
              draggable={false}
            />
            {mensagens.map(m => (
              <Balao
                key={m.id}
                mensagem={m}
                grupo={tipoDoContato === "grupo"}
                favorita={estado.favoritas.includes(m.id)}
                citada={
                  m.respondendo
                    ? acharMensagem(estado, m.respondendo)
                    : undefined
                }
                selecionada={selecionadas.includes(m.id)}
                modoSelecao={modoSelecao}
                mostraTique={mostraTiqueAzul(estado)}
                aoSegurar={() => setAcoesDe(m)}
                aoTocar={() => marcar(m.id)}
                aoVotar={opcao => mudar(e => votar(e, m.id, opcao))}
                aoResponderCobranca={pagou =>
                  mudar(e => responderCobranca(e, m.id, pagou))
                }
              />
            ))}
            {digitando && (
              <p className="xbw-digitando-linha" aria-label="digitando">
                <img
                  src={XBW_ICONES.seloDigitando}
                  alt=""
                  aria-hidden="true"
                  className="xbw-selo-img xbw-selo-img--digitando"
                  draggable={false}
                />
              </p>
            )}
          </>
        )}
        <div ref={fim} />
      </div>

      {prontas.length > 0 && !roteiroLigado && procura === null && !modoSelecao && (
        <div
          className={
            escrevendo ? "xbw-respostas xbw-respostas--curtas" : "xbw-respostas"
          }
          role="group"
          aria-label="Respostas"
        >
          {prontas.map(r => (
            <button
              key={r.texto}
              type="button"
              disabled={digitandoResposta !== null}
              onClick={() => {
                setRascunho("");
                setDigitandoResposta(r);
              }}
            >
              {r.texto}
            </button>
          ))}
        </div>
      )}

      {procura === null && !modoSelecao && (
        <BarraDeEscrever
          estado={estado}
          rascunho={rascunho}
          aoMudarRascunho={setRascunho}
          respondendo={respondendo}
          aoLargarResposta={() => setRespondendo(undefined)}
          editando={editando}
          aoLargarEdicao={() => {
            setEditando(undefined);
            setRascunho("");
          }}
          esperando={esperando}
          aoEnviar={() => void mandarEscrito()}
          aoGravar={segundos => mudar(e => mandarAudio(e, conversa, segundos))}
          aoAnexar={anexar}
          aoEscrevendo={setEscrevendo}
          teclaAcesa={teclaAcesa}
          digitandoSozinho={digitandoResposta !== null}
          travado={roteiroLigado}
        />
      )}

      {acoesDe && (
        <AcoesDaMensagem
          mensagem={acoesDe}
          favorita={estado.favoritas.includes(acoesDe.id)}
          fixada={fixada === acoesDe.id}
          aoReagir={emoji => {
            mudar(e => reagir(e, acoesDe.id, emoji));
            setAcoesDe(undefined);
          }}
          aoResponder={() => {
            setRespondendo(acoesDe);
            setAcoesDe(undefined);
          }}
          aoEncaminhar={() => {
            setEncaminhando(acoesDe);
            setAcoesDe(undefined);
          }}
          aoFavoritar={() => {
            mudar(e => ({
              ...e,
              favoritas: e.favoritas.includes(acoesDe.id)
                ? e.favoritas.filter(x => x !== acoesDe.id)
                : [...e.favoritas, acoesDe.id],
            }));
            setAcoesDe(undefined);
          }}
          aoCopiar={() => {
            navigator.clipboard?.writeText(acoesDe.texto).catch(() => {});
            setAcoesDe(undefined);
          }}
          aoFixar={() => {
            mudar(e => fixarMensagem(e, conversa, acoesDe.id));
            setAcoesDe(undefined);
          }}
          aoEditar={() => {
            setEditando(acoesDe);
            setAcoesDe(undefined);
          }}
          aoApagar={() => {
            setApagando(acoesDe);
            setAcoesDe(undefined);
          }}
          aoSelecionar={() => {
            setSelecionadas([acoesDe.id]);
            setAcoesDe(undefined);
          }}
          aoFechar={() => setAcoesDe(undefined)}
        />
      )}

      {apagando && (
        <PerguntaDeApagar
          podeParaTodos={apagando.de === "voce"}
          aoApagarParaMim={() => {
            mudar(e => apagarParaMim(e, apagando.id));
            setApagando(undefined);
          }}
          aoApagarParaTodos={() => {
            mudar(e => apagarParaTodos(e, apagando.id));
            setApagando(undefined);
          }}
          aoFechar={() => setApagando(undefined)}
        />
      )}

      {encaminhando && (
        <EscolherConversa
          titulo="Encaminhar para"
          estado={estado}
          menos={conversa}
          aoEscolher={destino => {
            mudar(e => encaminhar(e, encaminhando.id, [destino], e.minuto));
            setEncaminhando(undefined);
            setSelecionadas([]);
          }}
          aoFechar={() => setEncaminhando(undefined)}
        />
      )}

      {anexoAberto && (
        <Anexador
          o={anexoAberto}
          conversa={conversa}
          aoFechar={() => setAnexoAberto(null)}
          aoMandar={f => {
            mudar(f);
            setAnexoAberto(null);
          }}
        />
      )}
    </section>
  );
}

/** A folha de escolher para onde encaminhar. */
function EscolherConversa({
  titulo,
  estado,
  menos,
  aoEscolher,
  aoFechar,
}: {
  titulo: string;
  estado: EstadoDoApp;
  menos?: IdContato;
  aoEscolher: (destino: IdContato) => void;
  aoFechar: () => void;
}) {
  const todos = [
    ...CONTATOS.map(c => c.id),
    ...estado.grupos.map(g => g.id),
  ].filter(id => id !== menos);
  return (
    <div className="xbw-folha" role="dialog" aria-label={titulo}>
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        <p className="xbw-folha__titulo">{titulo}</p>
        <ul className="xbw-escolher-lista">
          {todos.map(id => (
            <li key={id}>
              <button type="button" onClick={() => aoEscolher(id)}>
                <Retrato quem={id} tamanho="pequeno" />
                <span>{nomeDe(id)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * O ANEXADOR — a folha de cada tipo de anexo que precisa de escolha.
 *
 * Camera e localizacao mandam direto, sem perguntar nada, e por isso nao passam
 * por aqui. Os outros precisam de um dado: qual foto, qual arquivo, qual
 * contato, qual pergunta, quanto dinheiro.
 */
function Anexador({
  o,
  conversa,
  aoMandar,
  aoFechar,
}: {
  o: Anexo["o"];
  conversa: IdContato;
  aoMandar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoFechar: () => void;
}) {
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState("");
  const [valor, setValor] = useState("");
  const fotos = CONTATOS.filter(c => c.foto).slice(0, 8);

  return (
    <div className="xbw-folha" role="dialog" aria-label="Anexar">
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        {o === "figurinha" && (
          <>
            <p className="xbw-folha__titulo">Figurinhas</p>
            <div className="xbw-figurinhas">
              {FIGURINHAS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => aoMandar(e => mandarFigurinha(e, conversa, f))}
                >
                  {f}
                </button>
              ))}
            </div>
          </>
        )}

        {o === "foto" && (
          <>
            <p className="xbw-folha__titulo">Galeria</p>
            <div className="xbw-galeria">
              {fotos.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    aoMandar(e => mandarFoto(e, conversa, c.foto!, ""))
                  }
                >
                  <img src={c.foto} alt="" draggable={false} />
                </button>
              ))}
            </div>
          </>
        )}

        {o === "documento" && (
          <>
            <p className="xbw-folha__titulo">Documento</p>
            <ul className="xbw-folha__lista">
              {DOCUMENTOS.map(d => (
                <li key={d.nome}>
                  <button
                    type="button"
                    onClick={() =>
                      aoMandar(e =>
                        mandarDocumento(e, conversa, {
                          nome: d.nome,
                          tipo: tipoDoArquivo(d.nome),
                          tamanhoKb: d.tamanhoKb,
                        })
                      )
                    }
                  >
                    <Icone nome="documento" /> {d.nome}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {o === "contato" && (
          <>
            <p className="xbw-folha__titulo">Mandar contato</p>
            <ul className="xbw-escolher-lista">
              {CONTATOS.filter(c => c.id !== conversa).map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() =>
                      aoMandar(e => mandarCartao(e, conversa, c.id, c.nome))
                    }
                  >
                    <Retrato quem={c.id} tamanho="pequeno" />
                    <span>{c.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {o === "enquete" && (
          <>
            <p className="xbw-folha__titulo">Nova enquete</p>
            <label className="xbw-linha-de-forma">
              <span>Pergunta</span>
              <input
                value={pergunta}
                onChange={e => setPergunta(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="xbw-linha-de-forma">
              <span>Opções, uma por linha</span>
              <textarea
                value={opcoes}
                onChange={e => setOpcoes(e.target.value)}
                rows={4}
              />
            </label>
            <button
              type="button"
              className="xbw-principal"
              disabled={
                !pergunta.trim() ||
                opcoes.split("\n").filter(x => x.trim()).length < 2
              }
              onClick={() =>
                aoMandar(e =>
                  mandarEnquete(e, conversa, pergunta, opcoes.split("\n"))
                )
              }
            >
              Mandar enquete
            </button>
          </>
        )}

        {(o === "pagamento" || o === "cobranca") && (
          <>
            <p className="xbw-folha__titulo">
              {o === "cobranca" ? "Cobrar quanto?" : "Mandar quanto?"}
            </p>
            <label className="xbw-linha-de-forma">
              <span>Valor em reais</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={valor}
                onChange={e => setValor(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="xbw-principal"
              disabled={!(Number(valor) > 0)}
              onClick={() =>
                aoMandar(e =>
                  mandarPagamento(e, conversa, Number(valor), o === "cobranca")
                )
              }
            >
              {o === "cobranca" ? "Mandar cobrança" : "Mandar pagamento"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
