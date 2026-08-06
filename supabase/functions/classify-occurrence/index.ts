// SIFAU — Edge Function: classify-occurrence
// Chama a API do Google Gemini (gemini-1.5-flash — gratuita, 1.500 req/dia)
// para classificar categoria, urgência e detectar possível duplicata.
// Retorna JSON estruturado.
// Se GEMINI_API_KEY não estiver configurada, usa heurística local (stub)
// para o app continuar funcional em desenvolvimento.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CATEGORIES = [
  "Buraco na via",
  "Poluição sonora",
  "Comércio irregular",
  "Descarte irregular de lixo",
  "Obra sem alvará",
  "Iluminação pública",
  "Sinalização",
  "Esgoto / Drenagem",
  "Outro",
];

interface ClassifyBody {
  description: string;
  category?: string;
  lat?: number;
  lng?: number;
  nearbyOccurrences?: Array<{ id: string; category: string; description: string; distance_m: number }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ClassifyBody = await req.json();
    const { description, category, lat, lng, nearbyOccurrences = [] } = body;

    if (!description || description.length < 5) {
      return new Response(
        JSON.stringify({ error: "Descrição muito curta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    let result;

    if (apiKey) {
      result = await classifyWithGemini(apiKey, description, category, nearbyOccurrences);
    } else {
      result = classifyWithHeuristic(description, category, lat, lng, nearbyOccurrences);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno na classificação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function classifyWithGemini(
  apiKey: string,
  description: string,
  category: string | undefined,
  nearby: ClassifyBody["nearbyOccurrences"]
) {
  const nearbyText = nearby.length
    ? nearby.map((n) => `- id:${n.id} | cat:${n.category} | dist:${Math.round(n.distance_m)}m | "${n.description.slice(0, 120)}"`).join("\n")
    : "Nenhuma ocorrência próxima.";

  const prompt = `Você é o classificador automático do SIFAU, sistema municipal de fiscalização urbana. Analise a descrição de uma ocorrência e retorne APENAS JSON válido (sem markdown, sem texto extra) com esta estrutura:
{
  "category": "<uma de: ${CATEGORIES.join(", ")}>",
  "subcategory": "<string ou null>",
  "urgency": <1 a 4, onde 1=baixa, 4=crítica>,
  "confidence": <0 a 1>,
  "duplicate_suspected": <true|false>,
  "duplicate_of": "<id da ocorrência próxima se for duplicata, senão null>",
  "rationale": "<justificativa curta em português>"
}
Critérios de urgência: 4=risco imediato à vida/trânsito (ex: buraco profundo em via rápida); 3=risco alto (ex: obra sem alvará em via movimentada); 2=médio (ex: lixo irregular); 1=baixo (ex: lâmpada queimada). Marque duplicate_suspected=true apenas se houver ocorrência próxima (até 100m) que descreva o MESMO problema.

Descrição do cidadão: "${description}"
Categoria sugerida pelo cidadão: ${category || "nenhuma"}
Ocorrências abertas próximas (100m, últimos 30 dias):
${nearbyText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = safeParseJSON(text);
  if (!parsed) {
    return classifyWithHeuristic(description, category, undefined, undefined, nearby);
  }
  return normalize(parsed, nearby);
}

function classifyWithHeuristic(
  description: string,
  category: string | undefined,
  _lat: number | undefined,
  _lng: number | undefined,
  nearby: ClassifyBody["nearbyOccurrences"]
) {
  const d = description.toLowerCase();
  let cat = category || "Outro";
  if (!category) {
    if (/(buraco|cratera|asfalto|pista|via|rua).*(esburac|defeito)/.test(d) || /buraco/.test(d)) cat = "Buraco na via";
    else if (/(barulho|som|música|alta|ruído|poluição sonora)/.test(d)) cat = "Poluição sonora";
    else if (/(comércio|loja|ambulante|vendedor|calçada)/.test(d)) cat = "Comércio irregular";
    else if (/(lixo|entulho|descarte|resíduo)/.test(d)) cat = "Descarte irregular de lixo";
    else if (/(obra|construção|alvará|reforma|demolição)/.test(d)) cat = "Obra sem alvará";
    else if (/(lâmpada|luminária|poste|iluminação|luz)/.test(d)) cat = "Iluminação pública";
    else if (/(sinal|placa|faixa|semáforo)/.test(d)) cat = "Sinalização";
    else if (/(esgoto|drenagem|alagamento|vazamento)/.test(d)) cat = "Esgoto / Drenagem";
  }

  let urgency: 1 | 2 | 3 | 4 = 2;
  if (/(urgente|risco|perigo|criança|idoso|acidente|trânsito rápido|avenida|rodovia)/.test(d)) urgency = 4;
  else if (/(alto|grave|obstrui|calçada|via movimentada)/.test(d)) urgency = 3;
  else if (/(médio|moderado)/.test(d)) urgency = 2;
  else urgency = 1;

  const dup = nearby.find((n) => n.distance_m <= 100 && n.category === cat && textSimilar(n.description, description) > 0.5);

  return normalize({
    category: cat,
    subcategory: null,
    urgency,
    confidence: 0.6,
    duplicate_suspected: !!dup,
    duplicate_of: dup?.id ?? null,
    rationale: "Classificação heurística (sem API do Gemini configurada).",
  }, nearby);
}

function normalize(r: Record<string, unknown>, _nearby: ClassifyBody["nearbyOccurrences"]) {
  return {
    category: String(r.category ?? "Outro"),
    subcategory: r.subcategory ? String(r.subcategory) : null,
    urgency: Math.min(4, Math.max(1, Number(r.urgency ?? 2))) as 1 | 2 | 3 | 4,
    confidence: Math.min(1, Math.max(0, Number(r.confidence ?? 0.6))),
    duplicate_suspected: Boolean(r.duplicate_suspected),
    duplicate_of: r.duplicate_of ? String(r.duplicate_of) : null,
    rationale: String(r.rationale ?? ""),
  };
}

function safeParseJSON(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function textSimilar(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return (2 * inter) / (wa.size + wb.size);
}
