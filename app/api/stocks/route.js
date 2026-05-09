export async function GET() {
  const symbols = ["5803.T", "5805.T", "6857.T", "^N225", "^VIX", "JPY=X"]

  try {
    const url =
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
      symbols.join(",")

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    const json = await res.json()
    const list = json.quoteResponse?.result || []

    return Response.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      data: list,
    })
  } catch (error) {
    return Response.json({
      ok: false,
      error: "market api failed",
      updatedAt: new Date().toISOString(),
      data: [],
    })
  }
}