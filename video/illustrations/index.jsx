// Original Thozhan illustrations, drawn as SVG and exported to apps/mobile/assets/illustrations
// by `npm run render:illustrations`. All text stays in the app, so one picture serves both languages.
import React from 'react';
import { Composition, registerRoot } from 'remotion';

const G = {
  deep: '#174a3b',
  mid: '#2c7a5f',
  soft: '#e5efe9',
  lime: '#c8f169',
  ink: '#14201b',
  tyre: '#20302a',
  hub: '#dfe5df',
  glass: '#cfe8f2',
  card: '#d9a066',
  cardDark: '#b97f47',
};

const Shadow = ({ cx = 240, cy = 312, rx = 190 }) => <ellipse cx={cx} cy={cy} rx={rx} ry={13} fill="#14201b" opacity="0.14" />;

const Wheel = ({ x, y, r = 34 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={G.tyre} />
    <circle cx={x} cy={y} r={r * 0.56} fill={G.hub} />
    <circle cx={x} cy={y} r={r * 0.2} fill={G.deep} />
  </g>
);

const AutoBody = () => (
  <g>
    {/* soft-top hood, rounded at the back and running down to the windscreen */}
    <path d="M78 186 Q66 70 150 58 L292 54 Q330 54 340 84 L372 186 Z" fill={G.ink} />
    <path d="M112 186 Q106 96 158 86 L236 84 L236 186 Z" fill={G.glass} />
    <path d="M252 84 L296 82 Q316 82 322 100 L348 186 L252 186 Z" fill={G.glass} />
    {/* passenger bench and the driver's handlebar */}
    <path d="M126 186 L126 140 Q126 128 140 128 L206 128 Q218 128 218 140 L218 186 Z" fill={G.mid} />
    <path d="M292 186 L312 138 L334 132" fill="none" stroke={G.ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    {/* tub with a nose that narrows to the single front wheel */}
    <path d="M68 180 L366 180 Q398 186 412 222 L434 270 Q438 282 424 282 L82 282 Q60 282 60 260 L60 200 Q60 182 68 180 Z" fill={G.deep} />
    <path d="M60 222 L408 222 L421 248 L60 248 Z" fill={G.lime} />
    <circle cx="414" cy="204" r="12" fill="#fff3bf" stroke={G.ink} strokeWidth="4" />
    <path d="M100 282 A50 50 0 0 1 200 282 Z" fill={G.ink} />
    <path d="M352 284 A38 38 0 0 1 428 284 Z" fill={G.ink} />
  </g>
);

const AutoWheels = () => (
  <>
    <Wheel x={150} y={282} r={34} />
    <Wheel x={390} y={288} r={27} />
  </>
);

const Auto = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow />
    <AutoBody />
    <AutoWheels />
  </svg>
);

const Box = ({ x, y, w, h }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="6" fill={G.card} />
    <rect x={x} y={y} width={w} height={h * 0.2} rx="6" fill={G.cardDark} />
    <rect x={x + w * 0.42} y={y} width={w * 0.16} height={h} fill={G.lime} />
  </g>
);

const Parcel = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow rx={170} cy={316} />
    <Box x={92} y={172} w={176} h={140} />
    <Box x={252} y={210} w={140} h={102} />
    <Box x={150} y={70} w={132} h={106} />
  </svg>
);

const ParcelAuto = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow />
    <AutoBody />
    <Box x={122} y={128} w={100} h={58} />
    <Box x={146} y={92} w={58} h={38} />
    <AutoWheels />
  </svg>
);

const Bike = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow rx={180} />
    <Wheel x={112} y={270} r={48} />
    <Wheel x={374} y={270} r={48} />
    <path d="M112 270 L196 186 L306 186 L374 270" fill="none" stroke={G.ink} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M196 180 Q250 128 324 150 L336 196 Q258 226 192 208 Z" fill={G.deep} />
    <path d="M214 176 Q256 146 312 158" fill="none" stroke={G.lime} strokeWidth="10" strokeLinecap="round" />
    <path d="M98 176 L206 170 Q218 170 216 182 L206 196 L110 200 Q90 200 98 176 Z" fill={G.ink} />
    <path d="M330 96 L306 186" stroke={G.ink} strokeWidth="14" strokeLinecap="round" />
    <path d="M296 92 L350 96" stroke={G.ink} strokeWidth="14" strokeLinecap="round" />
    <circle cx="350" cy="136" r="17" fill="#fff3bf" stroke={G.ink} strokeWidth="5" />
  </svg>
);

const Scooter = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow rx={180} />
    <path d="M86 264 Q78 192 130 176 L252 176 L240 244 L304 244 L322 264 Z" fill={G.deep} />
    <path d="M88 226 L246 226 L243 244 L88 244 Z" fill={G.lime} />
    <path d="M122 170 Q122 148 148 148 L232 148 Q254 148 254 168 L254 178 L122 178 Z" fill={G.ink} />
    <path d="M296 256 L330 122 Q334 106 352 106 L370 110 L346 264 Z" fill={G.deep} />
    <path d="M318 172 L358 176 L354 200 L312 196 Z" fill={G.lime} />
    <path d="M344 108 L336 72" stroke={G.ink} strokeWidth="13" strokeLinecap="round" />
    <path d="M306 74 L364 68" stroke={G.ink} strokeWidth="13" strokeLinecap="round" />
    <circle cx="362" cy="124" r="14" fill="#fff3bf" stroke={G.ink} strokeWidth="5" />
    <path d="M312 284 A50 50 0 0 1 412 284 Z" fill={G.ink} />
    <Wheel x={132} y={278} r={38} />
    <Wheel x={362} y={278} r={38} />
  </svg>
);

const Cab = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%">
    <Shadow rx={205} />
    <path d="M44 238 Q44 202 88 196 L134 190 L180 128 Q190 116 212 116 L324 116 Q348 116 362 134 L398 188 Q446 196 450 232 L452 276 L44 276 Z" fill={G.deep} />
    <path d="M196 136 L252 136 L252 190 L158 190 Z" fill={G.glass} />
    <path d="M270 136 L326 136 Q340 136 348 148 L374 190 L270 190 Z" fill={G.glass} />
    <rect x="46" y="228" width="404" height="16" fill={G.lime} />
    <rect x="228" y="96" width="62" height="22" rx="6" fill={G.lime} />
    <circle cx="438" cy="214" r="9" fill="#fff3bf" />
    <rect x="44" y="206" width="16" height="16" rx="4" fill="#d74b3f" />
    <Wheel x={132} y={276} r={38} />
    <Wheel x={362} y={276} r={38} />
  </svg>
);

const BUILDINGS = [
  [0, 120],
  [70, 70],
  [130, 150],
  [210, 96],
  [286, 178],
  [376, 110],
  [452, 140],
  [540, 86],
  [620, 168],
  [710, 104],
  [790, 146],
  [870, 88],
  [950, 160],
  [1030, 110],
];

const Hero = ({ boxes }) => (
  <svg viewBox="0 0 1080 560" width="100%" height="100%">
    <rect width="1080" height="560" fill={G.deep} />
    <circle cx="880" cy="130" r="150" fill={G.lime} opacity="0.92" />
    <g fill={G.mid} opacity="0.55">
      {BUILDINGS.map(([x, h]) => (
        <rect key={x} x={x} y={448 - h} width={72} height={h} rx="4" />
      ))}
    </g>
    <rect y="446" width="1080" height="114" fill={G.ink} />
    {[60, 250, 440, 630, 820, 1010].map((x) => (
      <rect key={x} x={x} y="498" width="110" height="10" rx="5" fill={G.lime} />
    ))}
    <g transform="translate(446 176) scale(1.06)">
      <AutoBody />
      {boxes ? (
        <>
          <Box x={122} y={128} w={100} h={58} />
          <Box x={146} y={92} w={58} h={38} />
        </>
      ) : null}
      <AutoWheels />
    </g>
  </svg>
);

const HeroParcel = () => <Hero boxes />;
const HeroLogin = () => <Hero />;

const STILLS = [
  ['auto', Auto, 480, 360],
  ['bike', Bike, 480, 360],
  ['scooter', Scooter, 480, 360],
  ['cab', Cab, 480, 360],
  ['parcel', Parcel, 480, 360],
  ['parcel-auto', ParcelAuto, 480, 360],
  ['hero-parcel', HeroParcel, 1080, 560],
  ['hero-login', HeroLogin, 1080, 560],
];

const Root = () => (
  <>
    {STILLS.map(([id, Art, width, height]) => (
      <Composition key={id} id={id} component={Art} durationInFrames={1} fps={30} width={width} height={height} />
    ))}
  </>
);

registerRoot(Root);
