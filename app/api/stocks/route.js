const SYMBOLS = ["5803.T", "5805.T", "6857.T", "^N225", "^VIX", "JPY=X"]

const FALLBACK_QUOTES = {
  "5803.T": {
    symbol: "5803.T",
    regularMarketPrice: 6500,
    regularMarketPreviousClose: 6680,
    regularMarketVolume: 4300000,
    averageDailyVolume3Month: 3600000,
    trailingPE: 22.5,
  },
  "5805.T": {
    symbol: "5805.T",
    regularMarketPrice: 8200,
    regularMarketPreviousClose: 8350,
    regularMarketVolume: 680000,
    averageDailyVolume3Month: 600000,
    trailingPE: 18.2,
  },
  "6857.T": {
    symbol: "6857.T",
    regularMarketPrice: 9800,
    regularMarketPreviousClose: 9450,
    regularMarketVolume: 9200000,
    averageDailyVolume3Month: 8200000,
    trailingPE: 35.6,
  },
  "^N225": {
    symbol: "^N225",
    regularMarketPrice: 38500,
    regularMarketPreviousClose: 38200,
  },
  "^VIX": {
    symbol: "^VIX",
    regularMarketPrice: 18.5,
    regularMarketPreviousClose: 17.8,
  },
  "JPY=X": {
    symbol: "JPY=X",
    regularMarketPrice: 155.2,
    regularMarketPreviousClose: 154.8,
  },
}

export async function GET() {
  let source = "fallback"
  let result = []

  try {
    const url =
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
      SYMBOLS.map((s) => encodeURIComponent(s)).join(",")

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    })

    if (!res.ok) {
      throw new Error("Yahoo response was not ok")
    }

    const json = await res.json()
    result = json.quoteResponse?.result || []

    if (result.length > 0) {
      source = "yahoo"
    }
  } catch {
    result = []
  }

  const merged = SYMBOLS.map((symbol) => {
    const found = result.find((item) => item.symbol === symbol)
    return found || FALLBACK_QUOTES[symbol]
  })

  return Response.json({
    ok: true,
    source,
    updatedAt: new Date().toISOString(),
    data: merged,
  })
}