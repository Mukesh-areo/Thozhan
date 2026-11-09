// 1920×1080 narrated explainer: product walkthrough, revenue model and benefits.
// Scenes and narration live in script.json; clip lengths in durations.json
// (regenerate with `npm run narration`). Screens come from `npm run screens`.
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadTamil } from "@remotion/google-fonts/NotoSansTamil";
import script from "./script.json";
import durations from "./durations.json";

const { fontFamily: HEAD } = loadManrope("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});
const { fontFamily: BODY } = loadDmSans("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});
const { fontFamily: TAMIL } = loadTamil("normal", {
  weights: ["400", "600", "700"],
  subsets: ["tamil"],
});

export const FPS = 30;
const LEAD_IN = 9; // frames of silence before each narration clip
const TAIL = 12; // frames after it

const C = {
  bg: "#0f3328",
  bg2: "#164b3c",
  ink: "#ffffff",
  soft: "#c6d6cb",
  muted: "#8fae9c",
  lime: "#d8ef91",
  card: "#ffffff12",
  line: "#ffffff22",
  warn: "#f4c76b",
};
const head = { fontFamily: `${HEAD}, ${TAMIL}, sans-serif` };
const body = { fontFamily: `${BODY}, ${TAMIL}, sans-serif` };
const tamil = { fontFamily: `${TAMIL}, sans-serif` };

export const SCENES = script.map((s) => ({
  ...s,
  frames: Math.ceil((durations[s.id] ?? 5) * FPS) + LEAD_IN + TAIL,
}));
export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0);

// ---------- motion helpers ----------

function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
}

function Rise({ delay = 0, children, style }) {
  const p = useEnter(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 28}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- chrome ----------

function Header({ index, label }) {
  return (
    <>
      <div
        style={{
          ...head,
          position: "absolute",
          left: 80,
          top: 50,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        thozhan<span style={{ color: C.lime }}> ↗</span>
        <span
          style={{
            ...tamil,
            fontSize: 20,
            fontWeight: 600,
            color: C.muted,
            marginLeft: 16,
          }}
        >
          தோழன்
        </span>
      </div>
      <div
        style={{
          ...body,
          position: "absolute",
          right: 80,
          top: 62,
          fontSize: 18,
          letterSpacing: 3,
          color: C.muted,
        }}
      >
        {label ? label.toUpperCase() + " · " : ""}
        {String(index + 1).padStart(2, "0")} / {SCENES.length}
      </div>
    </>
  );
}

/** Narration shown as captions, one sentence at a time, timed by character count. */
function Captions({ text, frames }) {
  const frame = useCurrentFrame() - LEAD_IN;
  const sentences = text
    .match(/[^.!?:]+[.!?:]?/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const totalChars = sentences.reduce((n, s) => n + s.length, 0);
  const speech = frames - LEAD_IN - TAIL;
  let start = 0;
  let current = sentences[0];
  for (const s of sentences) {
    const len = (s.length / totalChars) * speech;
    if (frame >= start) current = s;
    start += len;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 58,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          ...body,
          maxWidth: 1500,
          fontSize: 30,
          lineHeight: 1.4,
          color: "#fff",
          background: "#00000059",
          padding: "12px 28px",
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        {current}
      </div>
    </div>
  );
}

function Progress({ start }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 6,
        background: "#ffffff14",
      }}
    >
      <div
        style={{
          width: `${((start + frame) / TOTAL_FRAMES) * 100}%`,
          height: 6,
          background: C.lime,
        }}
      />
    </div>
  );
}

function Titles({ step, title, titleTa, delay = 0, size = 58 }) {
  return (
    <>
      {step ? (
        <Rise delay={delay}>
          <span
            style={{
              ...body,
              display: "inline-block",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              color: C.bg,
              background: C.lime,
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            {step.toUpperCase()}
          </span>
        </Rise>
      ) : null}
      <Rise delay={delay + 4}>
        <div
          style={{
            ...head,
            fontSize: size,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.12,
            marginTop: step ? 26 : 0,
          }}
        >
          {title}
        </div>
      </Rise>
      <Rise delay={delay + 8}>
        <div
          style={{
            ...tamil,
            fontSize: size * 0.48,
            fontWeight: 600,
            color: C.lime,
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          {titleTa}
        </div>
      </Rise>
    </>
  );
}

// ---------- device frames ----------

// focus = [cx, cy, scale]: after a moment on the full screen, ease in on the part the
// narration is about (cx, cy as fractions of the screenshot).
function Desktop({ src, width = 1140, focus }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cx, cy, scale] = focus ?? [0.5, 0, 1.04];
  const p = focus
    ? spring({
        frame: frame - 45,
        fps,
        config: { damping: 200 },
        durationInFrames: 50,
      })
    : interpolate(frame, [0, 600], [0, 1], { extrapolateRight: "clamp" });
  const zoom = 1 + (scale - 1) * p;
  const height = (width * 1800) / 2880;
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 40px 100px #0009",
        background: "#fff",
      }}
    >
      <div
        style={{
          height: 38,
          background: "#e9ece6",
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 18px",
        }}
      >
        {["#ec6a5e", "#f4bf4f", "#61c554"].map((c) => (
          <span
            key={c}
            style={{ width: 13, height: 13, borderRadius: 7, background: c }}
          />
        ))}
        <span
          style={{
            ...body,
            marginLeft: 18,
            fontSize: 15,
            color: "#6b776f",
            background: "#fff",
            borderRadius: 8,
            padding: "4px 16px",
          }}
        >
          thozhan · Chennai pilot demo
        </span>
      </div>
      <div style={{ height, overflow: "hidden" }}>
        <Img
          src={staticFile(`screens/${src}.png`)}
          style={{
            width,
            transform: `scale(${zoom})`,
            transformOrigin: `${cx * 100}% ${cy * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

function Phone({ src, height = 840 }) {
  const width = (height * 390) / 844;
  return (
    <div
      style={{
        width: width + 24,
        height: height + 24,
        borderRadius: 56,
        background: "#0b1f18",
        padding: 12,
        boxShadow: "0 40px 100px #000a",
      }}
    >
      <div
        style={{
          width,
          height,
          borderRadius: 44,
          overflow: "hidden",
          background: "#f7f8f4",
        }}
      >
        <Img
          src={staticFile(`screens/${src}.png`)}
          style={{ width, height, objectFit: "cover", objectPosition: "top" }}
        />
      </div>
    </div>
  );
}

// ---------- scene kinds ----------

function TitleScene({ s }) {
  const p = useEnter(4);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 120,
          transform: `translateX(${(1 - p) * -400}px)`,
          opacity: p,
        }}
      >
        🛺
      </div>
      <Rise delay={10}>
        <div
          style={{ ...head, fontSize: 150, fontWeight: 800, letterSpacing: -6 }}
        >
          Thozhan<span style={{ color: C.lime }}>↗</span>
        </div>
      </Rise>
      <Rise delay={18}>
        <div
          style={{
            ...tamil,
            fontSize: 46,
            fontWeight: 700,
            color: C.lime,
            marginTop: 6,
          }}
        >
          {s.titleTa}
        </div>
      </Rise>
      <Rise delay={26}>
        <div style={{ ...body, fontSize: 34, color: C.soft, marginTop: 26 }}>
          {s.subtitle}
        </div>
      </Rise>
      <Rise delay={34}>
        <div
          style={{
            ...body,
            fontSize: 20,
            color: C.muted,
            marginTop: 50,
            letterSpacing: 3,
          }}
        >
          PILOT PROPOSAL · CHENNAI · NOVEMBER 2026
        </div>
      </Rise>
    </AbsoluteFill>
  );
}

function BulletList({ bullets, delay = 18, size = 36, icon = "●" }) {
  return (
    <div style={{ marginTop: 50 }}>
      {bullets.map((b, i) => (
        <Rise key={b} delay={delay + i * 10}>
          <div
            style={{
              ...body,
              display: "flex",
              gap: 22,
              alignItems: "baseline",
              fontSize: size,
              lineHeight: 1.35,
              marginBottom: 26,
            }}
          >
            <span style={{ color: C.lime, fontSize: size * 0.6 }}>{icon}</span>
            <span>{b}</span>
          </div>
        </Rise>
      ))}
    </div>
  );
}

function BulletsScene({ s }) {
  return (
    <AbsoluteFill style={{ padding: "170px 160px" }}>
      <Titles title={s.title} titleTa={s.titleTa} size={70} />
      <BulletList bullets={s.bullets} />
    </AbsoluteFill>
  );
}

function ServicesScene({ s }) {
  return (
    <AbsoluteFill style={{ padding: "160px 140px" }}>
      <Titles title={s.title} titleTa={s.titleTa} size={66} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 30,
          marginTop: 70,
        }}
      >
        {s.services.map(([icon, name, note, ta], i) => (
          <Rise key={name} delay={16 + i * 10}>
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 28,
                padding: "44px 30px",
                textAlign: "center",
                minHeight: 340,
              }}
            >
              <div style={{ fontSize: 90 }}>{icon}</div>
              <div
                style={{
                  ...head,
                  fontSize: 40,
                  fontWeight: 800,
                  marginTop: 18,
                }}
              >
                {name}
              </div>
              <div
                style={{ ...tamil, fontSize: 26, color: C.lime, marginTop: 8 }}
              >
                {ta}
              </div>
              <div
                style={{
                  ...body,
                  fontSize: 24,
                  color: i === 1 ? C.warn : C.soft,
                  marginTop: 18,
                }}
              >
                {note}
              </div>
            </div>
          </Rise>
        ))}
      </div>
      <Rise delay={60}>
        <div
          style={{
            ...body,
            fontSize: 26,
            color: C.soft,
            marginTop: 44,
            textAlign: "center",
          }}
        >
          One fare engine · one safety system · one operations view · each
          service switched on only after approval
        </div>
      </Rise>
    </AbsoluteFill>
  );
}

function TariffScene({ s }) {
  const rows = [
    ["Minimum distance", "குறைந்தபட்சத் தூரம்", "1.8 km"],
    ["Minimum fare", "குறைந்தபட்சக் கட்டணம்", "₹50"],
    ["Each additional km", "கூடுதல் கி.மீ.", "₹25"],
    ["Waiting", "காத்திருப்பு", "₹1 / min"],
    ["Night, 10 PM – 5 AM", "இரவு", "1.5 × fare"],
    ["Ghat road", "மலைப்பாதை", "₹60 + ₹30/km"],
  ];
  return (
    <AbsoluteFill
      style={{ padding: "150px 140px", flexDirection: "row", gap: 80 }}
    >
      <div style={{ flex: 1 }}>
        <Titles title={s.title} titleTa={s.titleTa} size={60} />
        <Rise delay={20}>
          <div
            style={{
              ...body,
              fontSize: 24,
              color: C.soft,
              marginTop: 40,
              lineHeight: 1.6,
            }}
          >
            G.O. Ms. No. 366, Home (Transport-I) Department, 27.10.2026
            <br />
            Tamil Nadu Government Gazette Extraordinary No. 466
          </div>
        </Rise>
        <Rise delay={70}>
          <div
            style={{
              marginTop: 50,
              background: C.lime,
              color: C.bg,
              borderRadius: 24,
              padding: "28px 34px",
            }}
          >
            <div style={{ ...body, fontSize: 24, fontWeight: 700 }}>
              Worked example · 5 km, daytime
            </div>
            <div
              style={{ ...head, fontSize: 46, fontWeight: 800, marginTop: 8 }}
            >
              ₹50 + 3.2 km × ₹25 = ₹130
            </div>
          </div>
        </Rise>
      </div>
      <div
        style={{
          width: 760,
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 28,
          padding: "20px 40px",
          alignSelf: "center",
        }}
      >
        {rows.map(([en, ta, v], i) => (
          <Rise key={en} delay={14 + i * 8}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 0,
                padding: "22px 0",
              }}
            >
              <div>
                <div style={{ ...body, fontSize: 30 }}>{en}</div>
                <div style={{ ...tamil, fontSize: 20, color: C.muted }}>
                  {ta}
                </div>
              </div>
              <div
                style={{
                  ...head,
                  fontSize: 38,
                  fontWeight: 800,
                  color: C.lime,
                }}
              >
                {v}
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function CompareScene({ s }) {
  return (
    <AbsoluteFill style={{ padding: "150px 90px", alignItems: "center" }}>
      <Titles title={s.title} titleTa={s.titleTa} size={56} />
      <div style={{ display: "flex", gap: 50, marginTop: 50 }}>
        {s.screens.map((src, i) => (
          <Rise key={src} delay={14 + i * 12}>
            <div
              style={{
                ...body,
                fontSize: 26,
                color: C.lime,
                marginBottom: 14,
                textAlign: "center",
              }}
            >
              {i === 0 ? "தமிழ்" : "English"}
            </div>
            <Desktop src={src} width={820} />
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ScreenScene({ s }) {
  const phone = s.frame === "phone";
  return (
    <AbsoluteFill
      style={{
        padding: "150px 90px 150px 110px",
        flexDirection: "row",
        alignItems: "center",
        gap: 70,
      }}
    >
      <div style={{ width: phone ? 900 : 560, flexShrink: 0 }}>
        <Titles
          step={s.step}
          title={s.title}
          titleTa={s.titleTa}
          size={phone ? 62 : 52}
        />
      </div>
      <Rise
        delay={6}
        style={{ flex: 1, display: "flex", justifyContent: "center" }}
      >
        {phone ? (
          <Phone src={s.screen} height={790} />
        ) : (
          <Desktop src={s.screen} width={1120} focus={s.focus} />
        )}
      </Rise>
    </AbsoluteFill>
  );
}

function Bar({ label, value, max, color, delay, note }) {
  const p = useEnter(delay);
  return (
    <div style={{ marginBottom: 34 }}>
      <div
        style={{
          ...body,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 28,
          marginBottom: 10,
        }}
      >
        <span>{label}</span>
        <span style={{ ...head, fontWeight: 800, color }}>{note}</span>
      </div>
      <div
        style={{
          height: 46,
          background: "#ffffff10",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100 * p}%`,
            height: 46,
            background: color,
            borderRadius: 12,
          }}
        />
      </div>
    </div>
  );
}

function RevenueScene({ s }) {
  return (
    <AbsoluteFill
      style={{ padding: "150px 140px", flexDirection: "row", gap: 90 }}
    >
      <div style={{ width: 720 }}>
        <Titles title={s.title} titleTa={s.titleTa} size={58} />
        <BulletList
          delay={20}
          size={30}
          icon="✓"
          bullets={[
            "Charged once per India-calendar day",
            "Only after the first completed trip",
            "Nothing on days with no earnings",
            "0% commission on every fare",
          ]}
        />
      </div>
      <div style={{ flex: 1, alignSelf: "center" }}>
        <Rise delay={30}>
          <div
            style={{ ...body, fontSize: 24, color: C.muted, marginBottom: 30 }}
          >
            ILLUSTRATIVE DAY · ₹1,200 IN FARES
          </div>
        </Rise>
        <Bar
          label="20% commission model takes"
          value={240}
          max={240}
          color="#e0806f"
          delay={40}
          note="₹240"
        />
        <Bar
          label="Thozhan takes"
          value={10}
          max={240}
          color={C.lime}
          delay={60}
          note="₹10"
        />
        <Rise delay={85}>
          <div style={{ display: "flex", gap: 30, marginTop: 30 }}>
            {[
              ["Driver keeps", "₹960", "#e0806f"],
              ["Driver keeps", "₹1,190", C.lime],
            ].map(([l, v, c], i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 22,
                  padding: "24px 28px",
                }}
              >
                <div style={{ ...body, fontSize: 22, color: C.muted }}>
                  {i === 0 ? "Commission model" : "Thozhan"}
                </div>
                <div style={{ ...body, fontSize: 24, marginTop: 6 }}>{l}</div>
                <div
                  style={{ ...head, fontSize: 54, fontWeight: 800, color: c }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </Rise>
        <Rise delay={95}>
          <div style={{ ...body, fontSize: 19, color: C.muted, marginTop: 22 }}>
            Illustrative comparison; not a statement about any specific company.
          </div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
}

function ScaleScene({ s }) {
  const rows = [
    ["500", "12,500", "₹1.25 lakh"],
    ["2,000", "50,000", "₹5 lakh"],
    ["5,000", "1,25,000", "₹12.5 lakh"],
    ["20,000", "5,00,000", "₹50 lakh"],
  ];
  return (
    <AbsoluteFill
      style={{ padding: "150px 140px", flexDirection: "row", gap: 80 }}
    >
      <div style={{ width: 640 }}>
        <Titles title={s.title} titleTa={s.titleTa} size={60} />
        <Rise delay={70}>
          <div
            style={{
              marginTop: 50,
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 24,
              padding: "26px 30px",
            }}
          >
            <div style={{ ...body, fontSize: 22, color: C.muted }}>
              BREAK-EVEN (ILLUSTRATIVE)
            </div>
            <div
              style={{
                ...head,
                fontSize: 44,
                fontWeight: 800,
                color: C.lime,
                marginTop: 6,
              }}
            >
              ≈ 1,905 paying drivers
            </div>
            <div
              style={{
                ...body,
                fontSize: 22,
                color: C.soft,
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              ₹4 lakh fixed cost ÷ (₹10 × 25 days − ₹40 variable per driver)
            </div>
          </div>
        </Rise>
        <Rise delay={90}>
          <div
            style={{
              ...body,
              fontSize: 22,
              color: C.soft,
              marginTop: 30,
              lineHeight: 1.6,
            }}
          >
            + Parcel delivery · Corporate accounts
            <br />
            Gross figures, before taxes; to be validated in the pilot.
          </div>
        </Rise>
      </div>
      <div
        style={{
          flex: 1,
          alignSelf: "center",
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 28,
          padding: "16px 40px",
        }}
      >
        <div
          style={{
            ...body,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            fontSize: 22,
            color: C.muted,
            padding: "18px 0",
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <span>Paying drivers</span>
          <span>Paid days / month</span>
          <span style={{ textAlign: "right" }}>Gross / month</span>
        </div>
        {rows.map(([d, days, g], i) => (
          <Rise key={d} delay={18 + i * 12}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                alignItems: "center",
                padding: "26px 0",
                borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 0,
              }}
            >
              <span style={{ ...head, fontSize: 40, fontWeight: 800 }}>
                {d}
              </span>
              <span style={{ ...body, fontSize: 30, color: C.soft }}>
                {days}
              </span>
              <span
                style={{
                  ...head,
                  fontSize: 40,
                  fontWeight: 800,
                  color: C.lime,
                  textAlign: "right",
                }}
              >
                {g}
              </span>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

const AUDIENCE_ICON = { Government: "🏛️", Public: "👨‍👩‍👧", Drivers: "🛺" };

function BenefitsScene({ s }) {
  return (
    <AbsoluteFill
      style={{
        padding: "150px 140px",
        flexDirection: "row",
        gap: 90,
        alignItems: "center",
      }}
    >
      <div style={{ width: 560 }}>
        <Rise>
          <div style={{ fontSize: 150 }}>{AUDIENCE_ICON[s.audience]}</div>
        </Rise>
        <Titles title={s.title} titleTa={s.titleTa} size={60} delay={6} />
      </div>
      <div style={{ flex: 1 }}>
        <BulletList bullets={s.bullets} size={38} icon="✓" delay={16} />
      </div>
    </AbsoluteFill>
  );
}

function RoadmapScene({ s }) {
  const stages = [
    [
      "Today",
      "Working demo",
      "Tested fare engine, meter, Tamil/English web app",
      true,
    ],
    [
      "Next",
      "Build the MVP",
      "Secure backend, Android passenger & driver apps, meter road tests",
      false,
    ],
    [
      "Pilot",
      "Chennai pilot",
      "50–150 verified auto drivers, staffed support, published results",
      false,
    ],
    [
      "Then",
      "Expand",
      "More zones; cabs, parcels, bikes only as approved",
      false,
    ],
  ];
  return (
    <AbsoluteFill style={{ padding: "160px 140px" }}>
      <Titles title={s.title} titleTa={s.titleTa} size={62} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 26,
          marginTop: 70,
        }}
      >
        {stages.map(([when, name, detail, done], i) => (
          <Rise key={when} delay={16 + i * 12}>
            <div
              style={{
                borderTop: `6px solid ${done ? C.lime : C.line}`,
                paddingTop: 26,
              }}
            >
              <div
                style={{
                  ...body,
                  fontSize: 22,
                  letterSpacing: 2,
                  color: done ? C.lime : C.muted,
                }}
              >
                {when.toUpperCase()}
              </div>
              <div
                style={{ ...head, fontSize: 40, fontWeight: 800, marginTop: 8 }}
              >
                {name}
              </div>
              <div
                style={{
                  ...body,
                  fontSize: 26,
                  color: C.soft,
                  marginTop: 14,
                  lineHeight: 1.45,
                }}
              >
                {detail}
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene({ s }) {
  return (
    <AbsoluteFill
      style={{
        padding: "150px 160px",
        flexDirection: "row",
        gap: 100,
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1 }}>
        <Titles title={s.title} titleTa={s.titleTa} size={70} />
        <BulletList bullets={s.bullets} size={38} icon="→" delay={16} />
      </div>
      <Rise delay={50} style={{ width: 560, textAlign: "center" }}>
        <div
          style={{ ...head, fontSize: 110, fontWeight: 800, letterSpacing: -4 }}
        >
          Thozhan<span style={{ color: C.lime }}>↗</span>
        </div>
        <div style={{ ...tamil, fontSize: 44, color: C.lime, marginTop: 10 }}>
          தோழன் = friend
        </div>
        <div style={{ ...tamil, fontSize: 64, fontWeight: 700, marginTop: 50 }}>
          நன்றி
        </div>
        <div style={{ ...body, fontSize: 30, color: C.soft }}>Thank you</div>
      </Rise>
    </AbsoluteFill>
  );
}

const KINDS = {
  title: TitleScene,
  bullets: BulletsScene,
  services: ServicesScene,
  tariff: TariffScene,
  compare: CompareScene,
  screen: ScreenScene,
  revenue: RevenueScene,
  scale: ScaleScene,
  benefits: BenefitsScene,
  roadmap: RoadmapScene,
  closing: ClosingScene,
};

const CHAPTER = (s) =>
  s.kind === "screen" || s.kind === "compare"
    ? "How it works"
    : ["revenue", "scale"].includes(s.kind)
      ? "Revenue model"
      : s.kind === "benefits"
        ? "Benefits"
        : "";

function SceneFrame({ s, index, start }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 8, s.frames - 8, s.frames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const Kind = KINDS[s.kind];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity }}>
        <Kind s={s} />
        {index > 0 ? <Header index={index} label={CHAPTER(s)} /> : null}
        <Captions text={s.narration} frames={s.frames} />
      </AbsoluteFill>
      <Progress start={start} />
      <Sequence from={LEAD_IN}>
        <Audio src={staticFile(`narration/${s.id}.wav`)} />
      </Sequence>
    </AbsoluteFill>
  );
}

export function Explainer() {
  let start = 0;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 70% 40%, ${C.bg2} 0%, ${C.bg} 70%)`,
        color: C.ink,
      }}
    >
      {SCENES.map((s, i) => {
        const from = start;
        start += s.frames;
        return (
          <Sequence
            key={s.id}
            from={from}
            durationInFrames={s.frames}
            name={s.id}
          >
            <SceneFrame s={s} index={i} start={from} />
          </Sequence>
        );
      })}
      <div
        style={{
          ...body,
          position: "absolute",
          right: 80,
          bottom: 22,
          fontSize: 15,
          color: "#ffffff66",
        }}
      >
        Demo data · fares per G.O. Ms. No. 366 (2026) · cab, bike and parcel
        rates illustrative
      </div>
    </AbsoluteFill>
  );
}
