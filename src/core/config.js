// CCE StableOS v4 — central runtime configuration.
// Keep only publishable browser-safe values here. Never place service_role secrets in this file.
// ══════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ══════════════════════════════════════════════════════════
const SB_URL='https://ipiarzkljcictghtkcri.supabase.co';
const SB_KEY='sb_publishable_rmX0zdqsDXUj-7s2ijWzHQ_jaVGiuch';
// ══════════════════════════════════════════════════════════
// APP CONFIG — عدّل رقم الواتساب قبل النشر الرسمي
// ══════════════════════════════════════════════════════════
const CLUB_WHATSAPP='97332266061'; // مثال: 97339000000
const CLUB_IBAN='BH23BIBB00100002375646';
window.CCE_RLS_SQL="See supabase/migrations/20260710_unified_member_portal.sql";



window.CCE_CONFIG=Object.freeze({SUPABASE_URL:SB_URL,SUPABASE_PUBLISHABLE_KEY:SB_KEY,WHATSAPP:CLUB_WHATSAPP,IBAN:CLUB_IBAN});
