#!/bin/bash
# ============================================================
# PXF Hockey — Deploy Supabase Edge Functions
#
# Run this from the project root:
#   bash scripts/deploy-edge-functions.sh
#
# Prerequisites:
#   1. Supabase CLI installed: brew install supabase/tap/supabase
#   2. Logged in: supabase login
#   3. Linked to project: supabase link --project-ref kqamqlsimyelvzxqdnyp
#   4. CLOUDFLARE_STREAM_TOKEN set below (keep this file out of git)
# ============================================================

set -e

PROJECT_REF="kqamqlsimyelvzxqdnyp"

echo "🚀 Deploying Supabase Edge Functions..."

# ── Deploy stream-sign-url ────────────────────────────────────────────────────
echo ""
echo "Deploying: stream-sign-url"
supabase functions deploy stream-sign-url --project-ref "$PROJECT_REF"

# ── Set secrets ───────────────────────────────────────────────────────────────
# IMPORTANT: Replace the placeholder values below before running.
# DO NOT commit this file with real secrets — add scripts/ to .gitignore or
# keep the secrets in a local .env file that you source before running.

echo ""
echo "Setting secrets..."

# Cloudflare Stream API token (from Cloudflare Dashboard → My Profile → API Tokens)
# ⚠️  Replace REPLACE_WITH_YOUR_CF_STREAM_TOKEN with the real token
CLOUDFLARE_STREAM_TOKEN="${CLOUDFLARE_STREAM_TOKEN:-cfut_JUuBfKINL62EaR1Pn1glI1hcvmkcEarxk6O7rjQec4f39cac}"

# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-9b81a43b71d6af5c4ed5a893adc26918}"

supabase secrets set \
  CLOUDFLARE_STREAM_TOKEN="$CLOUDFLARE_STREAM_TOKEN" \
  CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
  --project-ref "$PROJECT_REF"

echo ""
echo "✅ Done! Verify at:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo ""
echo "Test the function:"
echo "   curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/stream-sign-url \\"
echo "     -H 'Authorization: Bearer <your-anon-key>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"action\":\"list\"}'"
