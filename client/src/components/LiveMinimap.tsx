import {
  XB_CITY_ROUTE,
  XB_CITY_STREETS,
  minimapRouteSnapshot,
} from "@/game/minimap";

interface LiveMinimapProps {
  progress: number;
  routeName: string;
}

const points = (items: readonly { x: number; y: number }[]): string =>
  items.map(point => `${point.x},${point.y}`).join(" ");

const cityBlocks = [
  { x: 20, y: 78, width: 8, height: 7 },
  { x: 37, y: 61, width: 10, height: 7 },
  { x: 56, y: 42, width: 9, height: 8 },
  { x: 74, y: 25, width: 8, height: 7 },
  { x: 20, y: 58, width: 7, height: 8 },
  { x: 56, y: 61, width: 9, height: 7 },
  { x: 75, y: 43, width: 8, height: 8 },
  { x: 37, y: 25, width: 9, height: 7 },
] as const;

/*
 * Sem React.memo de propósito: `progress` é o motivo do componente existir e
 * muda a cada publicação do motor, então o memo nunca pulava um render.
 */
function LiveMinimap({ progress, routeName }: LiveMinimapProps) {
  const snapshot = minimapRouteSnapshot(progress);
  const destination = XB_CITY_ROUTE.at(-1) ?? XB_CITY_ROUTE[0];
  const traveled = Math.round(snapshot.progress * 100);

  return (
    <figure className="live-minimap" aria-label="Minimapa da Cidade XB">
      <figcaption>
        <span>CIDADE XB · AO VIVO</span>
        <strong>{traveled}%</strong>
      </figcaption>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Posição do entregador na rota ${routeName}: ${traveled}% concluída`}
      >
        <rect
          className="live-minimap__ground"
          x="3"
          y="3"
          width="94"
          height="94"
          rx="8"
        />
        <g aria-hidden="true" className="live-minimap__blocks">
          {cityBlocks.map((block, index) => (
            <rect key={index} {...block} rx="1.5" />
          ))}
        </g>
        <g aria-hidden="true" className="live-minimap__streets">
          {XB_CITY_STREETS.map(street => (
            <polyline
              key={street.id}
              className={`is-${street.kind}`}
              points={points(street.points)}
            />
          ))}
        </g>
        <path
          aria-hidden="true"
          className="live-minimap__route-shadow"
          d={snapshot.routePath}
          pathLength="100"
        />
        <path
          aria-hidden="true"
          className="live-minimap__route"
          d={snapshot.routePath}
          pathLength="100"
        />
        <path
          aria-hidden="true"
          className="live-minimap__route-traveled"
          d={snapshot.routePath}
          pathLength="100"
          strokeDasharray={`${traveled} 100`}
        />
        <circle
          aria-hidden="true"
          className="live-minimap__origin"
          cx={XB_CITY_ROUTE[0].x}
          cy={XB_CITY_ROUTE[0].y}
          r="2.5"
        />
        <g
          aria-hidden="true"
          className="live-minimap__destination"
          transform={`translate(${destination.x} ${destination.y})`}
        >
          <circle r="5" />
          <path d="M 0 -3.4 L 2.8 1.8 L 0 4 L -2.8 1.8 Z" />
        </g>
        {!snapshot.completed && (
          <circle
            aria-hidden="true"
            className="live-minimap__checkpoint"
            cx={snapshot.nextCheckpoint.x}
            cy={snapshot.nextCheckpoint.y}
            r="3.2"
          />
        )}
        <g
          aria-hidden="true"
          className="live-minimap__player"
          transform={`translate(${snapshot.point.x} ${snapshot.point.y}) rotate(${snapshot.headingDegrees + 90})`}
        >
          <circle r="5.2" />
          <path d="M 0 -4.2 L 3.3 3.2 L 0 2.1 L -3.3 3.2 Z" />
        </g>
      </svg>
      <div className="live-minimap__legend" aria-hidden="true">
        <span>
          <i className="is-player" /> ENTREGADOR
        </span>
        <span>
          <i className="is-destination" /> DESTINO
        </span>
      </div>
    </figure>
  );
}

export default LiveMinimap;
