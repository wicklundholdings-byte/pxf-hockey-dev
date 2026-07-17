# stream-sign-url Edge Function

Proxies Cloudflare Stream API calls so the API token stays server-side.

## Deploy

```bash
# 1. Link your project (one-time)
supabase link --project-ref kqamqlsimyelvzxqdnyp

# 2. Set secrets
supabase secrets set \
  CLOUDFLARE_ACCOUNT_ID=<your-account-id> \
  CLOUDFLARE_STREAM_TOKEN=<your-stream-token>

# 3. Deploy
supabase functions deploy stream-sign-url
```

## Actions

| action      | method | params             | body           |
|-------------|--------|--------------------|----------------|
| list        | GET    | —                  | —              |
| get         | GET    | videoId            | —              |
| sign        | POST   | videoId            | —              |
| upload_url  | POST   | —                  | `{ name }`     |
| delete      | DELETE | videoId            | —              |

All requests require a valid Supabase JWT in the `Authorization` header.
