"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "ai_infra_stock_os_final_v2"

const BASE_STOCKS = [
  {
    code: "5803",
    symbol: "5803.T",
    name: "フジクラ",
    theme: "AI通信インフラ・光ファイバー",
    target: 400000,
    plans: [150000, 130000, 120000],
    price: 6500,
    prevClose: 6680,
    volume: 4300000,
    volumeRate: 1.6,
    per: 22.5,
    ma25: 6200,
  },
  {
    code: "5805",
    symbol: "5805.T",
    name: "SWCC",
    theme: "電線・電力インフラ",
    target: 240000,
    plans: [90000, 70000, 80000],
    price: 8200,
    prevClose: 8350,
    volume: 680000,
    volumeRate: 1.3,
    per: 18.2,
    ma25: 7900,
  },
  {
    code: "6857",
    symbol: "6857.T",
    name: "アドバンテスト",
    theme: "AI半導体・検査装置",
    target: 160000,
    plans: [60000, 50000, 50000],
    price: 9800,
    prevClose: 9450,
    volume: 9200000,
    volumeRate: 1.8,
    per: 35.6,
    ma25: 9300,
  },
]

const DEFAULT_HOLDINGS = {
  "5803": { shares: "", buyPrice: "", amount: "", memo: "" },
  "5805": { shares: "", buyPrice: "", amount: "", memo: "" },
  "6857": { shares: "", buyPrice: "", amount: "", memo: "" },
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

function changeRate(price, prevClose) {
  if (!price || !prevClose) return 0
  return ((price - prevClose) / prevClose) * 100
}

function deviation(price, ma25) {
  if (!price || !ma25) return 0
  return ((price - ma25) / ma25) * 100
}

function profit(stock, holding) {
  const shares = num(holding.shares)
  const buy = num(holding.buyPrice)
  const now = num(stock.price)

  if (!shares || !buy) {
    return { cost: 0, value: 0, profit: 0, rate: 0, has: false }
  }

  const cost = shares * buy
  const value = shares * now
  const p = value - cost
  const rate = cost ? (p / cost) * 100 : 0

  return { cost, value, profit: p, rate, has: true }
}

function judge(stock, holding, marketMode) {
  const chg = changeRate(stock.price, stock.prevClose)
  const dev = deviation(stock.price, stock.ma25)
  const p = profit(stock, holding)

  if (marketMode.level === "crash") {
    return {
      label: "防御",
      level: "danger",
      score: 20,
      reason: "市場全体が荒れています。個別株より資金管理が優先です。",
      action: "買い急がない。現金20万円は必ず残す。",
    }
  }

  if (p.has && p.rate >= 35) {
    return {
      label: "大きく利確",
      level: "danger",
      score: 90,
      reason: "利益がかなり大きいです。短期売買では勝ちを守る場面です。",
      action: "多めに売って利益を確保。",
    }
  }

  if (p.has && p.rate >= 25) {
    return {
      label: "半分利確",
      level: "profit",
      score: 82,
      reason: "十分な利益です。半分売ると心が安定します。",
      action: "半分利確。残りで上昇を狙う。",
    }
  }

  if (p.has && p.rate >= 15) {
    return {
      label: "一部利確",
      level: "profit",
      score: 74,
      reason: "利益が出ています。少し売って利益を残す候補です。",
      action: "一部だけ利確。",
    }
  }

  if (p.has && p.rate <= -10) {
    return {
      label: "損切り検討",
      level: "danger",
      score: 18,
      reason: "損が大きくなっています。感情で持ち続けない場面です。",
      action: "買った理由が崩れたなら損切り。",
    }
  }

  if (chg >= 10 || dev >= 20) {
    return {
      label: "危険",
      level: "danger",
      score: 25,
      reason: "上がりすぎです。高値づかみに注意です。",
      action: "今日は買わない。",
    }
  }

  if (chg >= 5 || dev >= 15) {
    return {
      label: "待ち",
      level: "wait",
      score: 45,
      reason: "短期で上がっています。今買うと高値になりやすいです。",
      action: "押し目を待つ。",
    }
  }

  if (chg <= -3 && chg >= -7 && stock.volumeRate >= 1) {
    return {
      label: "押し目候補",
      level: "buy",
      score: 76,
      reason: "下げていますが、出来高がありテーマも残っています。",
      action: "買うなら予定額の一部だけ。",
    }
  }

  if (chg >= -5 && chg <= 3 && stock.volumeRate >= 1.5 && dev <= 10) {
    return {
      label: "買い候補",
      level: "buy",
      score: 82,
      reason: "上がりすぎではなく、出来高もあります。",
      action: "第1回分の一部から入る候補。",
    }
  }

  return {
    label: "様子見",
    level: "neutral",
    score: 55,
    reason: "強い買い理由も危険サインも弱いです。",
    action: "無理に動かない。",
  }
}

function color(level) {
  if (level === "buy") return "#00f5d4"
  if (level === "profit") return "#7cff6b"
  if (level === "wait") return "#60a5fa"
  if (level === "danger") return "#ff4d6d"
  if (level === "bubble") return "#ffb703"
  return "#94a3b8"
}

function bg(level) {
  if (level === "buy") return "rgba(0,245,212,.16)"
  if (level === "profit") return "rgba(124,255,107,.14)"
  if (level === "wait") return "rgba(96,165,250,.14)"
  if (level === "danger") return "rgba(255,77,109,.18)"
  if (level === "bubble") return "rgba(255,183,3,.16)"
  return "rgba(148,163,184,.12)"
}

export default function Page() {
  const [stocks, setStocks] = useState(BASE_STOCKS)
  const [holdings, setHoldings] = useState(DEFAULT_HOLDINGS)
  const [market, setMarket] = useState({
    nikkei: 0,
    vix: 0,
    usdJpy: 0,
    level: "normal",
    label: "通常",
    reason: "市場は通常モードです。",
  })
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState("home")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (parsed.holdings) setHoldings(parsed.holdings)
      if (parsed.logs) setLogs(parsed.logs)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ holdings, logs }))
  }, [holdings, logs])

  async function fetchMarket() {
    setLoading(true)
    try {
      const res = await fetch("/api/stocks", { cache: "no-store" })
      const json = await res.json()

      if (!json.ok) throw new Error("api failed")

      const data = json.data || []

      setStocks((prev) =>
        prev.map((stock) => {
          const found = data.find((d) => d.symbol === stock.symbol)
          if (!found) return stock

          return {
            ...stock,
            price: Math.round(found.regularMarketPrice || stock.price),
            prevClose: Math.round(found.regularMarketPreviousClose || stock.prevClose),
            volume: found.regularMarketVolume || stock.volume,
            per: found.trailingPE ? Number(found.trailingPE.toFixed(1)) : stock.per,
          }
        })
      )

      const nikkei = data.find((d) => d.symbol === "^N225")
      const vix = data.find((d) => d.symbol === "^VIX")
      const usd = data.find((d) => d.symbol === "JPY=X")

      const vixValue = num(vix?.regularMarketPrice)
      const nikkeiChange = changeRate(
        nikkei?.regularMarketPrice,
        nikkei?.regularMarketPreviousClose
      )

      let level = "normal"
      let label = "通常"
      let reason = "市場は通常モードです。"

      if (vixValue >= 30 || nikkeiChange <= -3) {
        level = "crash"
        label = "暴落警戒"
        reason = "VIX上昇または日経急落。防御優先です。"
      } else if (vixValue >= 22 || nikkeiChange <= -1.5) {
        level = "warning"
        label = "警戒"
        reason = "市場が少し荒れています。買い急がない場面です。"
      } else if (nikkeiChange >= 2) {
        level = "bubble"
        label = "過熱"
        reason = "市場が強く上がっています。高値づかみに注意です。"
      }

      setMarket({
        nikkei: Math.round(nikkei?.regularMarketPrice || 0),
        vix: vixValue,
        usdJpy: num(usd?.regularMarketPrice).toFixed(2),
        level,
        label,
        reason,
      })

      setLastUpdate(new Date().toLocaleString("ja-JP"))
    } catch {
      setLastUpdate("API取得失敗。保存データ表示中。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarket()
    const timer = setInterval(fetchMarket, 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const summary = useMemo(() => {
    let cost = 0
    let value = 0
    let profitTotal = 0
    let scoreTotal = 0
    let buy = 0
    let sell = 0
    let danger = 0

    stocks.forEach((s) => {
      const h = holdings[s.code]
      const p = profit(s, h)
      const j = judge(s, h, market)
      cost += p.cost
      value += p.value
      profitTotal += p.profit
      scoreTotal += j.score
      if (j.level === "buy") buy += 1
      if (j.level === "profit") sell += 1
      if (j.level === "danger") danger += 1
    })

    const score = Math.round(scoreTotal / stocks.length)
    const rate = cost ? (profitTotal / cost) * 100 : 0
    const cash = Math.max(0, 1000000 - cost)
    const investRemain = Math.max(0, 800000 - cost)

    return { cost, value, profitTotal, rate, score, cash, investRemain, buy, sell, danger }
  }, [stocks, holdings, market])

  function updateHolding(code, key, value) {
    setHoldings((prev) => ({
      ...prev,
      [code]: { ...prev[code], [key]: value },
    }))
  }

  function addLog(stock, action) {
    setLogs((prev) => [
      {
        id: String(Date.now()),
        date: new Date().toLocaleString("ja-JP"),
        code: stock.code,
        name: stock.name,
        action,
        price: stock.price,
      },
      ...prev,
    ].slice(0, 50))
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="sub">AI INFRA STOCK OS</p>
          <h1>AIインフラ株 判断くん</h1>
          <p>リアル株価・損益・市場モードで短期判断。</p>
        </div>
        <button onClick={fetchMarket}>{loading ? "更新中" : "更新"}</button>
      </section>

      <nav className="nav">
        {["home", "stock", "edit", "log", "help"].map((x) => (
          <button key={x} className={tab === x ? "on" : ""} onClick={() => setTab(x)}>
            {x.toUpperCase()}
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <section className="grid">
          <div className="judge" style={{ borderColor: color(market.level === "crash" ? "danger" : market.level) }}>
            <p className="label">市場モード</p>
            <h2 style={{ color: color(market.level === "crash" ? "danger" : market.level) }}>
              {market.label}
            </h2>
            <span>{market.reason}</span>
          </div>

          <Card title="AI SCORE" value={summary.score} color="#00f5d4" />
          <Card title="投資額" value={yen(summary.cost)} />
          <Card title="評価額" value={yen(summary.value)} />
          <Card title="損益" value={yen(summary.profitTotal)} sub={pct(summary.rate)} color={summary.profitTotal >= 0 ? "#00f5d4" : "#ff4d6d"} />
          <Card title="現金目安" value={yen(summary.cash)} />
          <Card title="残り投資枠" value={yen(summary.investRemain)} />
          <Card title="日経平均" value={market.nikkei ? yen(market.nikkei) : "-"} />
          <Card title="VIX" value={market.vix || "-"} />
          <Card title="ドル円" value={market.usdJpy || "-"} />

          <div className="card full">
            <p className="label">シグナル</p>
            <div className="signals">
              <div><b style={{ color: "#00f5d4" }}>{summary.buy}</b><span>買い候補</span></div>
              <div><b style={{ color: "#7cff6b" }}>{summary.sell}</b><span>利確候補</span></div>
              <div><b style={{ color: "#ff4d6d" }}>{summary.danger}</b><span>危険</span></div>
            </div>
          </div>

          <p className="update">最終更新: {lastUpdate || "未更新"}</p>
        </section>
      )}

      {tab === "stock" && (
        <section className="list">
          {stocks.map((s) => {
            const h = holdings[s.code]
            const j = judge(s, h, market)
            const p = profit(s, h)
            const chg = changeRate(s.price, s.prevClose)
            const dev = deviation(s.price, s.ma25)

            return (
              <article className="stock" key={s.code}>
                <div className="top">
                  <div>
                    <p className="code">{s.code}</p>
                    <h2>{s.name}</h2>
                    <p className="theme">{s.theme}</p>
                  </div>
                  <div className="badge" style={{ color: color(j.level), background: bg(j.level) }}>
                    {j.label}
                  </div>
                </div>

                <div className="score">
                  <span>AI SCORE</span>
                  <b style={{ color: color(j.level) }}>{j.score}</b>
                </div>

                <div className="metrics">
                  <Mini title="現在値" value={yen(s.price)} />
                  <Mini title="前日比" value={pct(chg)} color={chg >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="出来高" value={num(s.volume).toLocaleString("ja-JP")} />
                  <Mini title="出来高倍率" value={s.volumeRate + "倍"} />
                  <Mini title="PER" value={s.per + "倍"} />
                  <Mini title="25日線乖離" value={pct(dev)} color={dev >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="評価額" value={yen(p.value)} />
                  <Mini title="損益" value={yen(p.profit)} color={p.profit >= 0 ? "#00f5d4" : "#ff4d6d"} />
                </div>

                <div className="message">
                  <b>理由</b>
                  <p>{j.reason}</p>
                  <b>次の行動</b>
                  <p>{j.action}</p>
                </div>

                <div className="actions">
                  <button onClick={() => addLog(s, "買い検討")}>買い検討</button>
                  <button onClick={() => addLog(s, "利確検討")}>利確</button>
                  <button onClick={() => addLog(s, "損切り検討")}>損切り</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "edit" && (
        <section className="list">
          {stocks.map((s) => {
            const h = holdings[s.code]
            return (
              <div className="card full" key={s.code}>
                <h2>{s.name}</h2>
                <label>株数<input inputMode="numeric" value={h.shares} onChange={(e) => updateHolding(s.code, "shares", e.target.value)} /></label>
                <label>取得単価<input inputMode="numeric" value={h.buyPrice} onChange={(e) => updateHolding(s.code, "buyPrice", e.target.value)} /></label>
                <label>購入額<input inputMode="numeric" value={h.amount} onChange={(e) => updateHolding(s.code, "amount", e.target.value)} /></label>
                <label>メモ<textarea value={h.memo} maxLength={100} onChange={(e) => updateHolding(s.code, "memo", e.target.value)} /></label>
              </div>
            )
          })}
        </section>
      )}

      {tab === "log" && (
        <section className="list">
          {logs.length === 0 ? <div className="card">記録なし</div> : logs.map((l) => (
            <div className="card" key={l.id}>
              <p className="label">{l.date}</p>
              <h3>{l.name}</h3>
              <p>{l.action} / {yen(l.price)}</p>
            </div>
          ))}
        </section>
      )}

      {tab === "help" && (
        <section className="list">
          <div className="card">
            <h2>ルール</h2>
            <p>一括買い禁止。利益は守る。赤は買いではなく危険。現金20万円は残す。</p>
          </div>
          <div className="card">
            <h2>色</h2>
            <p style={{ color: "#00f5d4" }}>青緑: 買い候補</p>
            <p style={{ color: "#7cff6b" }}>緑: 利確</p>
            <p style={{ color: "#60a5fa" }}>青: 待ち</p>
            <p style={{ color: "#ff4d6d" }}>赤: 危険</p>
          </div>
        </section>
      )}

      <style jsx>{`
        *{box-sizing:border-box}
        .app{min-height:100vh;padding:16px 14px 90px;color:white;background:radial-gradient(circle at top,rgba(0,180,255,.25),transparent 32%),linear-gradient(180deg,#020713,#07111f 55%,#020713);font-family:Arial,sans-serif}
        .hero{display:flex;justify-content:space-between;gap:12px;padding:18px;border:1px solid rgba(0,220,255,.35);border-radius:22px;background:rgba(5,16,32,.86)}
        .sub,.label{margin:0 0 8px;color:#8aa6b5;font-size:12px}
        h1{margin:0;font-size:24px} h2,h3{margin:0}
        .hero p{color:#b7cad8;font-size:13px}
        .hero button,.nav button,.actions button{border:1px solid rgba(0,220,255,.35);border-radius:999px;padding:11px;color:white;background:rgba(255,255,255,.06);font-weight:bold}
        .nav{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:12px 0;background:rgba(2,7,19,.92)}
        .nav button{font-size:11px;color:#a9bfca}
        .nav .on{background:#60ddff;color:#00131c}
        .grid,.list{display:grid;gap:12px}
        .card,.stock,.judge{padding:16px;border:1px solid rgba(0,220,255,.25);border-radius:20px;background:rgba(7,18,34,.86)}
        .judge{border-width:2px}.judge h2{font-size:34px}.judge span{display:block;color:#d7e9f0;font-size:13px;line-height:1.6}
        .full{grid-column:1/-1}.signals{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.signals div{padding:12px;border-radius:14px;background:rgba(255,255,255,.06)}.signals b{font-size:28px}.signals span{display:block;font-size:12px;color:#8fdfff}
        .update{text-align:center;color:#7894a5;font-size:12px}
        .top{display:grid;grid-template-columns:1fr 120px;gap:12px}.code{margin:0;color:#64dfff;font-size:12px;font-weight:bold}.theme{color:#a9bfca;font-size:12px}
        .badge{padding:12px;border-radius:16px;text-align:center;font-size:18px;font-weight:900}
        .score{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:12px;border-radius:16px;background:rgba(255,255,255,.05)}.score span{color:#8aa6b5;font-size:12px}.score b{font-size:28px}
        .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}.mini{padding:12px;border-radius:14px;background:rgba(255,255,255,.06)}.mini span{display:block;margin-bottom:6px;color:#87a2b2;font-size:11px}.mini b{font-size:16px;word-break:break-all}
        .message{margin-top:14px;padding:14px;border-radius:16px;background:rgba(0,0,0,.2)}.message p,.card p{color:#d5e6ee;font-size:13px;line-height:1.7}
        .actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.actions button{font-size:12px;border-radius:14px}
        label{display:grid;gap:6px;margin-top:12px;color:#aac1cc;font-size:13px;font-weight:700}input,textarea{width:100%;border:1px solid rgba(0,220,255,.25);border-radius:14px;padding:12px;color:white;background:rgba(0,0,0,.25);font-size:16px}textarea{min-height:70px}
        @media(min-width:620px){.app{max-width:560px;margin:0 auto}.grid{grid-template-columns:repeat(2,1fr)}}
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