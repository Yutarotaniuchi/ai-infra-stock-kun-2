"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "signal_os_practical_v1"

const BASE_STOCKS = [
  {
    code: "5803",
    symbol: "5803.T",
    name: "フジクラ",
    theme: "AI通信インフラ・光ファイバー",
    target: 400000,
    price: 6500,
    prevClose: 6680,
    volume: 4300000,
    volumeRate: 1.6,
    per: 22.5,
    ma25: 6200,
    memo: "AIデータセンター・通信インフラ需要の中心候補。",
  },
  {
    code: "5805",
    symbol: "5805.T",
    name: "SWCC",
    theme: "電線・電力インフラ",
    target: 240000,
    price: 8200,
    prevClose: 8350,
    volume: 680000,
    volumeRate: 1.3,
    per: 18.2,
    ma25: 7900,
    memo: "電力網・送電・データセンター需要に連動しやすい。",
  },
  {
    code: "6857",
    symbol: "6857.T",
    name: "アドバンテスト",
    theme: "AI半導体・検査装置",
    target: 160000,
    price: 9800,
    prevClose: 9450,
    volume: 9200000,
    volumeRate: 1.8,
    per: 35.6,
    ma25: 9300,
    memo: "AI半導体相場の影響を受けやすい主力候補。",
  },
]

const EMPTY_HOLDINGS = {
  "5803": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静" },
  "5805": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静" },
  "6857": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静" },
}

function n(v) {
  return Number(v || 0)
}

function yen(v) {
  return n(v).toLocaleString("ja-JP") + "円"
}

function pct(v) {
  return n(v).toFixed(1) + "%"
}

function rate(now, base) {
  return base ? ((now - base) / base) * 100 : 0
}

function dev(price, ma) {
  return ma ? ((price - ma) / ma) * 100 : 0
}

function calcProfit(stock, h) {
  const shares = n(h.shares)
  const buy = n(h.buyPrice)
  if (!shares || !buy) return { cost: 0, value: 0, profit: 0, rate: 0, has: false }
  const cost = shares * buy
  const value = shares * n(stock.price)
  const profit = value - cost
  return { cost, value, profit, rate: cost ? (profit / cost) * 100 : 0, has: true }
}

function levelColor(level) {
  return {
    buy: "#00f5d4",
    profit: "#7cff6b",
    wait: "#60a5fa",
    warning: "#ffb703",
    danger: "#ff4d6d",
    crash: "#c084fc",
    neutral: "#94a3b8",
  }[level] || "#94a3b8"
}

function levelBg(level) {
  return {
    buy: "rgba(0,245,212,.16)",
    profit: "rgba(124,255,107,.15)",
    wait: "rgba(96,165,250,.15)",
    warning: "rgba(255,183,3,.16)",
    danger: "rgba(255,77,109,.18)",
    crash: "rgba(192,132,252,.18)",
    neutral: "rgba(148,163,184,.12)",
  }[level] || "rgba(148,163,184,.12)"
}

function judgeStock(stock, h, market, summary) {
  const chg = rate(n(stock.price), n(stock.prevClose))
  const d = dev(n(stock.price), n(stock.ma25))
  const p = calcProfit(stock, h)
  const positionRate = summary.totalCost ? (p.cost / summary.totalCost) * 100 : 0

  const noBuyReasons = []

  if (market.mode === "crash") noBuyReasons.push("市場が暴落警戒モード")
  if (market.mode === "warning") noBuyReasons.push("市場が警戒モード")
  if (chg >= 5) noBuyReasons.push("短期で上がりすぎ")
  if (d >= 15) noBuyReasons.push("25日線から離れすぎ")
  if (n(stock.per) >= 35) noBuyReasons.push("PERが高め")
  if (positionRate >= 35) noBuyReasons.push("1銘柄への集中度が高い")
  if (summary.cash < 200000) noBuyReasons.push("現金20万円ルールを割りそう")
  if (h.emotion === "焦り" || h.emotion === "欲") noBuyReasons.push("感情が強い状態")

  if (market.mode === "crash") {
    return {
      label: "防御",
      level: "crash",
      score: 18,
      reason: "市場全体が荒れています。個別株よりも資金管理を優先します。",
      action: "買い急がない。現金を守る。",
      noBuyReasons,
      nextStep: "WAIT",
    }
  }

  if (p.has && p.rate >= 35) {
    return {
      label: "大きく利確",
      level: "profit",
      score: 92,
      reason: "利益がかなり大きいです。勝ちを残す場面です。",
      action: "多めに売って利益を確保。",
      noBuyReasons,
      nextStep: "SELL",
    }
  }

  if (p.has && p.rate >= 20) {
    return {
      label: "利確候補",
      level: "profit",
      score: 84,
      reason: "十分な利益が出ています。少し売って守る判断ができます。",
      action: "一部または半分利確。",
      noBuyReasons,
      nextStep: "SELL",
    }
  }

  if (p.has && p.rate <= -10) {
    return {
      label: "損切り検討",
      level: "danger",
      score: 16,
      reason: "損失が広がっています。買い増しより撤退判断を優先します。",
      action: "買った理由が崩れたなら損切り。",
      noBuyReasons,
      nextStep: "CUT",
    }
  }

  if (chg >= 10 || d >= 20) {
    return {
      label: "危険",
      level: "danger",
      score: 20,
      reason: "上がりすぎです。高値づかみになりやすい場面です。",
      action: "今日は買わない。",
      noBuyReasons,
      nextStep: "WAIT",
    }
  }

  if (noBuyReasons.length >= 3) {
    return {
      label: "買わない",
      level: "warning",
      score: 35,
      reason: "買わない理由が複数あります。今は守る判断が優先です。",
      action: "待機。次の押し目まで動かない。",
      noBuyReasons,
      nextStep: "WAIT",
    }
  }

  if (chg <= -3 && chg >= -7 && n(stock.volumeRate) >= 1 && summary.cash >= 200000) {
    return {
      label: "少額買い",
      level: "buy",
      score: 80,
      reason: "下げていますが、出来高があります。少額なら検討できます。",
      action: "予定額の一部だけ。全力買いは禁止。",
      noBuyReasons,
      nextStep: "BUY_SMALL",
    }
  }

  if (chg >= -5 && chg <= 3 && n(stock.volumeRate) >= 1.5 && d <= 10 && summary.cash >= 200000) {
    return {
      label: "買い候補",
      level: "buy",
      score: 76,
      reason: "上がりすぎではなく、出来高もあります。",
      action: "第1回分の一部から入る候補。",
      noBuyReasons,
      nextStep: "BUY_SMALL",
    }
  }

  return {
    label: "様子見",
    level: "neutral",
    score: 55,
    reason: "強い買い理由も、強い危険サインもまだ弱いです。",
    action: "無理に動かない。現金保持もポジション。",
    noBuyReasons,
    nextStep: "WAIT",
  }
}

export default function Page() {
  const [stocks, setStocks] = useState(BASE_STOCKS)
  const [holdings, setHoldings] = useState(EMPTY_HOLDINGS)
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState("home")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("")
  const [market, setMarket] = useState({
    mode: "normal",
    label: "通常",
    reason: "市場は通常モードです。",
    nikkei: "-",
    vix: "-",
    usd: "-",
  })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const p = JSON.parse(saved)
      if (p.holdings) setHoldings(p.holdings)
      if (p.logs) setLogs(p.logs)
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
      const data = json.data || []

      setStocks((prev) =>
        prev.map((s) => {
          const f = data.find((x) => x.symbol === s.symbol)
          if (!f) return s
          return {
            ...s,
            price: Math.round(f.regularMarketPrice || s.price),
            prevClose: Math.round(f.regularMarketPreviousClose || s.prevClose),
            volume: f.regularMarketVolume || s.volume,
            per: f.trailingPE ? Number(f.trailingPE.toFixed(1)) : s.per,
          }
        })
      )

      const nikkei = data.find((x) => x.symbol === "^N225")
      const vix = data.find((x) => x.symbol === "^VIX")
      const usd = data.find((x) => x.symbol === "JPY=X")

      const nikkeiRate = rate(nikkei?.regularMarketPrice, nikkei?.regularMarketPreviousClose)
      const vixVal = n(vix?.regularMarketPrice)

      let mode = "normal"
      let label = "通常"
      let reason = "市場は通常モードです。"

      if (vixVal >= 30 || nikkeiRate <= -3) {
        mode = "crash"
        label = "暴落監視"
        reason = "市場が荒れています。攻めより防御。現金を守ります。"
      } else if (vixVal >= 22 || nikkeiRate <= -1.5) {
        mode = "warning"
        label = "警戒"
        reason = "地合いがやや悪いです。買い急ぎ禁止。"
      } else if (nikkeiRate >= 2) {
        mode = "warning"
        label = "過熱"
        reason = "市場が強く上がっています。高値づかみに注意。"
      }

      setMarket({
        mode,
        label,
        reason,
        nikkei: nikkei?.regularMarketPrice ? yen(Math.round(nikkei.regularMarketPrice)) : "-",
        vix: vixVal || "-",
        usd: usd?.regularMarketPrice ? Number(usd.regularMarketPrice).toFixed(2) : "-",
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

  const baseSummary = useMemo(() => {
    let totalCost = 0
    let totalValue = 0
    let totalProfit = 0

    stocks.forEach((s) => {
      const p = calcProfit(s, holdings[s.code])
      totalCost += p.cost
      totalValue += p.value
      totalProfit += p.profit
    })

    const cash = Math.max(0, 1000000 - totalCost)
    const remain = Math.max(0, 800000 - totalCost)
    const rateTotal = totalCost ? (totalProfit / totalCost) * 100 : 0

    return { totalCost, totalValue, totalProfit, cash, remain, rateTotal }
  }, [stocks, holdings])

  const fullSummary = useMemo(() => {
    let score = 0
    let buy = 0
    let sell = 0
    let danger = 0
    let wait = 0

    stocks.forEach((s) => {
      const j = judgeStock(s, holdings[s.code], market, baseSummary)
      score += j.score
      if (j.level === "buy") buy++
      if (j.level === "profit") sell++
      if (j.level === "danger" || j.level === "crash") danger++
      if (j.level === "neutral" || j.level === "wait" || j.level === "warning") wait++
    })

    return { ...baseSummary, score: Math.round(score / stocks.length), buy, sell, danger, wait }
  }, [stocks, holdings, market, baseSummary])

  function updateHolding(code, key, value) {
    setHoldings((prev) => ({
      ...prev,
      [code]: { ...prev[code], [key]: value },
    }))
  }

  function addLog(stock, action) {
    const h = holdings[stock.code]
    setLogs((prev) =>
      [
        {
          id: String(Date.now()),
          date: new Date().toLocaleString("ja-JP"),
          name: stock.name,
          code: stock.code,
          action,
          price: stock.price,
          emotion: h.emotion,
          memo: h.memo,
        },
        ...prev,
      ].slice(0, 50)
    )
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="sub">SIGNAL OS</p>
          <h1>SIGNAL OS</h1>
          <p>買う理由より、買わない理由を重視する投資判断OS。</p>
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
          <div className="judge" style={{ borderColor: levelColor(market.mode) }}>
            <p className="label">MARKET MODE</p>
            <h2 style={{ color: levelColor(market.mode) }}>{market.label}</h2>
            <p>{market.reason}</p>
          </div>

          <Card title="SIGNAL SCORE" value={fullSummary.score} color="#00f5d4" />
          <Card title="投資額" value={yen(fullSummary.totalCost)} />
          <Card title="評価額" value={yen(fullSummary.totalValue)} />
          <Card title="損益" value={yen(fullSummary.totalProfit)} sub={pct(fullSummary.rateTotal)} color={fullSummary.totalProfit >= 0 ? "#00f5d4" : "#ff4d6d"} />
          <Card title="現金目安" value={yen(fullSummary.cash)} />
          <Card title="残り投資枠" value={yen(fullSummary.remain)} />
          <Card title="日経平均" value={market.nikkei} />
          <Card title="VIX" value={market.vix} />
          <Card title="ドル円" value={market.usd} />

          <div className="card full">
            <p className="label">SIGNALS</p>
            <div className="signals">
              <div><b style={{ color: "#00f5d4" }}>{fullSummary.buy}</b><span>買い</span></div>
              <div><b style={{ color: "#7cff6b" }}>{fullSummary.sell}</b><span>利確</span></div>
              <div><b style={{ color: "#60a5fa" }}>{fullSummary.wait}</b><span>待機</span></div>
              <div><b style={{ color: "#ff4d6d" }}>{fullSummary.danger}</b><span>危険</span></div>
            </div>
          </div>

          <div className="card full">
            <h2>CASH MODE</h2>
            <p>現金保持もポジション。焦って買わないことも投資判断です。</p>
          </div>

          <p className="update">最終更新: {lastUpdate || "未更新"}</p>
        </section>
      )}

      {tab === "stock" && (
        <section className="list">
          {stocks.map((s) => {
            const h = holdings[s.code]
            const p = calcProfit(s, h)
            const j = judgeStock(s, h, market, fullSummary)
            const chg = rate(s.price, s.prevClose)
            const d = dev(s.price, s.ma25)

            return (
              <article className="stock" key={s.code}>
                <div className="top">
                  <div>
                    <p className="code">{s.code}</p>
                    <h2>{s.name}</h2>
                    <p className="theme">{s.theme}</p>
                  </div>
                  <div className="badge" style={{ color: levelColor(j.level), background: levelBg(j.level) }}>
                    {j.label}
                  </div>
                </div>

                <div className="score">
                  <span>SIGNAL SCORE</span>
                  <b style={{ color: levelColor(j.level) }}>{j.score}</b>
                </div>

                <div className="metrics">
                  <Mini title="現在値" value={yen(s.price)} />
                  <Mini title="前日比" value={pct(chg)} color={chg >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="出来高" value={n(s.volume).toLocaleString("ja-JP")} />
                  <Mini title="出来高倍率" value={s.volumeRate + "倍"} />
                  <Mini title="PER" value={s.per + "倍"} />
                  <Mini title="25日線乖離" value={pct(d)} color={d >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="評価額" value={yen(p.value)} />
                  <Mini title="損益" value={yen(p.profit)} color={p.profit >= 0 ? "#00f5d4" : "#ff4d6d"} />
                </div>

                <div className="message">
                  <b>判断理由</b>
                  <p>{j.reason}</p>
                  <b>次の行動</b>
                  <p>{j.action}</p>
                  <b>買わない理由</b>
                  {j.noBuyReasons.length ? (
                    <ul>{j.noBuyReasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  ) : (
                    <p>大きな禁止理由は少なめです。</p>
                  )}
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
                <label>感情
                  <select value={h.emotion} onChange={(e) => updateHolding(s.code, "emotion", e.target.value)}>
                    <option>冷静</option>
                    <option>焦り</option>
                    <option>恐怖</option>
                    <option>欲</option>
                    <option>ルール通り</option>
                  </select>
                </label>
                <label>メモ<textarea value={h.memo} onChange={(e) => updateHolding(s.code, "memo", e.target.value)} /></label>
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
              <p>感情: {l.emotion}</p>
              {l.memo ? <p>メモ: {l.memo}</p> : null}
            </div>
          ))}
        </section>
      )}

      {tab === "help" && (
        <section className="list">
          <div className="card">
            <h2>SIGNAL OSとは</h2>
            <p>投資で勝つためだけでなく、投資で壊れないためのOSです。</p>
          </div>
          <div className="card">
            <h2>ルール</h2>
            <p>一括買い禁止。現金20万円は残す。赤は買いではなく防御。待機も正しい判断。</p>
          </div>
        </section>
      )}

      <style jsx>{`
        *{box-sizing:border-box}
        .app{min-height:100vh;padding:16px 14px 90px;color:white;background:radial-gradient(circle at top,rgba(0,180,255,.25),transparent 32%),linear-gradient(180deg,#020713,#07111f 55%,#020713);font-family:Arial,sans-serif}
        .hero{display:flex;justify-content:space-between;gap:12px;padding:18px;border:1px solid rgba(0,220,255,.35);border-radius:22px;background:rgba(5,16,32,.86)}
        .sub,.label{margin:0 0 8px;color:#8aa6b5;font-size:12px}
        h1{margin:0;font-size:28px}h2,h3{margin:0}.hero p{color:#b7cad8;font-size:13px}
        .hero button,.nav button,.actions button{border:1px solid rgba(0,220,255,.35);border-radius:999px;padding:11px;color:white;background:rgba(255,255,255,.06);font-weight:bold}
        .nav{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:12px 0;background:rgba(2,7,19,.92)}
        .nav button{font-size:11px;color:#a9bfca}.nav .on{background:#60ddff;color:#00131c}
        .grid,.list{display:grid;gap:12px}.card,.stock,.judge{padding:16px;border:1px solid rgba(0,220,255,.25);border-radius:20px;background:rgba(7,18,34,.86)}
        .judge{border-width:2px}.judge h2{font-size:34px}.judge p,.card p{color:#d7e9f0;font-size:13px;line-height:1.6}
        .full{grid-column:1/-1}.signals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.signals div{padding:12px;border-radius:14px;background:rgba(255,255,255,.06)}.signals b{font-size:28px}.signals span{display:block;font-size:12px;color:#8fdfff}
        .update{text-align:center;color:#7894a5;font-size:12px}.top{display:grid;grid-template-columns:1fr 120px;gap:12px}.code{margin:0;color:#64dfff;font-size:12px;font-weight:bold}.theme{color:#a9bfca;font-size:12px}
        .badge{padding:12px;border-radius:16px;text-align:center;font-size:18px;font-weight:900}
        .score{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:12px;border-radius:16px;background:rgba(255,255,255,.05)}.score span{color:#8aa6b5;font-size:12px}.score b{font-size:28px}
        .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}.mini{padding:12px;border-radius:14px;background:rgba(255,255,255,.06)}.mini span{display:block;margin-bottom:6px;color:#87a2b2;font-size:11px}.mini b{font-size:16px;word-break:break-all}
        .message{margin-top:14px;padding:14px;border-radius:16px;background:rgba(0,0,0,.2)}.message p,.message li{color:#d5e6ee;font-size:13px;line-height:1.7}
        .actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.actions button{font-size:12px;border-radius:14px}
        label{display:grid;gap:6px;margin-top:12px;color:#aac1cc;font-size:13px;font-weight:700}input,textarea,select{width:100%;border:1px solid rgba(0,220,255,.25);border-radius:14px;padding:12px;color:white;background:rgba(0,0,0,.25);font-size:16px}textarea{min-height:70px}
        @media(min-width:620px){.app{max-width:560px;margin:0 auto}.grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </main>
  )
}

function Card({ title, value, sub, color }) {
  return <div className="card"><p className="label">{title}</p><h3 style={{color}}>{value}</h3>{sub ? <small style={{color}}>{sub}</small> : null}</div>
}

function Mini({ title, value, color }) {
  return <div className="mini"><span>{title}</span><b style={{color}}>{value}</b></div>
}