// Supabase 连接配置
//
// ⚠️ 这里的 key 是 **Publishable key（旧称 anon）**，设计上就是可以公开的：
//    它只能读两个聚合视图（public_daily_summary / public_monthly_summary），
//    两张明细表在数据库层面已经 RLS 锁死 + 显式 revoke，拿这个 key 也读不到一行明细。
//
// 🚨 绝对不要把 Secret key（sb_secret_...）放进来 —— 那个绕过 RLS，等同数据库 root。
//
// 变更记录：
//   2026-10-09 从旧项目 znljvzqycbplvqnuqcqd（us-west-1）切到新项目
//              nwgxayppywuihujihaad（ap-northeast-1 东京），数据已全量迁移并校验一致。
window.MINIBUS_CONFIG = {
  supabaseUrl: "https://nwgxayppywuihujihaad.supabase.co",
  supabaseKey: "sb_publishable_-WNSmStc4ZvSoJlXKJmjuw_uNXB0Lbm"
};
