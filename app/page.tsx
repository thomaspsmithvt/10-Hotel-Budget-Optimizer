"use client";

import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/* Tiny UI helpers (no extra deps) */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
function Card({ className="", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("bg-white border rounded-2xl", className)} {...props} />;
}
function CardContent({ className="", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-4", className)} {...props} />;
}
function Button({
  className = "",
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"secondary"|"ghost"; size?: "sm"|"md"|"lg"|"icon" }) {
  const v =
    variant === "secondary"
      ? "bg-white text-gray-900 border"
      : variant === "ghost"
      ? "bg-transparent text-gray-700 hover:bg-gray-100"
      : "bg-blue-600 text-white hover:bg-blue-700";
  const s =
    size === "sm" ? "px-3 py-1.5 text-sm" : size === "lg" ? "px-5 py-3" : size === "icon" ? "p-2" : "px-4 py-2";
  return <button className={cx(v, s, "rounded-2xl shadow-sm transition", className)} {...props} />;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500", props.className || "")} />;
}
function Label({ className="", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("text-sm text-gray-700", className)} {...props} />;
}
function Slider({ value, onChange, max=100, step=1 }: { value:number; onChange:(v:number)=>void; max?:number; step?:number }) {
  return <input type="range" min={0} max={max} step={step} value={value} onChange={(e)=> onChange(Number(e.target.value))} className="w-full" />;
}
function Switch({ checked, onChange }: { checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e)=> onChange(e.target.checked)} />
      <span className={cx("w-10 h-6 flex items-center rounded-full p-1 transition", checked? "bg-blue-600":"bg-gray-300")}>
        <span className={cx("bg-white w-4 h-4 rounded-full transform transition", checked? "translate-x-4":"translate-x-0")} />
      </span>
    </label>
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx("w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500", props.className || "")} />;
}

/* Types */
type Objective = "auto" | "roas" | "revenue" | "adr" | "occupancy" | "awareness";
type Channel = {
  id: string;
  name: string;
  baseROAS: number;
  saturationSpend: number;
  minSpend: number;
  maxSpend: number;
  minPercent: number;
  maxPercent: number;
  incrementality: number;
  affectedByContent?: boolean;
  adrUplift?: number;
  occUplift?: number;
  awarenessScore?: number;
  enabled: boolean;
};

/* Defaults */
const DEFAULT_CHANNELS: Channel[] = [
  { id: "paid_search_nonbrand", name: "Paid Search (Non-Brand)", baseROAS: 4.0, saturationSpend: 50000, minSpend: 0, maxSpend: 999999, minPercent: 0,   maxPercent: 1,    incrementality: 0.9, affectedByContent: false, adrUplift: 0.9, occUplift: 1.0, awarenessScore: 0.6, enabled: true },
  { id: "paid_search_brand",   name: "Paid Search (Brand)",     baseROAS: 7.0, saturationSpend: 15000, minSpend: 0, maxSpend: 30000,  minPercent: 0,   maxPercent: 0.25, incrementality: 0.4, affectedByContent: false, adrUplift: 0.7, occUplift: 0.7, awarenessScore: 0.2, enabled: true },
  { id: "metasearch",          name: "Metasearch",              baseROAS: 6.0, saturationSpend: 30000, minSpend: 0, maxSpend: 80000,  minPercent: 0.05,maxPercent: 0.35, incrementality: 0.8, affectedByContent: false, adrUplift: 0.8, occUplift: 0.9, awarenessScore: 0.4, enabled: true },
  { id: "paid_social",         name: "Paid Social",             baseROAS: 3.0, saturationSpend: 40000, minSpend: 0, maxSpend: 120000, minPercent: 0,   maxPercent: 0.5,  incrementality: 0.85,affectedByContent: true,  adrUplift: 1.1, occUplift: 1.0, awarenessScore: 1.2, enabled: true },
  { id: "ott_ctv",             name: "OTT / CTV",               baseROAS: 2.5, saturationSpend: 80000, minSpend: 0, maxSpend: 200000, minPercent: 0,   maxPercent: 0.6,  incrementality: 0.6, affectedByContent: true,  adrUplift: 1.0, occUplift: 0.9, awarenessScore: 1.4, enabled: true },
  { id: "programmatic",        name: "Programmatic Display/Video", baseROAS: 2.2, saturationSpend: 50000, minSpend: 0, maxSpend: 150000, minPercent: 0, maxPercent: 0.5,  incrementality: 0.7, affectedByContent: true,  adrUplift: 1.0, occUplift: 1.0, awarenessScore: 1.0, enabled: true },
  { id: "influencers",         name: "Influencers / UGC",       baseROAS: 2.0, saturationSpend: 25000, minSpend: 0, maxSpend: 60000,  minPercent: 0,   maxPercent: 0.25, incrementality: 0.6, affectedByContent: true,  adrUplift: 1.1, occUplift: 0.9, awarenessScore: 1.3, enabled: true },
  { id: "email_crm",           name: "Email / CRM",             baseROAS: 8.0, saturationSpend: 10000, minSpend: 0, maxSpend: 40000,  minPercent: 0,   maxPercent: 0.2,  incrementality: 0.3, affectedByContent: false, adrUplift: 0.9, occUplift: 0.8, awarenessScore: 0.2, enabled: true },
  { id: "content",             name: "Content Production (Assist)", baseROAS: 0.8, saturationSpend: 40000, minSpend: 0, maxSpend: 100000, minPercent: 0, maxPercent: 0.25, incrementality: 0.2, affectedByContent: false, adrUplift: 1.0, occUplift: 1.0, awarenessScore: 1.2, enabled: true },
];

/* Model + optimizer */
const LN05 = -Math.log(0.05);
function paramsFromChannel(ch: Channel, contentLiftFactor: number, seasonalityFactor: number) {
  const k = (ch.saturationSpend > 0 ? LN05 / ch.saturationSpend : 0.00001) || 0.00001;
  const liftedBase = ch.affectedByContent ? ch.baseROAS * (1 + contentLiftFactor) : ch.baseROAS;
  const A = (liftedBase / k) * Math.max(0.1, seasonalityFactor);
  return { A, k };
}
function revenueForSpend(spend: number, ch: Channel, contentLiftFactor: number, seasonalityFactor: number) {
  const { A, k } = paramsFromChannel(ch, contentLiftFactor, seasonalityFactor);
  return A * (1 - Math.exp(-k * spend));
}
function marginalRevenue(spend: number, step: number, ch: Channel, contentLiftFactor: number, seasonalityFactor: number) {
  const r1 = revenueForSpend(spend, ch, contentLiftFactor, seasonalityFactor);
  const r2 = revenueForSpend(spend + step, ch, contentLiftFactor, seasonalityFactor);
  return r2 - r1;
}
function currencyFmt(n: number, symbol: string) {
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function optimizeAllocation({
  channels, totalBudget, step, contentLiftPer10k, objective, seasonality,
}:{
  channels: Channel[]; totalBudget: number; step: number; contentLiftPer10k: number; objective: Objective; seasonality: number[];
}){
  const enabled = channels.filter(c=>c.enabled);
  const alloc: Record<string, number> = Object.fromEntries(
    enabled.map(c=> [c.id, Math.min(c.maxSpend, Math.max(c.minSpend, Math.max(c.minPercent*totalBudget, 0)))])
  );
  let spent = Object.values(alloc).reduce((a,b)=>a+b,0);

  const maxBudgetById: Record<string, number> = Object.fromEntries(enabled.map(c=> [c.id, Math.min(c.maxSpend, Math.max(0, c.maxPercent*totalBudget || Infinity))]));
  const contentId = enabled.find(c=> c.id==="content")?.id;
  const budgetLeft = ()=> Math.max(0, totalBudget - spent);
  const contentSpend = ()=> (contentId? (alloc[contentId]||0) : 0);
  const liftFactor = ()=> (contentLiftPer10k>0? (contentSpend()/10000)*contentLiftPer10k : 0);

  const selectedMonths = seasonality.filter(m=> m>0);
  const seasonalityFactor = selectedMonths.length? selectedMonths.reduce((a,b)=>a+b,0)/selectedMonths.length : 1;

  let guard=0;
  while (budgetLeft() >= step && guard < 2_000_000){
    guard++;
    let bestId: string | null = null;
    let bestValue = -Infinity;
    const lf = liftFactor();

    for (const ch of enabled){
      const current = alloc[ch.id]||0;
      if (current + step > maxBudgetById[ch.id]) continue;

      let m = marginalRevenue(current, step, ch, lf, seasonalityFactor) * ch.incrementality;
      if (objective === "adr") m *= ch.adrUplift ?? 1;
      else if (objective === "occupancy") m *= ch.occUplift ?? 1;
      else if (objective === "awareness") m *= ch.awarenessScore ?? 1;
      else if (objective === "roas") m = m / Math.max(step,1);

      if (m>bestValue){ bestValue = m; bestId = ch.id; }
    }
    if (!bestId || !isFinite(bestValue) || bestValue <= 0) break;
    alloc[bestId] = (alloc[bestId]||0) + step;
    spent += step;
  }

  const lf = liftFactor();
  const rows = enabled.map(ch=>{
    const spend = alloc[ch.id]||0;
    const rev = revenueForSpend(spend, ch, lf, seasonalityFactor);
    const incrRev = rev * ch.incrementality;
    const roas = spend>0 ? incrRev/spend : 0;
    return { id: ch.id, name: ch.name, spend, revenue: incrRev, roas };
  });
  const totals = rows.reduce((acc,r)=>({ spend: acc.spend + r.spend, revenue: acc.revenue + r.revenue }), { spend: 0, revenue: 0 });
  return { rows, totals };
}

/* UI */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Page(){
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [totalBudget, setTotalBudget] = useState<number>(250000);
  const [step, setStep] = useState<number>(1000);
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");
  const [contentLiftPer10k, setContentLiftPer10k] = useState<number>(0.05);
  const [objective, setObjective] = useState<Objective>("auto");
  const [seasonality, setSeasonality] = useState<number[]>(Array(12).fill(1));
  const [activeMonths, setActiveMonths] = useState<boolean[]>(Array(12).fill(true));
  const [website, setWebsite] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const seasonalityForCalc = seasonality.map((v,i)=> activeMonths[i]? v : 0);
  const { rows, totals } = useMemo(()=> optimizeAllocation({ channels, totalBudget, step, contentLiftPer10k, objective, seasonality: seasonalityForCalc }), [channels,totalBudget,step,contentLiftPer10k,objective,seasonalityForCalc]);
  const chartData = rows.map(r=> ({ name: r.name, Spend: Math.round(r.spend), Revenue: Math.round(r.revenue) }));

  const handleChannelChange = (id: string, patch: Partial<Channel>) => setChannels(prev=> prev.map(c=> c.id===id? { ...c, ...patch } : c));
  const addChannel = () => {
    const n = prompt("Channel name?"); if (!n) return;
    const id = n.toLowerCase().replace(/[^a-z0-9]+/g,"_") + "_" + Math.floor(Math.random()*999);
    setChannels(prev=> [...prev, { id, name:n, baseROAS:2.0, saturationSpend:30000, minSpend:0, maxSpend:100000, minPercent:0, maxPercent:1, incrementality:0.7, affectedByContent:false, adrUplift:1.0, occUplift:1.0, awarenessScore:1.0, enabled:true }]);
  };
  const deleteChannel = (id: string)=> setChannels(prev=> prev.filter(c=> c.id!==id));
  const currency = (n:number)=> currencyFmt(n, currencySymbol);

  const exportCSV = ()=> {
    const header = ["Channel","Spend","Revenue","ROAS"].join(",");
    const lines = rows.map(r=> [r.name, Math.round(r.spend), Math.round(r.revenue), r.roas.toFixed(2)].join(","));
    const csv = [header, ...lines, "", `TOTAL,${Math.round(totals.spend)},${Math.round(totals.revenue)},${(totals.revenue/Math.max(1,totals.spend)).toFixed(2)}`].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "hotel_budget_optimizer_allocation.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const generateSummary = ()=> {
    const top = [...rows].sort((a,b)=> b.spend - a.spend).slice(0,3).map(r=> r.name).join(", ");
    const months = MONTHS.filter((_,i)=> activeMonths[i]).join(", ");
    const objLabel = { auto:"overall performance", roas:"marginal efficiency (ROAS)", revenue:"total incremental revenue", adr:"ADR growth", occupancy:"occupancy lift", awareness:"upper-funnel awareness" }[objective];
    const text = `Property: ${website || "[website not provided]"}\n\nBudget Objective: ${objLabel}. Selected months: ${months}.\n\nSeasonality assumptions: ${seasonality.map((v,i)=>`${MONTHS[i]}×${v.toFixed(2)}`).join(", ")} (1.00 = neutral).\n\nRecommended allocation focuses on ${top}. This mix balances the chosen objective with incrementality and channel saturation. Content investment lifts performance for social/OTT/programmatic by ${(contentLiftPer10k*100).toFixed(0)}% per $10k, which is reflected in the model.\n\nRationale: We apply diminishing-returns curves calibrated by Base ROAS and 95% saturation spends, then allocate in $${step} steps to the channel with the highest objective-weighted marginal value while respecting min/max percentage caps and hard spend limits.\n\nNext steps: Validate Base ROAS, incrementality, and saturation with GA4/PMS/Call Center; adjust seasonality; re-run; export CSV for approvals.`;
    setSummary(text);
  };

  return (
    <div className="p-6 md:p-10 grid gap-6 grid-cols-1 xl:grid-cols-3">
      {/* Left controls */}
      <Card className="xl:col-span-1 shadow-lg rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <h1 className="text-2xl font-semibold">Hotel/Resort Marketing Budget Optimizer</h1>
          <p className="text-sm text-gray-500">Allocate budgets with diminishing-returns modeling, percent caps, objectives, and seasonality.</p>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Total Budget</Label><Input type="number" value={totalBudget} onChange={(e)=> setTotalBudget(Number(e.target.value)||0)} /></div>
            <div><Label>Currency</Label><Input value={currencySymbol} onChange={(e)=> setCurrencySymbol(e.target.value)} /></div>
            <div><Label>Allocation Step</Label><Input type="number" value={step} onChange={(e)=> setStep(Math.max(100, Number(e.target.value)||100))} /><p className="text-xs text-gray-500 mt-1">Smaller steps = finer optimization (slower).</p></div>
            <div>
              <Label>Content Lift per $10k</Label>
              <div className="flex items-center gap-3">
                <Slider value={Math.round(contentLiftPer10k*100)} onChange={(v)=> setContentLiftPer10k(v/100)} max={20} step={1}/>
                <span className="text-sm w-10 text-right">{Math.round(contentLiftPer10k*100)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Applies to Social, OTT/CTV, Programmatic, Influencers.</p>
            </div>
          </div>

          <div>
            <Label>Objective</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["auto","roas","revenue","adr","occupancy","awareness"] as Objective[]).map(o=>(
                <Button key={o} variant={objective===o?"default":"secondary"} onClick={()=> setObjective(o)} className="capitalize">{o}</Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={exportCSV}>Export CSV</Button>
          </div>

          <div className="pt-4 space-y-2">
            <Label>Budget Duration & Seasonality</Label>
            <div className="grid grid-cols-6 gap-2">
              {MONTHS.map((m,i)=>(
                <Button key={m} variant={activeMonths[i]? "default":"secondary"} onClick={()=> setActiveMonths(prev=> prev.map((v,j)=> j===i? !v : v))}>{m}</Button>
              ))}
            </div>
            <p className="text-xs text-gray-500">Click months to include (default: full year). Set multipliers below.</p>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m,i)=>(
                <div key={m} className="flex items-center gap-2">
                  <span className="w-10 text-sm">{m}</span>
                  <Input type="number" step="0.05" value={seasonality[i]} onChange={(e)=> setSeasonality(prev=> prev.map((v,j)=> j===i? Number(e.target.value)||0 : v ))}/>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels panel */}
      <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Channels</h3>
            <Button onClick={addChannel}>Add</Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {channels.map(ch=>(
              <Card key={ch.id} className={cx("rounded-2xl", !ch.enabled && "opacity-50")}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{ch.name}</h4>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Enable</Label>
                      <Switch checked={ch.enabled} onChange={(v)=> handleChannelChange(ch.id, { enabled: v })}/>
                      <Button variant="ghost" onClick={()=> setChannels(prev=> prev.filter(c=> c.id!==ch.id))}>Delete</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Base ROAS</Label><Input type="number" step="0.1" value={ch.baseROAS} onChange={(e)=> handleChannelChange(ch.id, { baseROAS: Number(e.target.value)||0 })}/></div>
                    <div><Label>Sat. Spend (95%)</Label><Input type="number" value={ch.saturationSpend} onChange={(e)=> handleChannelChange(ch.id, { saturationSpend: Number(e.target.value)||0 })}/></div>
                    <div><Label>Min Spend</Label><Input type="number" value={ch.minSpend} onChange={(e)=> handleChannelChange(ch.id, { minSpend: Number(e.target.value)||0 })}/></div>
                    <div><Label>Max Spend</Label><Input type="number" value={ch.maxSpend} onChange={(e)=> handleChannelChange(ch.id, { maxSpend: Number(e.target.value)||0 })}/></div>
                    <div><Label>Min % of Budget</Label><Input type="number" step="0.01" value={ch.minPercent} onChange={(e)=> handleChannelChange(ch.id, { minPercent: Math.min(1, Math.max(0, Number(e.target.value)||0)) })}/></div>
                    <div><Label>Max % of Budget</Label><Input type="number" step="0.01" value={ch.maxPercent} onChange={(e)=> handleChannelChange(ch.id, { maxPercent: Math.min(1, Math.max(0, Number(e.target.value)||0)) })}/></div>
                    <div>
                      <Label>Incrementality</Label>
                      <div className="flex items-center gap-3">
                        <Slider value={Math.round(ch.incrementality*100)} onChange={(v)=> handleChannelChange(ch.id, { incrementality: v/100 })}/>
                        <span className="text-sm w-10 text-right">{Math.round(ch.incrementality*100)}%</span>
                      </div>
                    </div>
                    <div><Label>Content-Lift Affected</Label><Switch checked={!!ch.affectedByContent} onChange={(v)=> handleChannelChange(ch.id, { affectedByContent: v })}/></div>
                    <div><Label>ADR Uplift Weight</Label><Input type="number" step="0.1" value={ch.adrUplift ?? 1} onChange={(e)=> handleChannelChange(ch.id, { adrUplift: Number(e.target.value)||1 })}/></div>
                    <div><Label>Occupancy Uplift Weight</Label><Input type="number" step="0.1" value={ch.occUplift ?? 1} onChange={(e)=> handleChannelChange(ch.id, { occUplift: Number(e.target.value)||1 })}/></div>
                    <div><Label>Awareness Score</Label><Input type="number" step="0.1" value={ch.awarenessScore ?? 1} onChange={(e)=> handleChannelChange(ch.id, { awarenessScore: Number(e.target.value)||1 })}/></div>
                  </div>

                  <p className="text-xs text-gray-500">Percent caps are applied relative to total plan budget and respected during optimization.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent></Card>
      </div>

      {/* Results & rationale */}
      <Card className="xl:col-span-3 shadow-xl rounded-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Optimal Allocation (Projected Incremental)</h2>
              <p className="text-sm text-gray-500">
                Total Spend: <span className="font-medium">{currency(totals.spend)}</span> ·{" "}
                Projected Incremental Revenue: <span className="font-medium">{currency(totals.revenue)}</span> ·{" "}
                Blended ROAS: <span className="font-medium">{(totals.revenue/Math.max(1,totals.spend)).toFixed(2)}x</span> ·{" "}
                Objective: <span className="font-medium capitalize">{objective}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportCSV}>CSV</Button>
            </div>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="name" hide/>
                <YAxis/>
                <Tooltip formatter={(v:any)=> String(v)}/>
                <Bar dataKey="Spend"/>
                <Bar dataKey="Revenue"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3 text-right">Spend</th>
                  <th className="py-2 pr-3 text-right">Projected Incremental Revenue</th>
                  <th className="py-2 pr-3 text-right">Projected ROAS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3 text-right">{currency(r.spend)}</td>
                    <td className="py-2 pr-3 text-right">{currency(r.revenue)}</td>
                    <td className="py-2 pr-3 text-right">{r.roas.toFixed(2)}x</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2 pr-3">TOTAL</td>
                  <td className="py-2 pr-3 text-right">{currency(totals.spend)}</td>
                  <td className="py-2 pr-3 text-right">{currency(totals.revenue)}</td>
                  <td className="py-2 pr-3 text-right">{(totals.revenue/Math.max(1,totals.spend)).toFixed(2)}x</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              <Label>Property Website</Label>
              <Input placeholder="https://example-resort.com" value={website} onChange={(e)=> setWebsite(e.target.value)}/>
              <Button className="mt-2" onClick={generateSummary}>Generate Summary (draft)</Button>
              <p className="text-xs text-gray-500">To auto-research the website, add a serverless API route and call it here.</p>
            </div>
            <div className="md:col-span-2">
              <Label>Property Summary & Budget Rationale</Label>
              <Textarea value={summary} onChange={(e)=> setSummary(e.target.value)} rows={10} placeholder="Click ‘Generate Summary’ for a draft, then edit."/>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
