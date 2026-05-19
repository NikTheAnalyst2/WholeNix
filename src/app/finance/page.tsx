"use client";

import { useState, useMemo } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import {
  ArrowUpRight, ArrowDownRight, IndianRupee, TrendingUp, CreditCard,
  PiggyBank, Plus, Pencil, Trash2, Target, BarChart3, Wallet,
  Briefcase, PieChart, AlertTriangle, CheckCircle, Grip,
  Landmark, TrendingDown,
} from "lucide-react";

/* ─── Types ─── */
type TxType = "income" | "expense";
type InvType = "stock" | "sip" | "fd" | "other";

interface Tx {
  id: string; type: TxType; amount: number; date: string;
  description: string; category: string;
}
interface Budget { id: string; category: string; budgeted: number; color: string; }
interface EmergencyFund { id: string; name: string; target: number; current: number; }
interface Investment {
  id: string; name: string; type: InvType; amount: number;
  returns: number; date: string;
}

/* ─── Budget color palette ─── */
const COLORS = [
  "bg-brand-500", "bg-emerald-500", "bg-blue-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500",
];

/* ─── Helpers ─── */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

type TabId = "txns" | "budgets" | "emergency" | "portfolio" | "networth";

const TABS: { id: TabId; label: string; icon: typeof Wallet }[] = [
  { id: "txns", label: "Transactions", icon: Wallet },
  { id: "budgets", label: "Budgets", icon: BarChart3 },
  { id: "emergency", label: "Emergency", icon: Target },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "networth", label: "Net Worth", icon: PieChart },
];

/* ─── Category options ─── */
const CATEGORIES = [
  "Salary", "Freelance", "Investments", "Housing", "Food", "Transport",
  "Entertainment", "Utilities", "Health", "Shopping", "Education", "Other",
];

const INV_TYPES: { value: InvType; label: string }[] = [
  { value: "stock", label: "Stocks" },
  { value: "sip", label: "SIP" },
  { value: "fd", label: "Fixed Deposit" },
  { value: "other", label: "Other" },
];

/* ─── Page ─── */
export default function Finance() {
  const [txns, setTxns] = useLocalStorage<Tx[]>("wnx_txns", []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>("wnx_budgets", []);
  const [emergencyFunds, setEmergencyFunds] = useLocalStorage<EmergencyFund[]>("wnx_emergency", []);
  const [investments, setInvestments] = useLocalStorage<Investment[]>("wnx_investments", []);
  const [netWorthThreshold, setNetWorthThreshold] = useLocalStorage<number>("wnx_networth_threshold", 10000);

  const [tab, setTab] = useState<TabId>("txns");
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [txnModal, setTxnModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Tx | null>(null);
  const [budgetModal, setBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [emergencyModal, setEmergencyModal] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState<EmergencyFund | null>(null);
  const [invModal, setInvModal] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);

  /* summary */
  const summary = useMemo(() => {
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const invTotal = investments.reduce((s, i) => s + i.amount, 0);
    return { income, expense, balance: income - expense, invTotal };
  }, [txns, investments]);

  /* net worth */
  const netWorth = summary.balance + summary.invTotal;
  const netWorthStatus = netWorth >= netWorthThreshold ? "positive" : "negative";

  /* filtered transactions */
  const filteredTxns = filter === "all" ? txns : txns.filter((t) => t.type === filter);

  /* ─── CRUD: Transactions ─── */
  function saveTxn(data: Omit<Tx, "id">) {
    if (editingTxn) {
      setTxns((prev) => prev.map((t) => (t.id === editingTxn.id ? { ...data, id: t.id } : t)));
    } else {
      setTxns((prev) => [...prev, { ...data, id: uid() }]);
    }
    setTxnModal(false);
    setEditingTxn(null);
  }

  function deleteTxn(id: string) {
    const item = txns.find((t) => t.id === id);
    if (item) addToTrash({ id: item.id, source: "finance", sourceLabel: "Finance · Transaction", sourceKey: "wnx_txns", data: item as unknown as Record<string, unknown> });
    setTxns((prev) => prev.filter((t) => t.id !== id));
  }

  /* ─── CRUD: Budgets ─── */
  function saveBudget(data: Omit<Budget, "id" | "color">) {
    if (editingBudget) {
      setBudgets((prev) => prev.map((b) => (b.id === editingBudget.id ? { ...b, ...data } : b)));
    } else {
      setBudgets((prev) => [...prev, { ...data, id: uid(), color: COLORS[prev.length % COLORS.length] }]);
    }
    setBudgetModal(false);
    setEditingBudget(null);
  }

  function deleteBudget(id: string) {
    const item = budgets.find((b) => b.id === id);
    if (item) addToTrash({ id: item.id, source: "finance", sourceLabel: "Finance · Budget", sourceKey: "wnx_budgets", data: item as unknown as Record<string, unknown> });
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  /* ─── CRUD: Emergency Funds ─── */
  function saveEmergency(data: Omit<EmergencyFund, "id">) {
    if (editingEmergency) {
      setEmergencyFunds((prev) => prev.map((e) => (e.id === editingEmergency.id ? { ...data, id: e.id } : e)));
    } else {
      setEmergencyFunds((prev) => [...prev, { ...data, id: uid() }]);
    }
    setEmergencyModal(false);
    setEditingEmergency(null);
  }

  function deleteEmergency(id: string) {
    const item = emergencyFunds.find((e) => e.id === id);
    if (item) addToTrash({ id: item.id, source: "finance", sourceLabel: "Finance · Emergency Fund", sourceKey: "wnx_emergency", data: item as unknown as Record<string, unknown> });
    setEmergencyFunds((prev) => prev.filter((e) => e.id !== id));
  }

  /* ─── CRUD: Investments ─── */
  function saveInvestment(data: Omit<Investment, "id">) {
    if (editingInv) {
      setInvestments((prev) => prev.map((i) => (i.id === editingInv.id ? { ...data, id: i.id } : i)));
    } else {
      setInvestments((prev) => [...prev, { ...data, id: uid() }]);
    }
    setInvModal(false);
    setEditingInv(null);
  }

  function deleteInvestment(id: string) {
    const item = investments.find((i) => i.id === id);
    if (item) addToTrash({ id: item.id, source: "finance", sourceLabel: "Finance · Investment", sourceKey: "wnx_investments", data: item as unknown as Record<string, unknown> });
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Finance</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Track income, expenses, budgets, and investments.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardReal title="Balance" value={fmt(summary.balance)} icon={IndianRupee} />
        <StatCardReal title="Income" value={fmt(summary.income)} icon={TrendingUp} />
        <StatCardReal title="Expenses" value={fmt(summary.expense)} icon={CreditCard} />
        <StatCardReal title="Investments" value={fmt(summary.invTotal)} icon={PiggyBank} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                active
                  ? "bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────── Transactions Tab ──────── */}
      {tab === "txns" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
              {(["all", "income", "expense"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    filter === f
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  }`}
                >{f === "all" ? "All" : f}</button>
              ))}
            </div>
            <button onClick={() => { setEditingTxn(null); setTxnModal(true); }}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {filteredTxns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No transactions yet.</CardContent></Card>
          ) : (
            <div className="space-y-1.5">
              {filteredTxns.map((t) => (
                <div key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                >
                  <div className={`rounded-lg p-2 ${
                    t.type === "income"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                  }`}>
                    {t.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{t.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`whitespace-nowrap text-sm font-semibold ${
                      t.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </span>
                    <button onClick={() => { setEditingTxn(t); setTxnModal(true); }}
                      className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0 sm:group-hover:opacity-100"
                    ><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteTxn(t.id)}
                      className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0 sm:group-hover:opacity-100"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────── Budgets Tab ──────── */}
      {tab === "budgets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""} set
            </p>
            <button onClick={() => { setEditingBudget(null); setBudgetModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Budget</button>
          </div>
          {budgets.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No budgets yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 pt-5">
                {budgets.map((b) => {
                  const spent = txns.filter((t) => t.type === "expense" && t.category === b.category)
                    .reduce((s, t) => s + t.amount, 0);
                  const pct = Math.min((spent / b.budgeted) * 100, 100);
                  return (
                    <div key={b.id} className="group">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{b.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">{fmt(spent)} / {fmt(b.budgeted)}</span>
                          <button onClick={() => { setEditingBudget(b); setBudgetModal(true); }}
                            className="rounded p-1 text-zinc-300 opacity-0 transition-all hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-zinc-300"
                          ><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => deleteBudget(b.id)}
                            className="rounded p-1 text-zinc-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400"
                          ><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className={`h-full rounded-full transition-all ${b.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ──────── Emergency Tab ──────── */}
      {tab === "emergency" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {emergencyFunds.length} fund{emergencyFunds.length !== 1 ? "s" : ""}
            </p>
            <button onClick={() => { setEditingEmergency(null); setEmergencyModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Fund</button>
          </div>
          {emergencyFunds.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No emergency funds yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {emergencyFunds.map((f) => {
                const pct = Math.min((f.current / f.target) * 100, 100);
                return (
                  <Card key={f.id}>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</h3>
                          <p className="mt-0.5 text-xs text-zinc-400">Target: {fmt(f.target)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingEmergency(f); setEmergencyModal(true); }}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          ><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteEmergency(f.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmt(f.current)}</span>
                        <span className="text-xs text-zinc-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────── Portfolio Tab ──────── */}
      {tab === "portfolio" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {investments.length} investment{investments.length !== 1 ? "s" : ""} • Total: {fmt(summary.invTotal)}
            </p>
            <button onClick={() => { setEditingInv(null); setInvModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Investment</button>
          </div>

          {/* Portfolio summary mini-cards */}
          {investments.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INV_TYPES.map((it) => {
                const total = investments.filter((i) => i.type === it.value).reduce((s, i) => s + i.amount, 0);
                if (total === 0) return null;
                return (
                  <Card key={it.value}>
                    <CardContent className="pt-4 text-center">
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{fmt(total)}</p>
                      <p className="text-xs text-zinc-400">{it.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {investments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No investments yet.</CardContent></Card>
          ) : (
            <div className="space-y-1.5">
              {investments.map((inv) => (
                <div key={inv.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                >
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                    {inv.type === "stock" ? <TrendingUp className="h-4 w-4" /> :
                     inv.type === "sip" ? <TrendingDown className="h-4 w-4" /> :
                     inv.type === "fd" ? <Landmark className="h-4 w-4" /> :
                     <Grip className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{inv.name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="capitalize">{inv.type}</span>
                      <span>•</span>
                      <span>{new Date(inv.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmt(inv.amount)}</p>
                    <p className={`text-xs font-medium ${
                      inv.returns >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {inv.returns >= 0 ? "+" : ""}{inv.returns}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingInv(inv); setInvModal(true); }}
                      className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                    ><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteInvestment(inv.id)}
                      className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────── Net Worth Tab ──────── */}
      {tab === "networth" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Assets</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0) + summary.invTotal)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">Income + Investments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Liabilities</p>
                <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
                  {fmt(txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-400">Total Expenses</p>
              </CardContent>
            </Card>
          </div>

          <Card className={`border-2 transition-colors ${
            netWorthStatus === "positive" ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"
          }`}>
            <CardContent className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                {netWorthStatus === "positive"
                  ? <CheckCircle className="h-7 w-7 text-emerald-500" />
                  : <AlertTriangle className="h-7 w-7 text-red-500" />
                }
              </div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Net Worth</p>
              <p className={`mt-1 text-4xl font-bold tracking-tight ${
                netWorthStatus === "positive"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {netWorth >= 0 ? "" : "-"}{fmt(Math.abs(netWorth))}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                {netWorthStatus === "positive" ? "Above threshold ✅" : "Below threshold ⚠️"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Threshold Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input type="number" value={netWorthThreshold}
                  onChange={(e) => setNetWorthThreshold(Number(e.target.value))}
                  className="w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-brand-400"
                />
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  netWorthStatus === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {netWorthStatus === "positive" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {netWorth >= netWorthThreshold
                    ? `${fmt(netWorth - netWorthThreshold)} above threshold`
                    : `${fmt(netWorthThreshold - netWorth)} below threshold`
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Modals ─── */}

      {/* Transaction Modal */}
      <Modal open={txnModal} onClose={() => { setTxnModal(false); setEditingTxn(null); }}
        title={editingTxn ? "Edit Transaction" : "Add Transaction"}>
        <TxnForm initial={editingTxn} onSave={saveTxn} onCancel={() => { setTxnModal(false); setEditingTxn(null); }} />
      </Modal>

      {/* Budget Modal */}
      <Modal open={budgetModal} onClose={() => { setBudgetModal(false); setEditingBudget(null); }}
        title={editingBudget ? "Edit Budget" : "Add Budget"}>
        <BudgetForm initial={editingBudget} categories={CATEGORIES} budgets={budgets}
          onSave={saveBudget} onCancel={() => { setBudgetModal(false); setEditingBudget(null); }} />
      </Modal>

      {/* Emergency Modal */}
      <Modal open={emergencyModal} onClose={() => { setEmergencyModal(false); setEditingEmergency(null); }}
        title={editingEmergency ? "Edit Emergency Fund" : "Add Emergency Fund"}>
        <EmergencyForm initial={editingEmergency}
          onSave={saveEmergency} onCancel={() => { setEmergencyModal(false); setEditingEmergency(null); }} />
      </Modal>

      {/* Investment Modal */}
      <Modal open={invModal} onClose={() => { setInvModal(false); setEditingInv(null); }}
        title={editingInv ? "Edit Investment" : "Add Investment"}>
        <InvestmentForm initial={editingInv}
          onSave={saveInvestment} onCancel={() => { setInvModal(false); setEditingInv(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCardReal({
  title, value, icon: Icon,
}: {
  title: string; value: string; icon: typeof IndianRupee;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">{value}</p>
          </div>
          <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Forms ─── */

function TxnForm({ initial, onSave, onCancel }: {
  initial: Tx | null; onSave: (d: Omit<Tx, "id">) => void; onCancel: () => void;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount.toString() ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description) return;
    onSave({ type, amount: Number(amount), date, description, category });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["income", "expense"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-all ${
              type === t
                ? t === "income"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >{t}</button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Amount</label>
        <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
        <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

function BudgetForm({ initial, categories, budgets, onSave, onCancel }: {
  initial: Budget | null; categories: string[]; budgets: Budget[];
  onSave: (d: Omit<Budget, "id" | "color">) => void; onCancel: () => void;
}) {
  const usedCategories = budgets.filter((b) => b.id !== initial?.id).map((b) => b.category);
  const available = categories.filter((c) => !usedCategories.includes(c));
  const [category, setCategory] = useState(initial?.category ?? available[0] ?? "");
  const [budgeted, setBudgeted] = useState(initial?.budgeted.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !budgeted) return;
    onSave({ category, budgeted: Number(budgeted) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {available.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Monthly Budget</label>
        <input type="number" step="0.01" required value={budgeted} onChange={(e) => setBudgeted(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

function EmergencyForm({ initial, onSave, onCancel }: {
  initial: EmergencyFund | null; onSave: (d: Omit<EmergencyFund, "id">) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target.toString() ?? "");
  const [current, setCurrent] = useState(initial?.current.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !target) return;
    onSave({ name, target: Number(target), current: Number(current || 0) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Fund Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Target</label>
          <input type="number" step="0.01" required value={target} onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Saved So Far</label>
          <input type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

function InvestmentForm({ initial, onSave, onCancel }: {
  initial: Investment | null; onSave: (d: Omit<Investment, "id">) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<InvType>(initial?.type ?? "stock");
  const [amount, setAmount] = useState(initial?.amount.toString() ?? "");
  const [returns, setReturns] = useState(initial?.returns.toString() ?? "0");
  const [date, setDate] = useState(initial?.date ?? today());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;
    onSave({ name, type, amount: Number(amount), returns: Number(returns || 0), date });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Investment Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as InvType)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {INV_TYPES.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Amount Invested</label>
          <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Returns (%)</label>
          <input type="number" step="0.01" value={returns} onChange={(e) => setReturns(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}
