"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "ai-infra-stock-kun-v1"

const STOCKS = [
  {
    code: "5803",
    name: "フジクラ",
    theme: "AI通信インフラ・光ファイバー",
    target: 400000,
    buyPlan: [150000, 130000, 120000],
    price: 6500,
    change: -2.4,
    volume: 4300000,
    volumeRate: 1.6,
    per: 22.5,
    ma25: 6200,
  },
  {
    code: "5805",
    name: "SWCC",
    theme: "電線・電力インフラ",
    target: 240000,
    buyPlan: [90000, 70000, 80000],
    price: 8200,
    change: -1.2,
    volume: 680000,
    volumeRate: 1.3,
    per: 18.2,
    ma25: 7900,
  },
  {
    code: "6857",
    name: "アドバンテスト",
    theme: "AI半導体・検査装置",
    target: 160000,
    buyPlan: [60000, 50000, 50000],
    price: 9800,
    change: 3.8,
    volume: 9200000,
    volumeRate: 1.8,
    per: 35.6,
    ma25: 9300,
  },
]

const EMPTY_HOLDINGS = {
  "5803": { amount: "", shares: "", price: "", date: "", memo: "" },
  "5805": { amount: "", shares: "", price: "", date: "", memo: "" },
  "6857": { amount: "", shares: "", price: "", date: "", memo: "" },
}

function yen(v) {
  return Number(v || 0).toLocaleString("ja-JP") + "円"
}

function pct(v) {
  return Number(v || 0).toFixed(1) + "%"
}

function deviation(price, ma25) {
  if (!price || !ma25) return 0
  return ((price - ma25) / ma25) * 100
}

function profitNow(stock, holding) {
  const shares = Number(holding.shares || 0)
  const buyPrice = Number(holding.price || 0)
  const now = Number(stock.price || 0)

  if (!shares || !buyPrice) {
    return { value: 0, profit: 0, rate: 0, has: false }
  }

  const cost = shares * buyPrice
  const value = shares * now
  const profit = value - cost
  const rate = cost ? (profit / cost) * 100 : 0

  return { value, profit, rate, has: true }
}

function judge(stock, holding) {
  const dev = deviation(stock.price, stock.ma25)
  const p = profitNow(stock, holding)

  if (p.has) {
    if (p.rate >= 35) {
      return {
        label: "大きく利確",
        color: "#ff4d6d",
        bg: "rgba(255,77,109,.18)",
        text: "利益がかなり大きいです。欲張らず、守る判断が大切です。",
        action: "多めに売って利益を確保する候補。",
      }
    }

    if (p.rate >= 25) {
      return {
        label: "半分利確",
        color: "#ffb703",
        bg: "rgba(255,183,3,.18)",
        text: "十分な利益です。半分売ると心が安定します。",
        action: "半分売って、残りで上昇を狙う。",
      }
    }

    if (p.rate >= 15) {
      return {
        label: "一部利確",
        color: "#00f5d4",
        bg: "rgba(0,245,212,.16)",
        text: "利益が出ています。少し売って利益を残す場面です。",
        action: "一部だけ利確する候補。",
      }
    }

    if (p.rate <= -10) {
      return {
        label: "損切り検討",
        color: "#ff4d6d",
        bg: "rgba(255,77,109,.18)",
        text: "損が大きくなっています。放置せず理由を確認します。",
        action: "買い増しより、まず損切りを考える。",
      }
    }

    if (p.rate <= -8) {
      return {
        label: "警戒",
        color: "#ffb703",
        bg: "rgba(255,183,3,.18)",
        text: "損が広がっています。焦って買い増ししない場面です。",
        action: "様子見。理由のないナンピンは禁止。",
      }
    }
  }

  if (stock.change >= 10 || dev >= 20) {
    return {
      label: "危険",
      color: "#ff4d6d",
      bg: "rgba(255,77,109,.18)",
      text: "上がりすぎの可能性があります。高値づかみに注意です。",
      action: "今日は買わない。落ち着くまで待つ。",
    }
  }

  if (stock.change >= 5 || dev >= 15) {
    return {
      label: "待ち",
      color: "#60a5fa",
      bg: "rgba(96,165,250,.15)",
      text: "短期で上がりすぎています。今買うと高値になりやすいです。",
      action: "押し目を待つ。",
    }
  }

  if (stock.change <= -3 && stock.change >= -7 && stock.volumeRate >= 1) {
    return {
      label: "押し目候補",
      color: "#00f5d4",
      bg: "rgba(0,245,212,.16)",
      text: "下げていますが、出来高があります。テーマが残るなら候補です。",
      action: "買うなら予定金額の一部だけ。",
    }
  }

  if (
    stock.change >= -5 &&
    stock.change <= 3 &&
    stock.volumeRate >= 1.5 &&
    dev <= 10
  ) {
    return {
      label: "買い候補",
      color: "#00f5d4",
      bg: "rgba(0,245,212,.16)",
      text: "上がりすぎではなく、出来高もあります。条件は悪くありません。",
      action: "第1回から少額で入る候補。",
    }
  }

  return {
    label: "様子見",
    color: "#94a3b8",
    bg: "rgba(148,163,184,.14)",
    text: "強い買い理由も、強い危険サインもまだ弱いです。",
    action: "無理に動かない。",
  }
}

export default function Page() {
  const [holdings, setHoldings] = useState(EMPTY_HOLDINGS)
  const [stocks, setStocks] = useState(STOCKS)
  const [tab, setTab] = useState("home")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.holdings) setHoldings(parsed.holdings)
        if (parsed.stocks) setStocks(parsed.stocks)
        if (parsed.lastUpdate) setLastUpdate(parsed.lastUpdate)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ holdings, stocks, lastUpdate })
    )
  }, [holdings, stocks, lastUpdate])

  function refresh() {
    setLoading(true)

    setTimeout(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const move = (Math.random() - 0.5) * 2
          const price = Math.max(1, Math.round(s.price * (1 + move / 100)))
          return {
            ...s,
            price,
            change: Number((s.change + move).toFixed(1)),
            volumeRate: Number(
              Math.max(0.5, s.volumeRate + (Math.random() - 0.5) * 0.3).toFixed(
                1
              )
            ),
          }
        })
      )
      setLastUpdate(new Date().toLocaleString("ja-JP"))
      setLoading(false)
    }, 500)
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const summary = useMemo(() => {
    let invested = 0
    let value = 0
    let profit = 0

    stocks.forEach((stock) => {
      const h = holdings[stock.code]
      const p = profitNow(stock, h)
      invested += Number(h.price || 0) * Number(h.shares || 0)
      value += p.value
      profit += p.profit
    })

    const remain = Math.max(0, 800000 - invested)
    const rate = invested ? (profit / invested) * 100 : 0

    const danger = stocks.some((s) => judge(s, holdings[s.code]).label === "危険")
    const buy = stocks.some((s) => judge(s, holdings[s.code]).label.includes("買"))

    let label = "様子見"
    let color = "#60a5fa"
    let text = "今日は無理に動かず、条件がそろう銘柄だけ見ます。"

    if (danger) {
      label = "防御優先"
      color = "#ff4d6d"
      text = "危険サインがあります。買いより守りです。"
    } else if (buy) {
      label = "一部買い候補"
      color = "#00f5d4"
      text = "買い候補があります。ただし一気に買わない。"
    }

    return { invested, value, profit, rate, remain, label, color, text }
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
          <p className="sub">AI Infrastructure Stock OS</p>
          <h1>AIインフラ株 判断くん</h1>
          <p className="lead">
            短期売買で感情に流されないための判断アプリ。
          </p>
        </div>
        <button onClick={refresh}>{loading ? "更新中" : "更新"}</button>
      </section>

      <nav className="nav">
        <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")}>
          HOME
        </button>
        <button className={tab === "stock" ? "on" : ""} onClick={() => setTab("stock")}>
          STOCK
        </button>
        <button className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>
          EDIT
        </button>
      </nav>

      {tab === "home" && (
        <section className="grid">
          <div className="judgeBox" style={{ borderColor: summary.color }}>
            <p>今日の総合判断</p>
            <h2 style={{ color: summary.color }}>{summary.label}</h2>
            <span>{summary.text}</span>
          </div>

          <Card title="総資金" value={yen(1000000)} />
          <Card title="投資予定" value={yen(800000)} />
          <Card title="現金キープ" value={yen(200000)} />
          <Card title="現在投資額" value={yen(summary.invested)} />
          <Card title="残り投資可能額" value={yen(summary.remain)} />
          <Card title="評価額" value={yen(summary.value)} />
          <Card
            title="損益"
            value={yen(summary.profit)}
            color={summary.profit >= 0 ? "#00f5d4" : "#ff4d6d"}
            sub={pct(summary.rate)}
          />

          <div className="card full">
            <p className="label">購入計画</p>
            <div className="plans">
              <div>
                <b>第1回</b>
                <span>30万円</span>
              </div>
              <div>
                <b>第2回</b>
                <span>25万円</span>
              </div>
              <div>
                <b>第3回</b>
                <span>25万円</span>
              </div>
            </div>
          </div>

          <p className="update">最終更新: {lastUpdate || "未更新"}</p>
        </section>
      )}

      {tab === "stock" && (
        <section className="list">
          {stocks.map((stock) => {
            const h = holdings[stock.code]
            const j = judge(stock, h)
            const p = profitNow(stock, h)
            const dev = deviation(stock.price, stock.ma25)

            return (
              <article className="stock" key={stock.code}>
                <div className="top">
                  <div>
                    <p className="code">{stock.code}</p>
                    <h2>{stock.name}</h2>
                    <p className="theme">{stock.theme}</p>
                  </div>
                  <div className="badge" style={{ color: j.color, background: j.bg }}>
                    {j.label}
                  </div>
                </div>

                <div className="metrics">
                  <Mini title="現在値" value={yen(stock.price)} />
                  <Mini
                    title="前日比"
                    value={pct(stock.change)}
                    color={stock.change >= 0 ? "#00f5d4" : "#ff4d6d"}
                  />
                  <Mini title="出来高" value={stock.volume.toLocaleString("ja-JP")} />
                  <Mini title="出来高倍率" value={stock.volumeRate + "倍"} />
                  <Mini title="PER" value={stock.per + "倍"} />
                  <Mini
                    title="25日線乖離"
                    value={pct(dev)}
                    color={dev >= 0 ? "#00f5d4" : "#ff4d6d"}
                  />
                </div>

                <div className="message">
                  <b>理由</b>
                  <p>{j.text}</p>
                  <b>次の行動</b>
                  <p>{j.action}</p>
                </div>

                <div className="metrics">
                  <Mini title="評価額" value={yen(p.value)} />
                  <Mini
                    title="損益額"
                    value={yen(p.profit)}
                    color={p.profit >= 0 ? "#00f5d4" : "#ff4d6d"}
                  />
                  <Mini
                    title="損益率"
                    value={pct(p.rate)}
                    color={p.rate >= 0 ? "#00f5d4" : "#ff4d6d"}
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
            const h = holdings[stock.code]

            return (
              <div className="card full" key={stock.code}>
                <h2>{stock.name}</h2>

                <label>
                  購入金額
                  <input
                    inputMode="numeric"
                    value={h.amount}
                    onChange={(e) => updateHolding(stock.code, "amount", e.target.value)}
                  />
                </label>

                <label>
                  株数
                  <input
                    inputMode="numeric"
                    value={h.shares}
                    onChange={(e) => updateHolding(stock.code, "shares", e.target.value)}
                  />
                </label>

                <label>
                  取得単価
                  <input
                    inputMode="decimal"
                    value={h.price}
                    onChange={(e) => updateHolding(stock.code, "price", e.target.value)}
                  />
                </label>

                <label>
                  購入日
                  <input
                    type="date"
                    value={h.date}
                    onChange={(e) => updateHolding(stock.code, "date", e.target.value)}
                  />
                </label>

                <label>
                  メモ
                  <textarea
                    maxLength={80}
                    value={h.memo}
                    onChange={(e) => updateHolding(stock.code, "memo", e.target.value)}
                  />
                </label>
              </div>
            )
          })}
        </section>
      )}

      <style jsx>{`
        .app {
          min-height: 100vh;
          padding: 16px 14px 90px;
          color: white;
          background:
            radial-gradient(circle at top, rgba(0, 180, 255, .25), transparent 32%),
            linear-gradient(180deg, #020713, #07111f 55%, #020713);
          font-family: Arial, sans-serif;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 18px;
          border: 1px solid rgba(0, 220, 255, .35);
          border-radius: 22px;
          background: rgba(5, 16, 32, .85);
          box-shadow: 0 0 24px rgba(0, 170, 255, .18);
        }

        .sub {
          margin: 0 0 6px;
          color: #64dfff;
          font-size: 12px;
          letter-spacing: 1px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
        }

        .lead {
          margin: 10px 0 0;
          color: #b7cad8;
          font-size: 13px;
          line-height: 1.6;
        }

        .hero button {
          height: 42px;
          border: 1px solid rgba(0, 220, 255, .6);
          border-radius: 999px;
          padding: 0 14px;
          color: white;
          background: rgba(0, 120, 200, .25);
          font-weight: bold;
        }

        .nav {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 14px 0;
        }

        .nav button {
          border: 1px solid rgba(120, 190, 220, .25);
          border-radius: 999px;
          padding: 11px 8px;
          color: #a9bfca;
          background: rgba(255, 255, 255, .05);
          font-weight: 800;
        }

        .nav .on {
          color: #00131c;
          background: #60ddff;
          box-shadow: 0 0 18px rgba(0, 220, 255, .45);
        }

        .grid,
        .list {
          display: grid;
          gap: 12px;
        }

        .card,
        .stock,
        .judgeBox {
          padding: 16px;
          border: 1px solid rgba(0, 220, 255, .25);
          border-radius: 20px;
          background: rgba(7, 18, 34, .85);
        }

        .judgeBox {
          border-width: 2px;
        }

        .judgeBox p,
        .label {
          margin: 0 0 8px;
          color: #8aa6b5;
          font-size: 12px;
        }

        .judgeBox h2 {
          margin: 0;
          font-size: 32px;
        }

        .judgeBox span {
          display: block;
          margin-top: 8px;
          color: #d7e9f0;
          font-size: 13px;
          line-height: 1.6;
        }

        .card h3 {
          margin: 0;
          font-size: 22px;
        }

        .card small {
          display: block;
          margin-top: 6px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .plans {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .plans div {
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, .06);
        }

        .plans span {
          display: block;
          margin-top: 6px;
          color: #8fdfff;
          font-weight: bold;
        }

        .update {
          text-align: center;
          color: #7894a5;
          font-size: 12px;
        }

        .top {
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 12px;
          align-items: start;
        }

        .code {
          margin: 0;
          color: #64dfff;
          font-size: 12px;
          font-weight: 800;
        }

        .theme {
          color: #a9bfca;
          font-size: 12px;
          line-height: 1.5;
        }

        .badge {
          padding: 12px;
          border-radius: 16px;
          text-align: center;
          font-size: 18px;
          font-weight: 900;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .mini {
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, .06);
        }

        .mini span {
          display: block;
          margin-bottom: 6px;
          color: #87a2b2;
          font-size: 11px;
        }

        .mini b {
          font-size: 16px;
          word-break: break-all;
        }

        .message {
          margin-top: 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(0, 0, 0, .2);
        }

        .message p {
          color: #d5e6ee;
          font-size: 13px;
          line-height: 1.7;
        }

        label {
          display: grid;
          gap: 6px;
          margin-top: 12px;
          color: #aac1cc;
          font-size: 13px;
          font-weight: 700;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid rgba(0, 220, 255, .25);
          border-radius: 14px;
          padding: 12px;
          color: white;
          background: rgba(0, 0, 0, .25);
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
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  )
}

function Card({ title, value, sub, color }) {
  return (
    <div className="card">
      <p className="label">{title}</p>
      <h3 style={{ color }}>{value}</h3>
      {sub ? <small style={{ color }}>{sub}</small> : null}
    </div>
  )
}

function Mini({ title, value, color }) {
  return (
    <div className="mini">
      <span>{title}</span>
      <b style={{ color }}>{value}</b>
    </div>
  )
}