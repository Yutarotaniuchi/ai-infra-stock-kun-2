"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "ai_infra_stock_os_complete_v1"

const DEFAULT_STOCKS = [
  {
    code: "5803",
    name: "フジクラ",
    theme: "AI通信インフラ・光ファイバー",
    finalAmount: 400000,
    plan: [150000, 130000, 120000],
    price: 6500,
    change: -2.4,
    volume: 4300000,
    volumeRate: 1.6,
    per: 22.5,
    ma25: 6200,
    news: "AI通信インフラ需要が追い風",
  },
  {
    code: "5805",
    name: "SWCC",
    theme: "電線・電力インフラ",
    finalAmount: 240000,
    plan: [90000, 70000, 80000],
    price: 8200,
    change: -1.2,
    volume: 680000,
    volumeRate: 1.3,
    per: 18.2,
    ma25: 7900,
    news: "電力網・データセンター需要に注目",
  },
  {
    code: "6857",
    name: "アドバンテスト",
    theme: "AI半導体・検査装置",
    finalAmount: 160000,
    plan: [60000, 50000, 50000],
    price: 9800,
    change: 3.8,
    volume: 9200000,
    volumeRate: 1.8,
    per: 35.6,
    ma25: 9300,
    news: "AI半導体関連として人気化しやすい",
  },
]

const DEFAULT_HOLDINGS = {
  "5803": {
    amount: "",
    shares: "",
    price: "",
    date: "",
    memo: "",
  },
  "5805": {
    amount: "",
    shares: "",
    price: "",
    date: "",
    memo: "",
  },
  "6857": {
    amount: "",
    shares: "",
    price: "",
    date: "",
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

function deviation(price, ma25) {
  if (!price || !ma25) return 0
  return ((price - ma25) / ma25) * 100
}

function getProfit(stock, holding) {
  const shares = num(holding.shares)
  const buyPrice = num(holding.price)
  const nowPrice = num(stock.price)

  if (!shares || !buyPrice || !nowPrice) {
    return {
      cost: 0,
      value: 0,
      profit: 0,
      rate: 0,
      has: false,
    }
  }

  const cost = shares * buyPrice
  const value = shares * nowPrice
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

function levelColor(level) {
  if (level === "buy") return "#00f5d4"
  if (level === "profit") return "#7CFF6B"
  if (level === "wait") return "#60a5fa"
  if (level === "warning") return "#ffb703"
  if (level === "danger") return "#ff4d6d"
  return "#94a3b8"
}

function levelBg(level) {
  if (level === "buy") return "rgba(0,245,212,.16)"
  if (level === "profit") return "rgba(124,255,107,.15)"
  if (level === "wait") return "rgba(96,165,250,.15)"
  if (level === "warning") return "rgba(255,183,3,.16)"
  if (level === "danger") return "rgba(255,77,109,.18)"
  return "rgba(148,163,184,.14)"
}

function getJudge(stock, holding) {
  const dev = deviation(num(stock.price), num(stock.ma25))
  const p = getProfit(stock, holding)

  if (p.has) {
    if (p.rate >= 35) {
      return {
        label: "大きく利確",
        level: "danger",
        score: 92,
        reason: "利益がかなり大きいです。短期売買では、勝ちを残すことが大切です。",
        action: "多めに売って利益を守る。残りだけ上昇を狙う。",
      }
    }

    if (p.rate >= 25) {
      return {
        label: "半分利確",
        level: "profit",
        score: 84,
        reason: "十分な利益が出ています。半分売ると、勝ちを残しながら次も狙えます。",
        action: "半分利確。残りはトレンドが続くなら保有。",
      }
    }

    if (p.rate >= 15) {
      return {
        label: "一部利確",
        level: "profit",
        score: 74,
        reason: "利益が見えてきました。少し売って利益を現金化する場面です。",
        action: "一部だけ利確。欲張りすぎない。",
      }
    }

    if (p.rate <= -10) {
      return {
        label: "損切り検討",
        level: "danger",
        score: 18,
        reason: "損が大きくなっています。感情で持ち続けると傷が広がる可能性があります。",
        action: "買った理由が崩れているなら損切り。買い増しはしない。",
      }
    }

    if (p.rate <= -8) {
      return {
        label: "警戒",
        level: "warning",
        score: 35,
        reason: "損が広がっています。焦って買い増すとさらに苦しくなる可能性があります。",
        action: "いったん様子見。下げ止まりを確認。",
      }
    }
  }

  if (num(stock.change) >= 10 || dev >= 20) {
    return {
      label: "危険",
      level: "danger",
      score: 20,
      reason: "短期で上がりすぎています。高値づかみになりやすい場面です。",
      action: "今日は買わない。落ち着くまで待つ。",
    }
  }

  if (num(stock.change) >= 5 || dev >= 15) {
    return {
      label: "待ち",
      level: "wait",
      score: 45,
      reason: "上昇していますが、今から入ると高値になる可能性があります。",
      action: "押し目を待つ。追いかけ買いはしない。",
    }
  }

  if (num(stock.change) <= -3 && num(stock.change) >= -7 && num(stock.volumeRate) >= 1) {
    return {
      label: "押し目候補",
      level: "buy",
      score: 76,
      reason: "下げていますが、出来高がありテーマも残っています。",
      action: "買うなら予定額の一部だけ。全力買いは禁止。",
    }
  }

  if (
    num(stock.change) >= -5 &&
    num(stock.change) <= 3 &&
    num(stock.volumeRate) >= 1.5 &&
    dev <= 10
  ) {
    return {
      label: "買い候補",
      level: "buy",
      score: 82,
      reason: "上がりすぎではなく、出来高もあります。条件は悪くありません。",
      action: "第1回分の一部から入る候補。",
    }
  }

  return {
    label: "様子見",
    level: "neutral",
    score: 55,
    reason: "強い買い理由も、強い危険サインもまだ弱いです。",
    action: "無理に動かず、次の更新を待つ。",
  }
}

function getNextBuyPlan(stock, invested) {
  const plan = stock.plan || []
  if (invested <= 0) return plan[0] || 0
  if (invested < plan[0]) return Math.max(0, plan[0] - invested)
  if (invested < plan[0] + plan[1]) return Math.max(0, plan[0] + plan[1] - invested)
  if (invested < stock.finalAmount) return Math.max(0, stock.finalAmount - invested)
  return 0
}

export default function Page() {
  const [stocks, setStocks] = useState(DEFAULT_STOCKS)
  const [holdings, setHoldings] = useState(DEFAULT_HOLDINGS)
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState("home")
  const [lastUpdate, setLastUpdate] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (parsed.stocks) setStocks(parsed.stocks)
      if (parsed.holdings) setHoldings(parsed.holdings)
      if (parsed.logs) setLogs(parsed.logs)
      if (parsed.lastUpdate) setLastUpdate(parsed.lastUpdate)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stocks,
        holdings,
        logs,
        lastUpdate,
      })
    )
  }, [stocks, holdings, logs, lastUpdate])

  function refresh() {
    setLoading(true)

    setTimeout(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const move = (Math.random() - 0.5) * 2
          const nextPrice = Math.max(1, Math.round(num(s.price) * (1 + move / 100)))
          return {
            ...s,
            price: nextPrice,
            change: Number((num(s.change) + move).toFixed(1)),
            volumeRate: Number(
              Math.max(0.5, num(s.volumeRate) + (Math.random() - 0.5) * 0.3).toFixed(1)
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
    let buyCount = 0
    let dangerCount = 0
    let profitCount = 0
    let totalScore = 0

    stocks.forEach((stock) => {
      const holding = holdings[stock.code]
      const p = getProfit(stock, holding)
      const j = getJudge(stock, holding)

      invested += p.cost
      value += p.value
      profit += p.profit
      totalScore += j.score

      if (j.level === "buy") buyCount += 1
      if (j.level === "danger") dangerCount += 1
      if (j.level === "profit") profitCount += 1
    })

    const remain = Math.max(0, 800000 - invested)
    const rate = invested ? (profit / invested) * 100 : 0
    const avgScore = Math.round(totalScore / stocks.length)

    let label = "様子見"
    let level = "neutral"
    let text = "今日は無理に動かず、条件がそろう銘柄だけ確認します。"

    if (dangerCount > 0) {
      label = "防御優先"
      level = "danger"
      text = "危険サインがあります。買いより守りを優先します。"
    } else if (profitCount > 0) {
      label = "利確確認"
      level = "profit"
      text = "利益が出ています。売って利益を残す判断も大切です。"
    } else if (buyCount > 0) {
      label = "一部買い候補"
      level = "buy"
      text = "買い候補があります。ただし一気に買わず、分けて入ります。"
    }

    return {
      invested,
      value,
      profit,
      rate,
      remain,
      avgScore,
      label,
      level,
      text,
      buyCount,
      dangerCount,
      profitCount,
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

  function updateStock(code, key, value) {
    setStocks((prev) =>
      prev.map((s) => (s.code === code ? { ...s, [key]: value } : s))
    )
  }

  function addLog(stock, action) {
    const now = new Date().toLocaleString("ja-JP")
    const item = {
      id: String(Date.now()),
      date: now,
      code: stock.code,
      name: stock.name,
      action,
      price: stock.price,
      memo: "",
    }
    setLogs((prev) => [item, ...prev].slice(0, 30))
  }

  function resetData() {
    const ok = window.confirm("保存データを初期化しますか？")
    if (!ok) return

    setStocks(DEFAULT_STOCKS)
    setHoldings(DEFAULT_HOLDINGS)
    setLogs([])
    setLastUpdate("")
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="sub">AI INFRA STOCK OS</p>
          <h1>AIインフラ株 判断くん</h1>
          <p className="lead">
            フジクラ・SWCC・アドバンテストを、感情ではなくルールで判断。
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
        <button className={tab === "log" ? "on" : ""} onClick={() => setTab("log")}>
          LOG
        </button>
        <button className={tab === "help" ? "on" : ""} onClick={() => setTab("help")}>
          HELP
        </button>
      </nav>

      {tab === "home" && (
        <section className="grid">
          <div className="mainJudge" style={{ borderColor: levelColor(summary.level) }}>
            <p>今日の総合判断</p>
            <h2 style={{ color: levelColor(summary.level) }}>{summary.label}</h2>
            <span>{summary.text}</span>

            <div className="scoreLine">
              <b>AI SCORE</b>
              <strong style={{ color: levelColor(summary.level) }}>{summary.avgScore}</strong>
            </div>

            <div className="bar">
              <i
                style={{
                  width: summary.avgScore + "%",
                  background: levelColor(summary.level),
                }}
              />
            </div>
          </div>

          <Card title="総資金" value={yen(1000000)} />
          <Card title="投資予定額" value={yen(800000)} />
          <Card title="現金キープ" value={yen(200000)} />
          <Card title="現在投資額" value={yen(summary.invested)} />
          <Card title="残り投資可能額" value={yen(summary.remain)} />
          <Card title="評価額" value={yen(summary.value)} />
          <Card
            title="損益"
            value={yen(summary.profit)}
            sub={pct(summary.rate)}
            color={summary.profit >= 0 ? "#00f5d4" : "#ff4d6d"}
          />

          <div className="card full">
            <p className="label">シグナル数</p>
            <div className="signalGrid">
              <div>
                <b style={{ color: "#00f5d4" }}>{summary.buyCount}</b>
                <span>買い候補</span>
              </div>
              <div>
                <b style={{ color: "#7CFF6B" }}>{summary.profitCount}</b>
                <span>利確候補</span>
              </div>
              <div>
                <b style={{ color: "#ff4d6d" }}>{summary.dangerCount}</b>
                <span>危険</span>
              </div>
            </div>
          </div>

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

          <div className="card full">
            <p className="label">最終配分</p>
            {stocks.map((s) => (
              <div className="row" key={s.code}>
                <span>{s.name}</span>
                <b>{yen(s.finalAmount)}</b>
              </div>
            ))}
          </div>

          <p className="update">最終更新: {lastUpdate || "未更新"}</p>
        </section>
      )}

      {tab === "stock" && (
        <section className="list">
          {stocks.map((stock) => {
            const holding = holdings[stock.code]
            const judge = getJudge(stock, holding)
            const p = getProfit(stock, holding)
            const dev = deviation(num(stock.price), num(stock.ma25))
            const nextBuy = getNextBuyPlan(stock, p.cost)

            return (
              <article className="stock" key={stock.code}>
                <div className="stockTop">
                  <div>
                    <p className="code">{stock.code}</p>
                    <h2>{stock.name}</h2>
                    <p className="theme">{stock.theme}</p>
                  </div>
                  <div
                    className="badge"
                    style={{
                      color: levelColor(judge.level),
                      background: levelBg(judge.level),
                    }}
                  >
                    {judge.label}
                  </div>
                </div>

                <div className="scoreBox">
                  <div>
                    <span>AI SCORE</span>
                    <b style={{ color: levelColor(judge.level) }}>{judge.score}</b>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: judge.score + "%",
                        background: levelColor(judge.level),
                      }}
                    />
                  </div>
                </div>

                <div className="metrics">
                  <Mini title="現在値" value={yen(stock.price)} />
                  <Mini
                    title="前日比"
                    value={pct(stock.change)}
                    color={num(stock.change) >= 0 ? "#00f5d4" : "#ff4d6d"}
                  />
                  <Mini title="出来高" value={num(stock.volume).toLocaleString("ja-JP")} />
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
                  <p>{judge.reason}</p>
                  <b>次の行動</b>
                  <p>{judge.action}</p>
                </div>

                <div className="metrics">
                  <Mini title="購入額" value={holding.amount ? yen(holding.amount) : "-"} />
                  <Mini title="株数" value={holding.shares || "-"} />
                  <Mini title="取得単価" value={holding.price ? yen(holding.price) : "-"} />
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
                  <Mini title="次の購入目安" value={nextBuy ? yen(nextBuy) : "完了"} />
                  <Mini title="最終予定額" value={yen(stock.finalAmount)} />
                </div>

                <div className="actionBtns">
                  <button onClick={() => addLog(stock, "買い検討")}>買い検討を記録</button>
                  <button onClick={() => addLog(stock, "一部利確")}>利確を記録</button>
                  <button onClick={() => addLog(stock, "損切り検討")}>損切り検討</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "edit" && (
        <section className="list">
          {stocks.map((stock) => {
            const holding = holdings[stock.code]

            return (
              <div className="card full" key={stock.code}>
                <h2>{stock.name}</h2>

                <label>
                  現在値
                  <input
                    inputMode="numeric"
                    value={stock.price}
                    onChange={(e) => updateStock(stock.code, "price", e.target.value)}
                  />
                </label>

                <label>
                  前日比%
                  <input
                    inputMode="decimal"
                    value={stock.change}
                    onChange={(e) => updateStock(stock.code, "change", e.target.value)}
                  />
                </label>

                <label>
                  出来高
                  <input
                    inputMode="numeric"
                    value={stock.volume}
                    onChange={(e) => updateStock(stock.code, "volume", e.target.value)}
                  />
                </label>

                <label>
                  出来高倍率
                  <input
                    inputMode="decimal"
                    value={stock.volumeRate}
                    onChange={(e) => updateStock(stock.code, "volumeRate", e.target.value)}
                  />
                </label>

                <label>
                  PER
                  <input
                    inputMode="decimal"
                    value={stock.per}
                    onChange={(e) => updateStock(stock.code, "per", e.target.value)}
                  />
                </label>

                <label>
                  25日線
                  <input
                    inputMode="numeric"
                    value={stock.ma25}
                    onChange={(e) => updateStock(stock.code, "ma25", e.target.value)}
                  />
                </label>

                <hr />

                <label>
                  購入金額
                  <input
                    inputMode="numeric"
                    value={holding.amount}
                    onChange={(e) => updateHolding(stock.code, "amount", e.target.value)}
                  />
                </label>

                <label>
                  株数
                  <input
                    inputMode="numeric"
                    value={holding.shares}
                    onChange={(e) => updateHolding(stock.code, "shares", e.target.value)}
                  />
                </label>

                <label>
                  取得単価
                  <input
                    inputMode="decimal"
                    value={holding.price}
                    onChange={(e) => updateHolding(stock.code, "price", e.target.value)}
                  />
                </label>

                <label>
                  購入日
                  <input
                    type="date"
                    value={holding.date}
                    onChange={(e) => updateHolding(stock.code, "date", e.target.value)}
                  />
                </label>

                <label>
                  メモ
                  <textarea
                    maxLength={100}
                    value={holding.memo}
                    onChange={(e) => updateHolding(stock.code, "memo", e.target.value)}
                    placeholder="買った理由、注意点など"
                  />
                </label>
              </div>
            )
          })}

          <button className="reset" onClick={resetData}>
            保存データを初期化
          </button>
        </section>
      )}

      {tab === "log" && (
        <section className="list">
          <div className="card full">
            <h2>判断ログ</h2>
            <p>買い・利確・損切りを考えた記録を残します。</p>
          </div>

          {logs.length === 0 ? (
            <div className="card full">
              <p>まだ記録はありません。</p>
            </div>
          ) : (
            logs.map((log) => (
              <div className="card full" key={log.id}>
                <p className="label">{log.date}</p>
                <h3>{log.name}</h3>
                <p>{log.action}</p>
                <p>記録時価格: {yen(log.price)}</p>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "help" && (
        <section className="list">
          <div className="card full">
            <h2>このアプリの考え方</h2>
            <p>
              このアプリは、短期売買で感情的にならないための判断表です。
              上がっているから買う、下がって怖いから売る、を防ぎます。
            </p>
          </div>

          <div className="card full">
            <h2>色の意味</h2>
            <p style={{ color: "#00f5d4" }}>青緑: 買い候補。ただし少額だけ。</p>
            <p style={{ color: "#7CFF6B" }}>緑: 利確候補。利益を守る。</p>
            <p style={{ color: "#60a5fa" }}>青: 待ち。焦らない。</p>
            <p style={{ color: "#ffb703" }}>黄色: 注意。慎重に見る。</p>
            <p style={{ color: "#ff4d6d" }}>赤: 危険。買いより防御。</p>
          </div>

          <div className="card full">
            <h2>大切なルール</h2>
            <p>1回で80万円を全部使わない。</p>
            <p>利益が出たら一部売って守る。</p>
            <p>損が広がったら買い増しより確認。</p>
            <p>現金20万円は必ず残す。</p>
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

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
          background: rgba(5, 16, 32, .86);
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

        h2,
        h3 {
          margin: 0;
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
          position: sticky;
          top: 0;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          padding: 12px 0;
          background: rgba(2, 7, 19, .92);
          backdrop-filter: blur(10px);
        }

        .nav button {
          border: 1px solid rgba(120, 190, 220, .25);
          border-radius: 999px;
          padding: 10px 4px;
          color: #a9bfca;
          background: rgba(255, 255, 255, .05);
          font-size: 11px;
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
        .mainJudge {
          padding: 16px;
          border: 1px solid rgba(0, 220, 255, .25);
          border-radius: 20px;
          background: rgba(7, 18, 34, .86);
        }

        .mainJudge {
          border-width: 2px;
        }

        .mainJudge p,
        .label {
          margin: 0 0 8px;
          color: #8aa6b5;
          font-size: 12px;
        }

        .mainJudge h2 {
          font-size: 34px;
        }

        .mainJudge span {
          display: block;
          margin-top: 8px;
          color: #d7e9f0;
          font-size: 13px;
          line-height: 1.6;
        }

        .scoreLine {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
        }

        .scoreLine strong {
          font-size: 28px;
        }

        .bar {
          height: 8px;
          margin-top: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
          overflow: hidden;
        }

        .bar i {
          display: block;
          height: 100%;
          border-radius: 999px;
        }

        .card h3 {
          font-size: 22px;
        }

        .card small {
          display: block;
          margin-top: 6px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .plans,
        .signalGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .plans div,
        .signalGrid div {
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, .06);
        }

        .plans span,
        .signalGrid span {
          display: block;
          margin-top: 6px;
          color: #8fdfff;
          font-size: 12px;
          font-weight: bold;
        }

        .signalGrid b {
          font-size: 28px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .update {
          text-align: center;
          color: #7894a5;
          font-size: 12px;
        }

        .stockTop {
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

        .scoreBox {
          margin-top: 14px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,.05);
        }

        .scoreBox div:first-child {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .scoreBox span {
          color: #8aa6b5;
          font-size: 12px;
        }

        .scoreBox b {
          font-size: 28px;
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

        .message p,
        .card p {
          color: #d5e6ee;
          font-size: 13px;
          line-height: 1.7;
        }

        .actionBtns {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .actionBtns button {
          border: 1px solid rgba(0,220,255,.25);
          border-radius: 14px;
          padding: 10px 6px;
          color: white;
          background: rgba(255,255,255,.06);
          font-size: 12px;
          font-weight: bold;
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

        hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,.12);
          margin: 18px 0;
        }

        .reset {
          border: 1px solid rgba(255,77,109,.5);
          border-radius: 16px;
          padding: 14px;
          color: #ffdce0;
          background: rgba(120,0,20,.35);
          font-weight: 900;
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