"use client"

import React, { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "signal_os_bottom_nav_v1"

const TOTAL_CASH = 1000000
const INVEST_LIMIT = 800000
const KEEP_CASH = 200000

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
    memo: "AIデータセンター・通信インフラ需要の中心候補。",
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
    memo: "電力網・送電・データセンター需要に連動しやすい。",
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
    memo: "AI半導体相場の影響を受けやすい主力候補。",
  },
]

const EMPTY_HOLDINGS = {
  "5803": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静", buyRule: "ルール通り" },
  "5805": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静", buyRule: "ルール通り" },
  "6857": { shares: "", buyPrice: "", amount: "", memo: "", emotion: "冷静", buyRule: "ルール通り" },
}

const EMPTY_CHECKS = {
  "5803": { reason: false, cash: false, split: false, emotion: false, exit: false },
  "5805": { reason: false, cash: false, split: false, emotion: false, exit: false },
  "6857": { reason: false, cash: false, split: false, emotion: false, exit: false },
}

const TABS = [
  { id: "home", label: "HOME", short: "ホーム" },
  { id: "stock", label: "STOCK", short: "銘柄" },
  { id: "plan", label: "PLAN", short: "計画" },
  { id: "exec", label: "EXEC", short: "実行" },
  { id: "alert", label: "ALERT", short: "警告" },
  { id: "review", label: "REVIEW", short: "確認" },
  { id: "edit", label: "EDIT", short: "入力" },
  { id: "log", label: "LOG", short: "記録" },
]

function n(value) {
  return Number(value || 0)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function yen(value) {
  return n(value).toLocaleString("ja-JP") + "円"
}

function pct(value) {
  return n(value).toFixed(1) + "%"
}

function rate(now, base) {
  if (!now || !base) return 0
  return ((now - base) / base) * 100
}

function dev(price, ma) {
  if (!price || !ma) return 0
  return ((price - ma) / ma) * 100
}

function calcProfit(stock, holding) {
  const shares = n(holding.shares)
  const buyPrice = n(holding.buyPrice)
  const manualAmount = n(holding.amount)
  const currentPrice = n(stock.price)

  if (!shares || !buyPrice) {
    if (manualAmount > 0) {
      return { cost: manualAmount, value: manualAmount, profit: 0, rate: 0, has: false, estimated: true }
    }

    return { cost: 0, value: 0, profit: 0, rate: 0, has: false, estimated: false }
  }

  const cost = shares * buyPrice
  const value = shares * currentPrice
  const profit = value - cost
  const profitRate = cost ? (profit / cost) * 100 : 0

  return { cost, value, profit, rate: profitRate, has: true, estimated: false }
}

function getExitLines(holding) {
  const buy = n(holding.buyPrice)

  if (!buy) {
    return { stop8: 0, stop10: 0, profit15: 0, profit25: 0, profit35: 0, has: false }
  }

  return {
    stop8: Math.round(buy * 0.92),
    stop10: Math.round(buy * 0.9),
    profit15: Math.round(buy * 1.15),
    profit25: Math.round(buy * 1.25),
    profit35: Math.round(buy * 1.35),
    has: true,
  }
}

function getTechnical(stock) {
  const change = rate(n(stock.price), n(stock.prevClose))
  const deviation = dev(n(stock.price), n(stock.ma25))
  const rsiProxy = clamp(50 + change * 5 + deviation * 0.8, 5, 95)
  const trendScore = clamp(50 + change * 4 + deviation * 1.4 + (n(stock.volumeRate) - 1) * 15, 0, 100)

  let trend = "中立"
  if (trendScore >= 70) trend = "上向き"
  if (trendScore <= 35) trend = "弱い"

  let heat = "通常"
  if (rsiProxy >= 75 || deviation >= 15) heat = "過熱"
  if (rsiProxy <= 35 || change <= -5) heat = "押し目"

  return {
    change,
    deviation,
    rsiProxy: Math.round(rsiProxy),
    trendScore: Math.round(trendScore),
    trend,
    heat,
  }
}

function getLevelColor(level) {
  const colors = {
    buy: "#00f5d4",
    profit: "#7cff6b",
    wait: "#60a5fa",
    warning: "#ffb703",
    danger: "#ff4d6d",
    crash: "#c084fc",
    neutral: "#94a3b8",
    normal: "#94a3b8",
  }

  return colors[level] || colors.neutral
}

function getLevelBg(level) {
  const colors = {
    buy: "rgba(0,245,212,.16)",
    profit: "rgba(124,255,107,.15)",
    wait: "rgba(96,165,250,.15)",
    warning: "rgba(255,183,3,.16)",
    danger: "rgba(255,77,109,.18)",
    crash: "rgba(192,132,252,.18)",
    neutral: "rgba(148,163,184,.12)",
    normal: "rgba(148,163,184,.12)",
  }

  return colors[level] || colors.neutral
}

function getBuyStage(stock, invested) {
  const first = n(stock.plans[0])
  const second = n(stock.plans[1])
  const target = n(stock.target)

  if (invested <= 0) {
    return {
      stage: "第1回待機",
      nextAmount: first,
      progress: 0,
      text: "まだ入っていません。条件が良い時だけ第1回を検討。",
    }
  }

  if (invested < first) {
    return {
      stage: "第1回途中",
      nextAmount: Math.max(0, first - invested),
      progress: Math.min(100, (invested / target) * 100),
      text: "第1回の途中です。焦って追加しない。",
    }
  }

  if (invested < first + second) {
    return {
      stage: "第2回待機",
      nextAmount: Math.max(0, first + second - invested),
      progress: Math.min(100, (invested / target) * 100),
      text: "第2回は地合いと押し目を確認してから。",
    }
  }

  if (invested < target) {
    return {
      stage: "第3回待機",
      nextAmount: Math.max(0, target - invested),
      progress: Math.min(100, (invested / target) * 100),
      text: "最終追加は慎重。高値追いは禁止。",
    }
  }

  return {
    stage: "購入完了",
    nextAmount: 0,
    progress: 100,
    text: "予定額まで到達。追加より利確と管理を優先。",
  }
}

function makeRiskChecks(stock, holding, market, summary) {
  const profit = calcProfit(stock, holding)
  const tech = getTechnical(stock)
  const positionRate = summary.totalCost ? (profit.cost / summary.totalCost) * 100 : 0
  const risks = []

  if (market.mode === "crash") risks.push("市場が暴落監視モード")
  if (market.mode === "warning") risks.push("市場が警戒モード")
  if (tech.change >= 5) risks.push("短期で上がりすぎ")
  if (tech.deviation >= 15) risks.push("25日線から離れすぎ")
  if (tech.rsiProxy >= 75) risks.push("短期の過熱感が強い")
  if (n(stock.per) >= 35) risks.push("PERが高め")
  if (n(stock.volumeRate) < 1) risks.push("出来高が弱い")
  if (summary.cash < KEEP_CASH) risks.push("現金20万円ルールを割っている")
  if (positionRate >= 40) risks.push("1銘柄への集中度が高い")
  if (profit.has && profit.rate <= -8) risks.push("含み損が警戒ライン")
  if (holding.emotion === "焦り" || holding.emotion === "欲") risks.push("感情が強い状態")
  if (holding.buyRule === "ルール外") risks.push("自分の売買ルール外")

  return risks
}

function judgeStock(stock, holding, market, summary) {
  const profit = calcProfit(stock, holding)
  const tech = getTechnical(stock)
  const risks = makeRiskChecks(stock, holding, market, summary)

  if (market.mode === "crash") {
    return {
      label: "防御",
      level: "crash",
      score: 18,
      reason: "市場が荒れています。個別株よりも資金管理が優先です。",
      action: "買い急がない。現金を守る。",
      noBuyReasons: risks,
      permission: "買い禁止",
    }
  }

  if (profit.has && profit.rate >= 35) {
    return {
      label: "大きく利確",
      level: "profit",
      score: 92,
      reason: "利益が大きく出ています。短期売買では勝ちを残す場面です。",
      action: "多めに売って利益を守る。",
      noBuyReasons: risks,
      permission: "売り優先",
    }
  }

  if (profit.has && profit.rate >= 20) {
    return {
      label: "利確候補",
      level: "profit",
      score: 84,
      reason: "十分な利益が出ています。少し売って守る判断ができます。",
      action: "一部または半分利確。",
      noBuyReasons: risks,
      permission: "売り検討",
    }
  }

  if (profit.has && profit.rate <= -10) {
    return {
      label: "損切り検討",
      level: "danger",
      score: 16,
      reason: "損失が広がっています。買い増しより撤退判断を優先します。",
      action: "買った理由が崩れたなら損切り。",
      noBuyReasons: risks,
      permission: "追加禁止",
    }
  }

  if (tech.change >= 10 || tech.deviation >= 20 || tech.rsiProxy >= 82) {
    return {
      label: "危険",
      level: "danger",
      score: 22,
      reason: "上がりすぎです。高値づかみになりやすい場面です。",
      action: "今日は買わない。",
      noBuyReasons: risks,
      permission: "買い禁止",
    }
  }

  if (risks.length >= 3) {
    return {
      label: "買わない",
      level: "warning",
      score: 35,
      reason: "買わない理由が複数あります。守りを優先します。",
      action: "待機。次の押し目まで動かない。",
      noBuyReasons: risks,
      permission: "待機",
    }
  }

  if (tech.change <= -3 && tech.change >= -7 && n(stock.volumeRate) >= 1 && summary.cash >= KEEP_CASH) {
    return {
      label: "少額買い",
      level: "buy",
      score: 80,
      reason: "下げていますが、出来高があります。少額なら検討できます。",
      action: "予定額の一部だけ。全力買いは禁止。",
      noBuyReasons: risks,
      permission: "少額のみ",
    }
  }

  if (
    tech.change >= -5 &&
    tech.change <= 3 &&
    n(stock.volumeRate) >= 1.5 &&
    tech.deviation <= 10 &&
    summary.cash >= KEEP_CASH
  ) {
    return {
      label: "買い候補",
      level: "buy",
      score: 76,
      reason: "上がりすぎではなく、出来高もあります。",
      action: "第1回分の一部から入る候補。",
      noBuyReasons: risks,
      permission: "少額のみ",
    }
  }

  return {
    label: "様子見",
    level: "neutral",
    score: 55,
    reason: "強い買い理由も、強い危険サインもまだ弱いです。",
    action: "無理に動かない。現金保持もポジションです。",
    noBuyReasons: risks,
    permission: "待機",
  }
}

function getConclusion(summary, market) {
  if (market.mode === "crash") {
    return {
      label: "今日は防御",
      level: "crash",
      text: "市場が荒れています。新規買いよりも現金維持と損失管理が優先です。",
    }
  }

  if (summary.danger > 0) {
    return {
      label: "危険あり",
      level: "danger",
      text: "危険シグナルがあります。買いよりも、保有理由と損切りラインを確認します。",
    }
  }

  if (summary.sell > 0) {
    return {
      label: "利確確認",
      level: "profit",
      text: "利益が出ている銘柄があります。勝ちを残す判断を考えます。",
    }
  }

  if (summary.buy > 0) {
    return {
      label: "少額のみ検討",
      level: "buy",
      text: "買い候補があります。ただし一括ではなく、予定額の一部だけです。",
    }
  }

  return {
    label: "待機",
    level: "wait",
    text: "無理に動く必要はありません。現金保持も立派な投資判断です。",
  }
}

function getChecklistScore(check) {
  const keys = ["reason", "cash", "split", "emotion", "exit"]
  const ok = keys.filter((key) => check?.[key]).length
  return {
    ok,
    total: keys.length,
    passed: ok === keys.length,
  }
}

function createAlerts(stocks, holdings, market, summary) {
  const alerts = []

  if (market.mode === "crash") {
    alerts.push({
      level: "crash",
      title: "市場が荒れています",
      text: "今日は買いより防御。現金を守る日です。",
    })
  }

  if (summary.cash < KEEP_CASH) {
    alerts.push({
      level: "danger",
      title: "現金ルール違反",
      text: "現金20万円を下回っています。追加投資は止めます。",
    })
  }

  if (summary.totalCost > INVEST_LIMIT) {
    alerts.push({
      level: "danger",
      title: "投資上限オーバー",
      text: "投資額80万円を超えています。新規買いは禁止です。",
    })
  }

  stocks.forEach((stock) => {
    const holding = holdings[stock.code]
    const p = calcProfit(stock, holding)
    const exit = getExitLines(holding)
    const tech = getTechnical(stock)

    if (p.has && p.rate <= -10) {
      alerts.push({
        level: "danger",
        title: stock.name + " 損切りライン",
        text: "含み損が-10%を超えています。理由の再確認が必要です。",
      })
    } else if (p.has && p.rate <= -8) {
      alerts.push({
        level: "warning",
        title: stock.name + " 警戒ライン",
        text: "含み損が-8%付近です。買い増しは慎重に。",
      })
    }

    if (p.has && p.rate >= 25) {
      alerts.push({
        level: "profit",
        title: stock.name + " 利確候補",
        text: "利益が大きく出ています。半分利確も検討できます。",
      })
    } else if (p.has && p.rate >= 15) {
      alerts.push({
        level: "profit",
        title: stock.name + " 一部利確候補",
        text: "勝ちを残すため、一部利確を検討できます。",
      })
    }

    if (tech.change >= 10 || tech.deviation >= 20 || tech.rsiProxy >= 82) {
      alerts.push({
        level: "danger",
        title: stock.name + " 過熱",
        text: "短期で上がりすぎです。追いかけ買いは禁止。",
      })
    }

    if (holding.emotion === "焦り" || holding.emotion === "欲") {
      alerts.push({
        level: "warning",
        title: stock.name + " 感情注意",
        text: "焦りや欲が出ています。今日は買わない判断もありです。",
      })
    }

    if (exit.has && n(stock.price) <= exit.stop10) {
      alerts.push({
        level: "danger",
        title: stock.name + " 損切り価格到達",
        text: "設定した-10%ラインに到達しています。",
      })
    }
  })

  if (alerts.length === 0) {
    alerts.push({
      level: "neutral",
      title: "重大アラートなし",
      text: "大きなルール違反はありません。焦らず確認を続けます。",
    })
  }

  return alerts.slice(0, 8)
}

function createDailyActions(stocks, holdings, market, summary) {
  const actions = []

  if (market.mode === "crash") {
    actions.push("新規買いは止める")
    actions.push("現金20万円を守る")
    actions.push("含み損が大きい銘柄だけ確認")
    return actions
  }

  if (summary.sell > 0) actions.push("利確候補を確認する")
  if (summary.danger > 0) actions.push("危険銘柄の損切りラインを確認")
  if (summary.buy > 0 && summary.cash >= KEEP_CASH) actions.push("買うなら少額だけ")
  if (summary.buy === 0 && summary.sell === 0 && summary.danger === 0) actions.push("今日は待機でOK")

  actions.push("感情が焦りなら買わない")
  actions.push("実行前チェックを5つ確認")

  return actions.slice(0, 5)
}

function createReview(stocks, holdings, checks, logs, market, summary) {
  const review = []

  const cashOk = summary.cash >= KEEP_CASH
  const limitOk = summary.totalCost <= INVEST_LIMIT

  review.push({
    title: "資金管理",
    level: cashOk && limitOk ? "buy" : "danger",
    score: cashOk && limitOk ? 90 : 35,
    text: cashOk && limitOk
      ? "現金と投資上限は守れています。"
      : "現金または投資上限に注意が必要です。",
  })

  let best = { name: "-", cost: 0 }

  stocks.forEach((stock) => {
    const p = calcProfit(stock, holdings[stock.code])
    if (p.cost > best.cost) {
      best = {
        name: stock.name,
        cost: p.cost,
      }
    }
  })

  const concentration = summary.totalCost ? (best.cost / summary.totalCost) * 100 : 0

  review.push({
    title: "集中リスク",
    level: concentration >= 50 ? "warning" : "buy",
    score: concentration >= 50 ? 45 : 85,
    text: concentration >= 50
      ? best.name + " に資金が寄っています。追加は慎重に。"
      : "1銘柄への集中は大きすぎません。",
  })

  let checkTotal = 0
  let checkOk = 0

  Object.keys(checks).forEach((code) => {
    const s = getChecklistScore(checks[code])
    checkTotal += s.total
    checkOk += s.ok
  })

  const checkRate = checkTotal ? (checkOk / checkTotal) * 100 : 0

  review.push({
    title: "実行前チェック",
    level: checkRate >= 70 ? "buy" : "warning",
    score: Math.round(checkRate),
    text: checkRate >= 70
      ? "チェック習慣は良い状態です。"
      : "買う前の確認がまだ弱いです。",
  })

  const emotionalLogs = logs.filter((log) => log.emotion === "焦り" || log.emotion === "欲").length

  review.push({
    title: "感情管理",
    level: emotionalLogs === 0 ? "buy" : "warning",
    score: emotionalLogs === 0 ? 90 : 50,
    text: emotionalLogs === 0
      ? "焦りや欲による記録は少なめです。"
      : "焦りや欲のログがあります。次回の買いは慎重に。",
  })

  review.push({
    title: "市場姿勢",
    level: market.mode === "crash" || market.mode === "warning" ? "warning" : "neutral",
    score: market.mode === "normal" ? 75 : 45,
    text: market.mode === "normal"
      ? "市場は通常モード。個別銘柄の条件を確認します。"
      : "市場が荒れています。守り重視です。",
  })

  return review
}

export default function Page() {
  const [stocks, setStocks] = useState(BASE_STOCKS)
  const [holdings, setHoldings] = useState(EMPTY_HOLDINGS)
  const [checks, setChecks] = useState(EMPTY_CHECKS)
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState("home")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("")
  const [apiStatus, setApiStatus] = useState("未取得")
  const [apiSource, setApiSource] = useState("-")
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
      const parsed = JSON.parse(saved)

      if (parsed.holdings) {
        setHoldings({
          "5803": { ...EMPTY_HOLDINGS["5803"], ...parsed.holdings["5803"] },
          "5805": { ...EMPTY_HOLDINGS["5805"], ...parsed.holdings["5805"] },
          "6857": { ...EMPTY_HOLDINGS["6857"], ...parsed.holdings["6857"] },
        })
      }

      if (parsed.checks) {
        setChecks({
          "5803": { ...EMPTY_CHECKS["5803"], ...parsed.checks["5803"] },
          "5805": { ...EMPTY_CHECKS["5805"], ...parsed.checks["5805"] },
          "6857": { ...EMPTY_CHECKS["6857"], ...parsed.checks["6857"] },
        })
      }

      if (parsed.logs) setLogs(parsed.logs)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        holdings,
        checks,
        logs,
      })
    )
  }, [holdings, checks, logs])

  async function fetchMarket() {
    setLoading(true)

    try {
      const res = await fetch("/api/stocks", { cache: "no-store" })
      const json = await res.json()
      const data = json.data || []

      setApiSource(json.source || "-")

      if (!json.ok || data.length === 0) {
        setApiStatus("API取得失敗")
      } else {
        setApiStatus("API取得成功")
      }

      setStocks((prev) =>
        prev.map((stock) => {
          const found = data.find((item) => item.symbol === stock.symbol)

          if (!found) return stock

          const volume = found.regularMarketVolume || stock.volume
          const avgVolume =
            found.averageDailyVolume3Month ||
            found.averageDailyVolume10Day ||
            stock.volume

          return {
            ...stock,
            price: Math.round(found.regularMarketPrice || stock.price),
            prevClose: Math.round(found.regularMarketPreviousClose || stock.prevClose),
            volume,
            volumeRate: avgVolume
              ? Number(Math.max(0.1, volume / avgVolume).toFixed(1))
              : stock.volumeRate,
            per: found.trailingPE ? Number(found.trailingPE.toFixed(1)) : stock.per,
          }
        })
      )

      const nikkei = data.find((item) => item.symbol === "^N225")
      const vix = data.find((item) => item.symbol === "^VIX")
      const usd = data.find((item) => item.symbol === "JPY=X")

      const nikkeiRate = rate(
        n(nikkei?.regularMarketPrice),
        n(nikkei?.regularMarketPreviousClose)
      )

      const vixValue = n(vix?.regularMarketPrice)

      let mode = "normal"
      let label = "通常"
      let reason = "市場は通常モードです。"

      if (vixValue >= 30 || nikkeiRate <= -3) {
        mode = "crash"
        label = "暴落監視"
        reason = "市場が荒れています。攻めより防御。現金を守ります。"
      } else if (vixValue >= 22 || nikkeiRate <= -1.5) {
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
        nikkei: nikkei?.regularMarketPrice
          ? yen(Math.round(nikkei.regularMarketPrice))
          : "-",
        vix: vixValue || "-",
        usd: usd?.regularMarketPrice
          ? Number(usd.regularMarketPrice).toFixed(2)
          : "-",
      })

      setLastUpdate(new Date().toLocaleString("ja-JP"))
    } catch {
      setApiStatus("API取得失敗")
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

    stocks.forEach((stock) => {
      const p = calcProfit(stock, holdings[stock.code])
      totalCost += p.cost
      totalValue += p.value
      totalProfit += p.profit
    })

    const cash = Math.max(0, TOTAL_CASH - totalCost)
    const remain = Math.max(0, INVEST_LIMIT - totalCost)
    const profitRate = totalCost ? (totalProfit / totalCost) * 100 : 0

    return {
      totalCost,
      totalValue,
      totalProfit,
      profitRate,
      cash,
      remain,
    }
  }, [stocks, holdings])

  const fullSummary = useMemo(() => {
    let scoreTotal = 0
    let buy = 0
    let sell = 0
    let wait = 0
    let danger = 0
    let ruleAlerts = 0

    stocks.forEach((stock) => {
      const j = judgeStock(stock, holdings[stock.code], market, baseSummary)
      scoreTotal += j.score

      if (j.level === "buy") buy += 1
      if (j.level === "profit") sell += 1
      if (j.level === "neutral" || j.level === "wait" || j.level === "warning") wait += 1
      if (j.level === "danger" || j.level === "crash") danger += 1
      if (j.noBuyReasons.length >= 3) ruleAlerts += 1
    })

    return {
      ...baseSummary,
      score: Math.round(scoreTotal / stocks.length),
      buy,
      sell,
      wait,
      danger,
      ruleAlerts,
    }
  }, [stocks, holdings, market, baseSummary])

  const conclusion = useMemo(() => getConclusion(fullSummary, market), [fullSummary, market])
  const alerts = useMemo(() => createAlerts(stocks, holdings, market, fullSummary), [stocks, holdings, market, fullSummary])
  const dailyActions = useMemo(() => createDailyActions(stocks, holdings, market, fullSummary), [stocks, holdings, market, fullSummary])
  const review = useMemo(() => createReview(stocks, holdings, checks, logs, market, fullSummary), [stocks, holdings, checks, logs, market, fullSummary])

  function updateHolding(code, key, value) {
    setHoldings((prev) => ({
      ...prev,
      [code]: { ...prev[code], [key]: value },
    }))
  }

  function updateCheck(code, key) {
    setChecks((prev) => ({
      ...prev,
      [code]: { ...prev[code], [key]: !prev[code][key] },
    }))
  }

  function resetCheck(code) {
    setChecks((prev) => ({
      ...prev,
      [code]: { ...EMPTY_CHECKS[code] },
    }))
  }

  function updateStock(code, key, value) {
    setStocks((prev) =>
      prev.map((stock) => (stock.code === code ? { ...stock, [key]: value } : stock))
    )
  }

  function addLog(stock, action) {
    const h = holdings[stock.code]
    const p = calcProfit(stock, h)
    const j = judgeStock(stock, h, market, fullSummary)
    const checkScore = getChecklistScore(checks[stock.code])

    setLogs((prev) =>
      [
        {
          id: String(Date.now()),
          date: new Date().toLocaleString("ja-JP"),
          name: stock.name,
          code: stock.code,
          action,
          price: stock.price,
          profit: p.profit,
          judge: j.label,
          emotion: h.emotion,
          checklist: checkScore.ok + "/" + checkScore.total,
          memo: h.memo,
        },
        ...prev,
      ].slice(0, 50)
    )
  }

  function clearLogs() {
    const ok = window.confirm("ログを消しますか？")
    if (!ok) return
    setLogs([])
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

      <nav className="bottomNav">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "on" : ""}
            onClick={() => setTab(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.short}</small>
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <section className="grid">
          <div className="judge" style={{ borderColor: getLevelColor(conclusion.level) }}>
            <p className="label">TODAY</p>
            <h2 style={{ color: getLevelColor(conclusion.level) }}>{conclusion.label}</h2>
            <p>{conclusion.text}</p>
          </div>

          <div className="judge" style={{ borderColor: getLevelColor(market.mode) }}>
            <p className="label">MARKET MODE</p>
            <h2 style={{ color: getLevelColor(market.mode) }}>{market.label}</h2>
            <p>{market.reason}</p>
          </div>

          <Card title="SIGNAL SCORE" value={fullSummary.score} color="#00f5d4" />
          <Card title="投資額" value={yen(fullSummary.totalCost)} />
          <Card title="評価額" value={yen(fullSummary.totalValue)} />
          <Card
            title="損益"
            value={yen(fullSummary.totalProfit)}
            sub={pct(fullSummary.profitRate)}
            color={fullSummary.totalProfit >= 0 ? "#00f5d4" : "#ff4d6d"}
          />
          <Card title="現金目安" value={yen(fullSummary.cash)} />
          <Card title="残り投資枠" value={yen(fullSummary.remain)} />
          <Card title="日経平均" value={market.nikkei} />
          <Card title="VIX" value={market.vix} />
          <Card title="ドル円" value={market.usd} />

          <div className="card full">
            <p className="label">TODAY ACTION</p>
            {dailyActions.map((item, index) => (
              <div className="actionLine" key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </div>
            ))}
          </div>

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
            <div className="ruleBox">
              <Rule ok={fullSummary.cash >= KEEP_CASH} text="現金20万円ルール" />
              <Rule ok={fullSummary.totalCost <= INVEST_LIMIT} text="投資上限80万円ルール" />
              <Rule ok={fullSummary.ruleAlerts === 0} text="買わない理由が多すぎない" />
            </div>
          </div>

          <div className="card full">
            <p className="label">API STATUS</p>
            <h3>{apiStatus}</h3>
            <p>データ元: {apiSource}</p>
            <p>最終更新: {lastUpdate || "未更新"}</p>
          </div>
        </section>
      )}

      {tab === "stock" && (
        <section className="list">
          {stocks.map((stock) => {
            const holding = holdings[stock.code]
            const p = calcProfit(stock, holding)
            const j = judgeStock(stock, holding, market, fullSummary)
            const tech = getTechnical(stock)
            const exit = getExitLines(holding)

            return (
              <article className="stock" key={stock.code}>
                <div className="top">
                  <div>
                    <p className="code">{stock.code}</p>
                    <h2>{stock.name}</h2>
                    <p className="theme">{stock.theme}</p>
                  </div>
                  <div className="badge" style={{ color: getLevelColor(j.level), background: getLevelBg(j.level) }}>
                    {j.label}
                  </div>
                </div>

                <div className="score">
                  <span>SIGNAL SCORE</span>
                  <b style={{ color: getLevelColor(j.level) }}>{j.score}</b>
                </div>

                <div className="miniChart">
                  <div style={{ height: clamp(tech.trendScore, 8, 100) + "%" }} />
                  <div style={{ height: clamp(tech.rsiProxy, 8, 100) + "%" }} />
                  <div style={{ height: clamp(100 - Math.abs(tech.deviation), 8, 100) + "%" }} />
                  <div style={{ height: clamp(n(stock.volumeRate) * 30, 8, 100) + "%" }} />
                  <div style={{ height: clamp(j.score, 8, 100) + "%" }} />
                </div>

                <div className="metrics">
                  <Mini title="現在値" value={yen(stock.price)} />
                  <Mini title="前日比" value={pct(tech.change)} color={tech.change >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="出来高" value={n(stock.volume).toLocaleString("ja-JP")} />
                  <Mini title="出来高倍率" value={stock.volumeRate + "倍"} />
                  <Mini title="PER" value={stock.per + "倍"} />
                  <Mini title="25日線乖離" value={pct(tech.deviation)} color={tech.deviation >= 0 ? "#00f5d4" : "#ff4d6d"} />
                  <Mini title="RSI目安" value={tech.rsiProxy} />
                  <Mini title="トレンド" value={tech.trend} />
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
                    <ul>
                      {j.noBuyReasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  ) : (
                    <p>大きな禁止理由は少なめです。</p>
                  )}
                </div>

                <div className="card inner">
                  <p className="label">EXIT LINE</p>
                  {exit.has ? (
                    <div className="metrics">
                      <Mini title="-8%警戒" value={yen(exit.stop8)} color="#ffb703" />
                      <Mini title="-10%損切り" value={yen(exit.stop10)} color="#ff4d6d" />
                      <Mini title="+15%一部利確" value={yen(exit.profit15)} color="#7cff6b" />
                      <Mini title="+25%半分利確" value={yen(exit.profit25)} color="#7cff6b" />
                      <Mini title="+35%大きく利確" value={yen(exit.profit35)} color="#00f5d4" />
                    </div>
                  ) : (
                    <p>取得単価を入力すると、利確・損切りラインが出ます。</p>
                  )}
                </div>

                <div className="actions">
                  <button onClick={() => addLog(stock, "買い検討")}>買い検討</button>
                  <button onClick={() => addLog(stock, "利確検討")}>利確</button>
                  <button onClick={() => addLog(stock, "損切り検討")}>損切り</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "plan" && (
        <section className="list">
          <div className="card full">
            <h2>TRADE PLAN</h2>
            <p>一括買いを防ぎ、分割で入るためのページです。</p>
          </div>

          {stocks.map((stock) => {
            const holding = holdings[stock.code]
            const p = calcProfit(stock, holding)
            const stage = getBuyStage(stock, p.cost)
            const safeBuyCapacity = Math.max(0, fullSummary.cash - KEEP_CASH)
            const allowedBuy = Math.min(stage.nextAmount, safeBuyCapacity)

            return (
              <div className="card full" key={stock.code}>
                <p className="label">{stock.code}</p>
                <h2>{stock.name}</h2>
                <p>{stage.text}</p>

                <div className="bar">
                  <i style={{ width: stage.progress + "%" }} />
                </div>

                <div className="metrics">
                  <Mini title="現在投資額" value={yen(p.cost)} />
                  <Mini title="最終予定額" value={yen(stock.target)} />
                  <Mini title="次の購入目安" value={stage.nextAmount ? yen(stage.nextAmount) : "追加なし"} />
                  <Mini title="安全に買える上限" value={allowedBuy ? yen(allowedBuy) : "買わない"} />
                </div>
              </div>
            )
          })}
        </section>
      )}

      {tab === "exec" && (
        <section className="list">
          <div className="card full">
            <h2>EXECUTION CHECK</h2>
            <p>買う前に、5つ全部OKにならないなら原則待機。</p>
          </div>

          {stocks.map((stock) => {
            const check = checks[stock.code]
            const score = getChecklistScore(check)
            const holding = holdings[stock.code]
            const j = judgeStock(stock, holding, market, fullSummary)

            return (
              <div className="card full" key={stock.code}>
                <p className="label">{stock.code}</p>
                <h2>{stock.name}</h2>

                <div className="execStatus" style={{ borderColor: score.passed ? "#00f5d4" : "#ffb703" }}>
                  <b style={{ color: score.passed ? "#00f5d4" : "#ffb703" }}>
                    {score.passed ? "実行OK" : "まだ待機"}
                  </b>
                  <span>{score.ok}/{score.total}</span>
                </div>

                <CheckItem checked={check.reason} onClick={() => updateCheck(stock.code, "reason")} text="買う理由を言葉で説明できる" />
                <CheckItem checked={check.cash} onClick={() => updateCheck(stock.code, "cash")} text="現金20万円ルールを守れる" />
                <CheckItem checked={check.split} onClick={() => updateCheck(stock.code, "split")} text="一括ではなく分割で買う" />
                <CheckItem checked={check.emotion} onClick={() => updateCheck(stock.code, "emotion")} text="焦り・欲ではなく冷静" />
                <CheckItem checked={check.exit} onClick={() => updateCheck(stock.code, "exit")} text="利確・損切りラインを決めた" />

                <div className="message">
                  <b>現在の判定</b>
                  <p>{j.label} / {j.permission}</p>
                  <p>{j.action}</p>
                </div>

                <div className="actions">
                  <button onClick={() => addLog(stock, "実行前チェック")}>チェック記録</button>
                  <button onClick={() => resetCheck(stock.code)}>リセット</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {tab === "edit" && (
        <section className="list">
          <div className="card full">
            <h2>EDIT</h2>
            <p>保有情報・感情・手入力データを編集します。</p>
          </div>

          {stocks.map((stock) => {
            const h = holdings[stock.code]

            return (
              <div className="card full" key={stock.code}>
                <p className="label">{stock.code}</p>
                <h2>{stock.name}</h2>

                <label>
                  株数
                  <input inputMode="numeric" value={h.shares} onChange={(e) => updateHolding(stock.code, "shares", e.target.value)} />
                </label>

                <label>
                  取得単価
                  <input inputMode="numeric" value={h.buyPrice} onChange={(e) => updateHolding(stock.code, "buyPrice", e.target.value)} />
                </label>

                <label>
                  購入額
                  <input inputMode="numeric" value={h.amount} onChange={(e) => updateHolding(stock.code, "amount", e.target.value)} />
                </label>

                <label>
                  感情
                  <select value={h.emotion} onChange={(e) => updateHolding(stock.code, "emotion", e.target.value)}>
                    <option>冷静</option>
                    <option>焦り</option>
                    <option>恐怖</option>
                    <option>欲</option>
                    <option>ルール通り</option>
                  </select>
                </label>

                <label>
                  売買ルール
                  <select value={h.buyRule} onChange={(e) => updateHolding(stock.code, "buyRule", e.target.value)}>
                    <option>ルール通り</option>
                    <option>ルール外</option>
                    <option>確認中</option>
                  </select>
                </label>

                <label>
                  メモ
                  <textarea value={h.memo} maxLength={120} onChange={(e) => updateHolding(stock.code, "memo", e.target.value)} placeholder="買った理由、怖い理由、売る条件など" />
                </label>

                <div className="manual">
                  <p className="label">手入力モード</p>

                  <label>
                    現在値
                    <input inputMode="numeric" value={stock.price} onChange={(e) => updateStock(stock.code, "price", e.target.value)} />
                  </label>

                  <label>
                    前日終値
                    <input inputMode="numeric" value={stock.prevClose} onChange={(e) => updateStock(stock.code, "prevClose", e.target.value)} />
                  </label>

                  <label>
                    出来高倍率
                    <input inputMode="decimal" value={stock.volumeRate} onChange={(e) => updateStock(stock.code, "volumeRate", e.target.value)} />
                  </label>

                  <label>
                    PER
                    <input inputMode="decimal" value={stock.per} onChange={(e) => updateStock(stock.code, "per", e.target.value)} />
                  </label>

                  <label>
                    25日線
                    <input inputMode="numeric" value={stock.ma25} onChange={(e) => updateStock(stock.code, "ma25", e.target.value)} />
                  </label>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {tab === "alert" && (
        <section className="list">
          <div className="card full">
            <h2>ALERT CENTER</h2>
            <p>今見るべき注意点だけをまとめます。</p>
          </div>

          {alerts.map((alert, index) => (
            <div className="alertCard" key={index} style={{ borderColor: getLevelColor(alert.level) }}>
              <p className="label">ALERT</p>
              <h3 style={{ color: getLevelColor(alert.level) }}>{alert.title}</h3>
              <p>{alert.text}</p>
            </div>
          ))}
        </section>
      )}

      {tab === "review" && (
        <section className="list">
          <div className="card full">
            <h2>REVIEW</h2>
            <p>売買のクセ、資金管理、感情状態を確認します。</p>
          </div>

          {review.map((item) => (
            <div className="reviewCard" key={item.title} style={{ borderColor: getLevelColor(item.level) }}>
              <div>
                <p className="label">{item.title}</p>
                <h3>{item.text}</h3>
              </div>
              <b style={{ color: getLevelColor(item.level) }}>{item.score}</b>
            </div>
          ))}

          <div className="card full">
            <h2>改善メモ</h2>
            <p>1. 買う前にEXECを確認する。</p>
            <p>2. ALERTが赤なら買わない。</p>
            <p>3. 利確候補が出たら、少し売る選択肢を持つ。</p>
            <p>4. 感情が「焦り」「欲」の日は待機。</p>
          </div>
        </section>
      )}

      {tab === "log" && (
        <section className="list">
          <div className="card full">
            <h2>判断ログ</h2>
            <p>買い・利確・損切りを考えた理由を残します。</p>
            <button className="dangerBtn" onClick={clearLogs}>ログを削除</button>
          </div>

          {logs.length === 0 ? (
            <div className="card">記録なし</div>
          ) : (
            logs.map((log) => (
              <div className="card" key={log.id}>
                <p className="label">{log.date}</p>
                <h3>{log.name}</h3>
                <p>{log.action} / {yen(log.price)}</p>
                <p>判定: {log.judge}</p>
                <p>感情: {log.emotion}</p>
                <p>チェック: {log.checklist || "-"}</p>
                <p>損益: {yen(log.profit)}</p>
                {log.memo ? <p>メモ: {log.memo}</p> : null}
              </div>
            ))
          )}
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .app {
          min-height: 100vh;
          padding: 18px 14px calc(170px + env(safe-area-inset-bottom));
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
          margin-bottom: 14px;
          border: 1px solid rgba(0, 220, 255, .35);
          border-radius: 22px;
          background: rgba(5, 16, 32, .9);
          box-shadow: 0 0 22px rgba(0, 220, 255, .08);
        }

        .sub,
        .label {
          margin: 0 0 8px;
          color: #8aa6b5;
          font-size: 12px;
          letter-spacing: .08em;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          letter-spacing: .05em;
        }

        h2,
        h3 {
          margin: 0;
        }

        .hero p {
          color: #b7cad8;
          font-size: 13px;
        }

        .hero button,
        .actions button,
        .dangerBtn {
          border: 1px solid rgba(0, 220, 255, .35);
          border-radius: 999px;
          padding: 11px 14px;
          color: white;
          background: rgba(255, 255, 255, .06);
          font-weight: bold;
        }

        .bottomNav {
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: calc(10px + env(safe-area-inset-bottom));
          z-index: 50;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          padding: 10px;
          border: 1px solid rgba(0, 220, 255, .28);
          border-radius: 24px;
          background: rgba(3, 10, 22, .92);
          backdrop-filter: blur(16px);
          box-shadow: 0 0 28px rgba(0, 220, 255, .14);
        }

        .bottomNav button {
          display: grid;
          gap: 2px;
          place-items: center;
          min-height: 46px;
          border: 1px solid rgba(120, 190, 220, .25);
          border-radius: 16px;
          color: #a9bfca;
          background: rgba(255, 255, 255, .05);
          font-weight: 900;
        }

        .bottomNav button span {
          font-size: 10px;
          letter-spacing: .08em;
        }

        .bottomNav button small {
          font-size: 9px;
          opacity: .8;
        }

        .bottomNav .on {
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
        .judge,
        .alertCard,
        .reviewCard {
          padding: 16px;
          border: 1px solid rgba(0, 220, 255, .25);
          border-radius: 20px;
          background: rgba(7, 18, 34, .86);
        }

        .inner {
          margin-top: 14px;
          background: rgba(255, 255, 255, .04);
        }

        .judge,
        .alertCard,
        .reviewCard {
          border-width: 2px;
        }

        .judge h2 {
          font-size: 34px;
        }

        .judge p,
        .card p,
        .alertCard p {
          color: #d7e9f0;
          font-size: 13px;
          line-height: 1.6;
        }

        .full {
          grid-column: 1 / -1;
        }

        .signals {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .signals div {
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, .06);
        }

        .signals b {
          font-size: 28px;
        }

        .signals span {
          display: block;
          font-size: 12px;
          color: #8fdfff;
        }

        .actionLine {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .actionLine b {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(0,245,212,.16);
          color: #00f5d4;
        }

        .actionLine span {
          color: #d7e9f0;
          font-size: 13px;
        }

        .ruleBox {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .rule {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          color: #d7e9f0;
          font-size: 13px;
        }

        .ok {
          color: #00f5d4;
          font-weight: bold;
        }

        .ng {
          color: #ff4d6d;
          font-weight: bold;
        }

        .top {
          display: grid;
          grid-template-columns: 1fr 120px;
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

        .badge {
          padding: 12px;
          border-radius: 16px;
          text-align: center;
          font-size: 18px;
          font-weight: 900;
        }

        .score {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, .05);
        }

        .score span {
          color: #8aa6b5;
          font-size: 12px;
        }

        .score b {
          font-size: 28px;
        }

        .miniChart {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: end;
          gap: 8px;
          height: 70px;
          margin-top: 14px;
          padding: 10px;
          border-radius: 16px;
          background: rgba(255,255,255,.05);
        }

        .miniChart div {
          border-radius: 999px 999px 4px 4px;
          background: linear-gradient(180deg, #00f5d4, rgba(0,245,212,.25));
          min-height: 8px;
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
          background: #00f5d4;
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
        .message li {
          color: #d5e6ee;
          font-size: 13px;
          line-height: 1.7;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .actions button {
          font-size: 12px;
          border-radius: 14px;
        }

        .dangerBtn {
          border-color: rgba(255,77,109,.5);
          color: #ffdce0;
          background: rgba(120,0,20,.35);
          margin-top: 10px;
        }

        .execStatus {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 14px 0;
          padding: 14px;
          border: 1px solid;
          border-radius: 16px;
          background: rgba(255,255,255,.04);
        }

        .checkItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border: 1px solid rgba(0, 220, 255, .2);
          border-radius: 14px;
          color: white;
          background: rgba(255,255,255,.05);
          text-align: left;
        }

        .checkItem b {
          color: #00f5d4;
        }

        .reviewCard {
          display: grid;
          grid-template-columns: 1fr 56px;
          gap: 12px;
          align-items: center;
        }

        .reviewCard b {
          font-size: 28px;
          text-align: right;
        }

        .manual {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.1);
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
        textarea,
        select {
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

          .bottomNav {
            max-width: 560px;
            left: 50%;
            transform: translateX(-50%);
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

function Rule({ ok, text }) {
  return (
    <div className="rule">
      <span>{text}</span>
      <b className={ok ? "ok" : "ng"}>{ok ? "OK" : "注意"}</b>
    </div>
  )
}

function CheckItem({ checked, onClick, text }) {
  return (
    <button className="checkItem" onClick={onClick}>
      <span>{text}</span>
      <b>{checked ? "OK" : "未確認"}</b>
    </button>
  )
}