import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RecordFlow — record your screen, share in seconds";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0f0f0f",
          backgroundImage:
            "radial-gradient(50% 60% at 85% 10%, rgba(255,0,157,0.35), transparent), radial-gradient(50% 60% at 10% 90%, rgba(85,1,254,0.4), transparent)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "linear-gradient(135deg, #FF009D, #5501FE)",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                backgroundColor: "white",
              }}
            />
          </div>
          <div style={{ fontSize: "44px", fontWeight: 700 }}>RecordFlow</div>
        </div>
        <div
          style={{
            marginTop: "56px",
            fontSize: "84px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Record your screen.</span>
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #FF009D, #5501FE)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Share in seconds.
          </span>
        </div>
        <div
          style={{
            marginTop: "36px",
            fontSize: "30px",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          Free browser screen recorder · webcam bubble · instant share links
        </div>
      </div>
    ),
    { ...size }
  );
}
