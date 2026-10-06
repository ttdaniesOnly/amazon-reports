// Supabase 连接配置
//
// ⚠️ 这里的 key 是 **Publishable key（旧称 anon）**，设计上就是可以公开的：
//    它只能读两个聚合视图（public_daily_summary / public_monthly_summary），
//    两张明细表在数据库层面已经 RLS 锁死 + 显式 revoke，拿这个 key 也读不到一行明细。
//
// 🚨 绝对不要把 Secret key（sb_secret_...）放进来 —— 那个绕过 RLS，等同数据库 root。
window.MINIBUS_CONFIG = {
  supabaseUrl: "https://znljvzqycbplvqnuqcqd.supabase.co",
  supabaseKey: "sb_publishable_TK0E8P9jVCyG7qrwAMBIHw_k1dROVXk"
};
