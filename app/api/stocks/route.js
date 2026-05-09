export async function GET() {
  const symbols = ["5803.T", "5805.T", "6857.T", "^N225", "^VIX", "JPY=X"]

  try {
    const url =
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
      encodeURIComponent(symbols.join(","))

    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    })

    const json = await res.json()

    return Response.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      data: json.quoteResponse?.result || [],
    })
  } catch {
    return Response.json({
      ok: false,
      updatedAt: new Date().toISOString(),
      data: [],
    })
  }
}