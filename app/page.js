"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "investment_os_final_complete_v1"

const INITIAL_STOCKS = [
  {
    code: "5803",
    name: "フジクラ",
    sector: "AI通信インフラ",
    theme: "光ファイバー・AIデータセンター",
    target: 400000,
    plans: [150000, 130000, 120000],
    price: 6520,
    prevClose: 6680,
    volume: 4300000,
    volumeRate: 1.6,
    per: 22.5,
    pbr: 3.2,
    ma25: 6200,
    dividend: 1.8,
    memo: "AI通信需要の中心候補",
  },
  {
    code: "5805",
    name: "SWCC",
    sector: "電力インフラ",
    theme: "電線・送電・データセンター",
    target: 240000,
    plans: [90000, 70000, 80000],
    price: 8240,
    prevClose: 8350,
    volume: 680000,
    volumeRate: 1.3,
    per: 18.2,
    pbr: 1.9,
    ma25: 7900,
    dividend: 2.5,
    memo: "AI電力需要テーマ",
  },
  {
    code: "6857",
    name: "アドバンテスト",
    sector: "AI半導体",
    theme: "半導体検査装置",
    target: 160000,
    plans: [60000, 50000, 50000],
    price: 9810,
    prevClose: 9450,
    volume: 9200000,
    volumeRate: 1.8,
    per: 35.6,
    pbr: 8.1,
    ma25: 9300,
    dividend: 1.2,
    memo: "AI半導体主力",
  },
]

const INITIAL_HOLDINGS = {
  "5803": {
    shares: "",
    buyPrice: "",
    amount: "",
    memo: "",
  },
  "5805": {
    shares: "",
    buyPrice: "",
    amount: "",
    memo: "",
  },
  "6857": {
    shares: "",
    buyPrice: "",
    amount: "",
    memo: "",
  },
}

function yen(v) {
  return Number(v || 0).toLocaleString("ja-JP") + "円"
}

function pct(v) {
  return Number(v || 0).toFixed(1) + "%"
}

function num(v) {
  return Number(v || 0)
}

function calcChange(price, prevClose) {
  if (!price || !prevClose) return 0
  return ((price - prevClose) / prevClose) * 100
}

function calcDeviation(price, ma25) {
  if (!price || !ma25) return 0
  return ((price - ma25) / ma25) * 100
}

function calcProfit(stock, holding) {
  const shares = num(holding.shares)
  const buy = num(holding.buyPrice)
  const now = num(stock.price)

  if (!shares || !buy) {
    return {
      cost: 0,
      value: 0,
      profit: 0,
      rate: 0,
      has: false,
    }
  }

  const cost = shares * buy
  const value = shares * now
  const profit = value - cost
  const rate = cost ? (profit / cost) * 100 : 0

  return {
    cost,
    value,
    profit,
    rate,
    has: true,
  }
}

function judge(stock, holding) {
  const change = calcChange(stock.price, stock.prevClose)
  const dev = calcDeviation(stock.price, stock.ma25)
  const profit = calcProfit(stock, holding)

  let score = 50
  let level = "neutral"
  let label = "様子見"
  let reason = "強いシグナルなし"

  if (change <= -3 && change >= -7 && stock.volumeRate >= 1) {
    score += 25
    level = "buy"
    label = "押し目候補"
    reason = "出来高を伴った押し目"
  }

  if (change >= 5 || dev >= 15) {
    score -= 20
    level = "wait"
    label = "待ち"
    reason = "上がりすぎ注意"
  }

  if (change >= 10 || dev >= 20) {
    score -= 35
    level = "danger"
    label = "危険"
    reason = "高値づかみ警戒"
  }

  if (profit.has && profit.rate >= 15) {
    score += 10
    level = "profit"
    label = "利確候補"
    reason = "利益が十分出ている"
  }

  if (profit.has && profit.rate <= -10) {
    score -= 30
    level = "danger"
    label = "損切り検討"
    reason = "損失拡大"
  }

  score = Math.max(0, Math.min(100, score))

  return {
    score,
    level,
    label,
    reason,
  }
}

function levelColor(level) {
  if (level === "buy") return "#00F5D4"
  if (level === "profit") return "#7CFF6B"
  if (level === "wait") return "#60A5FA"
  if (level === "danger") return "#FF4D6D"
  return "#94A3B8"
}

function levelBg(level) {
  if (level === "buy") return "rgba(0,245,212,.16)"
  if (level === "profit") return "rgba(124,255,107,.16)"
  if (level === "wait") return "rgba(96,165,250,.16)"
  if (level === "danger") return "rgba(255,77,109,.18)"
  return "rgba(148,163,184,.12)"
}

export default function Page() {
  const [stocks, setStocks] = useState(INITIAL_STOCKS)
  const [holdings, setHoldings] = useState(INITIAL_HOLDINGS)
  const [tab, setTab] = useState("home")
  const [lastUpdate, setLastUpdate] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.stocks) setStocks(parsed.stocks)
        if (parsed.holdings) setHoldings(parsed.holdings)
        if (parsed.lastUpdate) setLastUpdate(parsed.lastUpdate)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stocks,
        holdings,
        lastUpdate,
      })
    )
  }, [stocks, holdings, lastUpdate])

  function refreshPrices() {
    setStocks((prev) =>
      prev.map((s) => {
        const move = (Math.random() - 0.5) * 2
        const next = Math.max(1, Math.round(s.price * (1 + move / 100)))

        return {
          ...s,
          prevClose: s.price,
          price: next,
          volumeRate: Number(
            Math.max(
              0.5,
              s.volumeRate + (Math.random() - 0.5) * 0.2
            ).toFixed(1)
          ),
        }
      })
    )

    setLastUpdate(new Date().toLocaleString("ja-JP"))
  }

  useEffect(() => {
    refreshPrices()

    const timer = setInterval(() => {
      refreshPrices()
    }, 60 * 60 * 1000)

    return () => clearInterval(timer)
  }, [])

  const summary = useMemo(() => {
    let totalCost = 0
    let totalValue = 0
    let totalProfit = 0
    let totalScore = 0

    stocks.forEach((s) => {
      const p = calcProfit(s, holdings[s.code])
      const j = judge(s, holdings[s.code])

      totalCost += p.cost
      totalValue += p.value
      totalProfit += p.profit
      totalScore += j.score
    })

    const score = Math.round(totalScore / stocks.length)
    const rate = totalCost
      ? (totalProfit / totalCost) * 100
      : 0

    return {
      totalCost,
      totalValue,
      totalProfit,
      rate,
      score,
    }
  }, [stocks, holdings])

  function updateHolding(code, key, value) {
    setHoldings((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        [key]: value,
      },
    }))
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="miniTitle">INVESTMENT OS</p>
          <h1>AIインフラ株 判断くん</h1>
          <p className="desc">
            感情ではなく、ルールで判断する。
          </p>
        </div>

        <button onClick={refreshPrices}>
          更新
        </button>
      </section>

      <nav className="nav">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          HOME
        </button>

        <button
          className={tab === "stocks" ? "active" : ""}
          onClick={() => setTab("stocks")}
        >
          STOCK
        </button>

        <button
          className={tab === "edit" ? "active" : ""}
          onClick={() => setTab("edit")}
        >
          EDIT
        </button>
      </nav>

      {tab === "home" && (
        <section className="grid">
          <div className="mainCard full">
            <p className="label">総合AIスコア</p>

            <div className="score">
              {summary.score}
            </div>

            <div className="bar">
              <div
                className="fill"
                style={{
                  width: summary.score + "%",
                }}
              />
            </div>

            <p className="small">
              70以上 → 買い候補
            </p>
          </div>

          <Card
            title="投資額"
            value={yen(summary.totalCost)}
          />

          <Card
            title="評価額"
            value={yen(summary.totalValue)}
          />

          <Card
            title="損益"
            value={yen(summary.totalProfit)}
            color={
              summary.totalProfit >= 0
                ? "#00F5D4"
                : "#FF4D6D"
            }
            sub={pct(summary.rate)}
          />

          <Card
            title="更新"
            value={lastUpdate || "-"}
          />
        </section>
      )}

      {tab === "stocks" && (
        <section className="list">
          {stocks.map((stock) => {
            const holding = holdings[stock.code]
            const j = judge(stock, holding)
            const p = calcProfit(stock, holding)
            const change = calcChange(
              stock.price,
              stock.prevClose
            )

            return (
              <article
                className="stock"
                key={stock.code}
              >
                <div className="top">
                  <div>
                    <p className="code">
                      {stock.code}
                    </p>

                    <h2>{stock.name}</h2>

                    <p className="theme">
                      {stock.theme}
                    </p>
                  </div>

                  <div
                    className="judge"
                    style={{
                      color: levelColor(j.level),
                      background: levelBg(j.level),
                    }}
                  >
                    {j.label}
                  </div>
                </div>

                <div className="scoreArea">
                  <span>AI SCORE</span>

                  <b
                    style={{
                      color: levelColor(j.level),
                    }}
                  >
                    {j.score}
                  </b>
                </div>

                <div className="metrics">
                  <Mini
                    title="現在値"
                    value={yen(stock.price)}
                  />

                  <Mini
                    title="前日比"
                    value={pct(change)}
                    color={
                      change >= 0
                        ? "#00F5D4"
                        : "#FF4D6D"
                    }
                  />

                  <Mini
                    title="PER"
                    value={stock.per + "倍"}
                  />

                  <Mini
                    title="PBR"
                    value={stock.pbr + "倍"}
                  />

                  <Mini
                    title="出来高倍率"
                    value={
                      stock.volumeRate + "倍"
                    }
                  />

                  <Mini
                    title="配当"
                    value={
                      stock.dividend + "%"
                    }
                  />
                </div>

                <div className="message">
                  <b>判断理由</b>

                  <p>{j.reason}</p>

                  <b>テーマ</b>

                  <p>{stock.memo}</p>
                </div>

                <div className="metrics">
                  <Mini
                    title="購入額"
                    value={
                      holding.amount
                        ? yen(holding.amount)
                        : "-"
                    }
                  />

                  <Mini
                    title="取得単価"
                    value={
                      holding.buyPrice
                        ? yen(
                            holding.buyPrice
                          )
                        : "-"
                    }
                  />

                  <Mini
                    title="株数"
                    value={
                      holding.shares || "-"
                    }
                  />

                  <Mini
                    title="評価損益"
                    value={yen(p.profit)}
                    color={
                      p.profit >= 0
                        ? "#00F5D4"
                        : "#FF4D6D"
                    }
                  />
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "edit" && (
        <section className="list">
          {stocks.map((stock) => {
            const holding =
              holdings[stock.code]

            return (
              <div
                className="mainCard full"
                key={stock.code}
              >
                <h2>{stock.name}</h2>

                <label>
                  購入額
                  <input
                    inputMode="numeric"
                    value={holding.amount}
                    onChange={(e) =>
                      updateHolding(
                        stock.code,
                        "amount",
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  株数
                  <input
                    inputMode="numeric"
                    value={holding.shares}
                    onChange={(e) =>
                      updateHolding(
                        stock.code,
                        "shares",
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  取得単価
                  <input
                    inputMode="numeric"
                    value={holding.buyPrice}
                    onChange={(e) =>
                      updateHolding(
                        stock.code,
                        "buyPrice",
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  メモ
                  <textarea
                    value={holding.memo}
                    onChange={(e) =>
                      updateHolding(
                        stock.code,
                        "memo",
                        e.target.value
                      )
                    }
                  />
                </label>
              </div>
            )
          })}
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .app {
          min-height: 100vh;
          padding: 16px;
          background:
            radial-gradient(
              circle at top,
              rgba(0, 180, 255, 0.22),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #020713,
              #07111f 55%,
              #020713
            );

          color: white;
          font-family: Arial,
            sans-serif;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid
            rgba(0, 220, 255, 0.3);
          background: rgba(
            5,
            16,
            32,
            0.85
          );
        }

        .hero button {
          border: 1px solid
            rgba(0, 220, 255, 0.4);

          border-radius: 999px;

          padding: 0 14px;

          background: rgba(
            0,
            120,
            200,
            0.25
          );

          color: white;

          font-weight: bold;
        }

        .miniTitle {
          margin: 0 0 6px;

          color: #64dfff;

          font-size: 12px;

          letter-spacing: 1px;
        }

        h1 {
          margin: 0;
          font-size: 26px;
        }

        .desc {
          margin-top: 8px;
          color: #b7cad8;
          font-size: 13px;
        }

        .nav {
          display: grid;
          grid-template-columns: repeat(
            3,
            1fr
          );

          gap: 8px;

          margin: 14px 0;
        }

        .nav button {
          border: 1px solid
            rgba(120, 190, 220, 0.2);

          border-radius: 999px;

          padding: 11px;

          background: rgba(
            255,
            255,
            255,
            0.05
          );

          color: #a9bfca;

          font-weight: bold;
        }

        .nav .active {
          background: #60ddff;
          color: #00131c;
        }

        .grid,
        .list {
          display: grid;
          gap: 12px;
        }

        .mainCard,
        .stock {
          border-radius: 20px;

          border: 1px solid
            rgba(0, 220, 255, 0.2);

          padding: 16px;

          background: rgba(
            7,
            18,
            34,
            0.86
          );
        }

        .full {
          grid-column: 1 / -1;
        }

        .label {
          margin: 0 0 8px;
          color: #8aa6b5;
          font-size: 12px;
        }

        .score {
          font-size: 42px;
          font-weight: bold;
          color: #00f5d4;
        }

        .bar {
          height: 8px;

          margin-top: 10px;

          border-radius: 999px;

          overflow: hidden;

          background: rgba(
            255,
            255,
            255,
            0.08
          );
        }

        .fill {
          height: 100%;
          background: #00f5d4;
        }

        .small {
          margin-top: 10px;
          color: #8aa6b5;
          font-size: 12px;
        }

        .top {
          display: grid;

          grid-template-columns:
            1fr 120px;

          gap: 12px;
        }

        .code {
          margin: 0;

          color: #64dfff;

          font-size: 12px;

          font-weight: bold;
        }

        .theme {
          color: #a9bfca;
          font-size: 12px;
        }

        .judge {
          padding: 12px;

          border-radius: 14px;

          text-align: center;

          font-size: 18px;

          font-weight: bold;
        }

        .scoreArea {
          display: flex;

          justify-content: space-between;

          align-items: center;

          margin-top: 14px;

          padding: 12px;

          border-radius: 14px;

          background: rgba(
            255,
            255,
            255,
            0.05
          );
        }

        .scoreArea span {
          color: #8aa6b5;
          font-size: 12px;
        }

        .scoreArea b {
          font-size: 28px;
        }

        .metrics {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 8px;

          margin-top: 14px;
        }

        .mini {
          padding: 12px;

          border-radius: 14px;

          background: rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .mini span {
          display: block;

          margin-bottom: 6px;

          color: #87a2b2;

          font-size: 11px;
        }

        .mini b {
          font-size: 16px;
        }

        .message {
          margin-top: 14px;

          padding: 14px;

          border-radius: 16px;

          background: rgba(
            0,
            0,
            0,
            0.2
          );
        }

        .message p {
          color: #d5e6ee;
          font-size: 13px;
          line-height: 1.6;
        }

        label {
          display: grid;

          gap: 6px;

          margin-top: 12px;

          color: #aac1cc;

          font-size: 13px;
        }

        input,
        textarea {
          width: 100%;

          border: 1px solid
            rgba(0, 220, 255, 0.25);

          border-radius: 14px;

          padding: 12px;

          background: rgba(
            0,
            0,
            0,
            0.25
          );

          color: white;

          font-size: 16px;
        }

        textarea {
          min-height: 70px;
        }

        @media (min-width: 620px) {
          .app {
            max-width: 560px;
            margin: 0 auto;
          }

          .grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  )
}

function Card({
  title,
  value,
  sub,
  color,
}) {
  return (
    <div className="mainCard">
      <p className="label">{title}</p>

      <h3 style={{ color }}>
        {value}
      </h3>

      {sub ? (
        <small style={{ color }}>
          {sub}
        </small>
      ) : null}
    </div>
  )
}

function Mini({
  title,
  value,
  color,
}) {
  return (
    <div className="mini">
      <span>{title}</span>

      <b style={{ color }}>
        {value}
      </b>
    </div>
  )
}