# Self-Hosted CDN — SeaweedFS + Nginx Proxy Manager

A Docker-based self-hosted CDN providing **public read access** to uploaded files, **authenticated S3 uploads only**, and **90-day Nginx caching** so repeated requests are served from cache without hitting the storage backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR VPS                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Docker Network (internal)                                  │    │
│  │                                                             │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │    │
│  │  │ seaweed-     │───▶│ seaweed-     │───▶│ seaweed-     │  │    │
│  │  │ master :9333 │    │ volume :8080 │    │ filer :8888  │  │    │
│  │  └──────────────┘    └──────────────┘    └──────┬───────┘  │    │
│  │                                                 │          │    │
│  │                                          ┌──────┴───────┐  │    │
│  │                                          │ seaweed-     │  │    │
│  │                                          │ s3 :8333     │  │    │
│  │                                          └──────┬───────┘  │    │
│  │                                                 │          │    │
│  │                            ┌─────────────────────┘          │    │
│  │                            │                               │    │
│  │                     ┌──────┴───────┐                       │    │
│  │                     │     NPM      │                       │    │
│  │                     │ :80/443/81   │                       │    │
│  │                     └──────┬───────┘                       │    │
│  │                            │                               │    │
│  └────────────────────────────┼───────────────────────────────┘    │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        cdn2.tisquip.com   s3.cdn2.tisquip.com  :81 (admin)
        (public reads)     (S3 uploads/SSL)
        Browser            S3 Client
```

**Upload flow (authenticated + encrypted):**
```
S3 Client ──► NPM (:443 HTTPS, s3.cdn2.tisquip.com) ──► SeaweedFS S3 Gateway ──► Filer ──► Volume Server
```

**Public read flow (cached):**
```
Browser ──► NPM (:443 HTTPS)
              │
              ├─ Cache HIT  → serve from Nginx disk cache (no backend call)
              └─ Cache MISS → SeaweedFS Filer (:8888) → cache response + serve
```

**CDN URL format:** `https://cdn2.tisquip.com/<bucket>/<filename>`

---

## Services

| Container            | Role                                | Exposed Port | Public? |
| -------------------- | ----------------------------------- | ------------ | ------- |
| `seaweed-master`     | Cluster coordinator                 | —            | No      |
| `seaweed-volume`     | File data storage                   | —            | No      |
| `seaweed-filer`      | HTTP file server (internal only)    | —            | No      |
| `seaweed-s3`         | S3 API for authenticated operations | —            | No      |
| `nginx-proxy-manager`| SSL + caching reverse proxy + admin | 80, 443, 81  | Yes     |

---

## Docker Network

All containers are connected to a shared Docker bridge network called **`tisquip`**. Docker's built-in DNS resolves container names to their internal IP addresses within this network, which is why NPM proxy hosts can reference containers by name (e.g. `seaweed-filer`, `seaweed-s3`) in the **Forward Hostname** field.

**Connecting other projects to this NPM instance:**

Any other Docker Compose project can join the same `tisquip` network and immediately be reachable by NPM using its container name. Add this to the other project's `docker-compose.yml`:

```yaml
services:
  myapp:
    image: my-app-image
    container_name: myapp
    networks:
      - tisquip
    # ... other config

networks:
  tisquip:
    external: true    # References the existing "tisquip" network created by the CDN stack
```

Then in NPM, create a proxy host with `Forward Hostname: myapp` and the appropriate port. No IP addresses needed — Docker DNS handles name resolution across all containers on the `tisquip` network.

---

## Prerequisites

- A VPS with **Docker** and **Docker Compose** installed
- Domains `cdn2.tisquip.com` and `s3.cdn2.tisquip.com` with **A records** pointing to your VPS IP
- Ports **80** and **443** open in your firewall (for HTTP/HTTPS + S3 uploads)

### Install Docker (if needed)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

## Setup

### Step 1: Run the Setup Script

The `initial-setup.sh` script sets up all the infrastructure (SeaweedFS + Nginx Proxy Manager containers, S3 credentials, cache config). You'll configure NPM manually afterwards.

```bash
gh repo clone reccesoft/tisquip-cdn
cd tisquip-cdn
chmod +x initial-setup.sh
sudo ./initial-setup.sh
```

The script will prompt you for:

| Prompt                   | Default                |
| ------------------------ | ---------------------- |
| CDN domain               | `cdn2.tisquip.com`     |
| S3 subdomain             | `s3.cdn2.tisquip.com`  |
| Configure UFW firewall?  | No                     |

**What the script does:**

1. Checks prerequisites (Docker, Docker Compose, curl, openssl)
2. Generates secure S3 credentials and writes `seaweedfs/s3/config.json`
3. Creates all required data directories
4. Writes the NPM cache zone config (`http_top.conf`)
5. Starts the Docker Compose stack
6. Optionally configures UFW firewall rules
7. Prints your S3 credentials and next steps

**Save the S3 credentials printed at the end — they cannot be recovered.**

After the script completes, all 5 containers will be running. Now you need to configure Nginx Proxy Manager through its browser UI.

---

### Step 2: Log into Nginx Proxy Manager

1. Open your browser and go to: `http://YOUR_VPS_IP:81`
2. You'll see the NPM login page. Enter the **default credentials**:
   - **Email:** `admin@example.com`
   - **Password:** `changeme`
3. NPM will immediately ask you to set a new admin email and password. Fill in:
   - **Full Name:** whatever you like
   - **Nickname:** whatever you like (shows in the UI top-right corner)
   - **Email:** your real email (e.g. `tisquip6@gmail.com`)
4. Click **Save**, then it will ask you to change the password:
   - **Current Password:** `changeme`
   - **New Password:** your new password (min 8 characters)
   - **Confirm Password:** same new password
5. Click **Save**. You're now logged in with your new credentials.

> **Security note:** Anyone with access to port 81 can access the NPM admin panel. Consider IP-restricting port 81 via firewall rules (the setup script can do this for you via UFW).

---

### Step 3: Create the CDN Proxy Host (Public Reads)

This proxy host handles all public file reads at `cdn2.tisquip.com`. It proxies requests to the SeaweedFS Filer and caches responses for 90 days.

1. In the NPM dashboard, click **"Proxy Hosts"** in the top menu bar.
2. Click the **"Add Proxy Host"** button (top right).

#### 3a. Details Tab

Fill in these fields:

| Field                    | Value              | Why                                                                                                 |
| ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| **Domain Names**         | `cdn2.tisquip.com` | Type it and press Enter — it appears as a tag. This is the public URL people use to access your CDN. |
| **Scheme**               | `http`             | NPM talks to the filer over the internal Docker network (no SSL needed internally).                  |
| **Forward Hostname / IP**| `seaweed-filer`    | The Docker container name. Works because all containers share the `tisquip` network.                 |
| **Forward Port**         | `8888`             | The SeaweedFS Filer's HTTP port.                                                                     |
| **Cache Assets**         | ❌ Leave OFF       | We use custom cache directives in the Advanced tab instead. NPM's built-in caching is too basic.     |
| **Block Common Exploits**| ✅ ON              | Blocks common attack patterns.                                                                       |
| **Websockets Support**   | ❌ Leave OFF       | Not needed — this is a file CDN, not a real-time app.                                                |

> **Do NOT click Save yet** — you need to configure the SSL and Advanced tabs first.

#### 3b. SSL Tab

| Field                          | Value / Action                        | Why                                                                                 |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------- |
| **SSL Certificate**            | Select **"Request a new SSL Certificate"** from the dropdown | NPM will automatically request a free Let's Encrypt certificate for this domain.  |
| **Force SSL**                  | ✅ ON                                 | Automatically redirects all HTTP requests to HTTPS.                                 |
| **HTTP/2 Support**             | ✅ ON                                 | Faster multiplexed connections — improves CDN performance.                          |
| **HSTS Enabled**               | ❌ Leave OFF                          | Only enable this if you're sure you'll never need plain HTTP for this domain.       |
| **Email Address for Let's Encrypt** | `tisquip6@gmail.com` (or your email) | Let's Encrypt uses this to send certificate expiry warnings.                        |
| **I Agree to the Let's Encrypt Terms** | ✅ Check this box              | Required to issue the certificate.                                                  |

> **Important:** For SSL to work, the DNS A record for `cdn2.tisquip.com` must already point to your VPS IP. If DNS isn't set up yet, skip SSL for now — you can come back and add it later by editing this proxy host.

#### 3c. Advanced Tab

This is where the caching magic happens. Paste the following Nginx configuration into the **Custom Nginx Configuration** text area:

```nginx
# =============================================================
# SECURITY: Block all write methods through the CDN URL.
# Only GET, HEAD, and OPTIONS (CORS preflight) are allowed.
# All uploads/deletes MUST go through the S3 gateway.
# =============================================================
if ($request_method !~ ^(GET|HEAD|OPTIONS)$) {
    return 405;
}

# =============================================================
# CDN CACHING: This location block matches any request with a
# file extension (e.g. .jpg, .png, .mp4, .pdf). It takes
# priority over NPM's default location / because regex
# locations are evaluated before prefix locations in Nginx.
#
# All CDN file requests are cached for 90 days at the Nginx
# level. The browser is also instructed to cache for 90 days
# via Cache-Control headers.
# =============================================================
location ~* \. {
    # Proxy to SeaweedFS Filer (internal Docker hostname)
    proxy_pass http://seaweed-filer:8888;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # --- Nginx-level caching (90 days) ---
    # "cdn_cache" zone is defined in npm/data/nginx/custom/http_top.conf
    proxy_cache cdn_cache;
    proxy_cache_valid 200 90d;
    proxy_cache_methods GET HEAD;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_key $scheme$request_uri;

    # --- Browser-level caching (90 days = 7,776,000 seconds) ---
    add_header Cache-Control "public, max-age=7776000, immutable" always;

    # --- Debug: shows HIT, MISS, EXPIRED, etc. ---
    add_header X-Cache-Status $upstream_cache_status always;

    # --- CORS: allow any origin to load CDN assets ---
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Range" always;
}
```

**What each part does:**

- **`if ($request_method ...)`** — Rejects POST, PUT, DELETE requests at the CDN URL. This prevents anyone from uploading or deleting files through the public CDN endpoint. All writes must go through the authenticated S3 gateway.
- **`location ~* \.`** — Matches any URL with a file extension. This is where all file requests are handled.
- **`proxy_pass`** — Forwards the request to SeaweedFS Filer inside Docker.
- **`proxy_cache cdn_cache`** — Enables caching using the `cdn_cache` zone defined in `http_top.conf`. The setup script created that file.
- **`proxy_cache_valid 200 90d`** — Cache successful responses (HTTP 200) for 90 days.
- **`proxy_cache_use_stale`** — If the backend is down, serve stale cached content instead of an error.
- **`Cache-Control: public, max-age=7776000, immutable`** — Tells browsers to cache for 90 days and never revalidate (the `immutable` flag).
- **`X-Cache-Status`** — Adds a response header showing `HIT`, `MISS`, or `EXPIRED` so you can verify caching is working.
- **`Access-Control-Allow-Origin: *`** — CORS header so any website can load CDN assets (images, fonts, scripts, etc.).
- **`Access-Control-Allow-Methods`** — Tells browsers which HTTP methods are permitted for cross-origin requests.
- **`Access-Control-Allow-Headers: Range`** — Allows cross-origin requests that include the `Range` header (used for partial file downloads, video seeking, etc.).

#### 3d. Save

Click **Save**. NPM will create the proxy host and (if you requested SSL) provision the Let's Encrypt certificate. This can take 10-30 seconds.

You should see the new proxy host in the list with a green "Online" status and a lock icon (if SSL was configured).

---

### Step 4: Create the S3 Proxy Host (Authenticated Uploads)

This proxy host handles S3 API operations (uploads, deletes, bucket management) at `s3.cdn2.tisquip.com`. It proxies requests to the SeaweedFS S3 Gateway. Authentication is handled by SeaweedFS itself — only clients with valid S3 credentials can perform write operations.

1. Go to **"Proxy Hosts"** and click **"Add Proxy Host"** again.

#### 4a. Details Tab

| Field                    | Value                 | Why                                                                                                     |
| ------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Domain Names**         | `s3.cdn2.tisquip.com` | Type it and press Enter. This is the S3 endpoint your code uses for uploads/deletes.                     |
| **Scheme**               | `http`                | Internal traffic to the S3 gateway doesn't need SSL (NPM handles SSL on the external side).              |
| **Forward Hostname / IP**| `seaweed-s3`          | The Docker container name for the S3 gateway.                                                            |
| **Forward Port**         | `8333`                | The SeaweedFS S3 gateway port.                                                                           |
| **Cache Assets**         | ❌ Leave OFF          | S3 operations should never be cached — each request is a distinct API call.                              |
| **Block Common Exploits**| ✅ ON                 | Blocks common attack patterns.                                                                           |
| **Websockets Support**   | ❌ Leave OFF          | Not needed for S3.                                                                                       |

#### 4b. SSL Tab

Same as the CDN host:

| Field                          | Value / Action                        | Why                                                                              |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------- |
| **SSL Certificate**            | Select **"Request a new SSL Certificate"** | Encrypts all S3 traffic (including credentials sent in request headers).        |
| **Force SSL**                  | ✅ ON                                 | All S3 operations should be encrypted. AWS SDK clients connect over HTTPS.       |
| **HTTP/2 Support**             | ✅ ON                                 | Better performance for multiple S3 operations.                                   |
| **HSTS Enabled**               | ❌ Leave OFF                          | Same reasoning as the CDN host.                                                  |
| **Email Address for Let's Encrypt** | `tisquip6@gmail.com` (or your email) | Certificate expiry warnings.                                                     |
| **I Agree to the Let's Encrypt Terms** | ✅ Check this box              | Required.                                                                        |

#### 4c. Advanced Tab

Paste the following into the **Custom Nginx Configuration** text area:

```nginx
# =============================================================
# S3 PROXY: Remove the default body size limit.
# Nginx's default is 1 MB which is too small for most CDN
# assets (images, videos, PDFs, etc.). Setting to 0 means
# unlimited — SeaweedFS handles its own size limits.
# =============================================================
client_max_body_size 0;
```

**What this does:** Without this line, Nginx would reject any upload larger than 1 MB with a `413 Request Entity Too Large` error. Setting it to `0` removes the limit entirely, letting you upload files of any size.

> **Note:** Unlike the CDN host, there's no write-method blocking here. The S3 gateway handles its own authentication via `seaweedfs/s3/config.json`. Only clients with valid S3 access key + secret key can upload or delete files.

#### 4d. Save

Click **Save**. Again, SSL provisioning takes 10-30 seconds.

---

### Step 5: Verify Everything Works

```bash
# Check all containers are running
docker compose ps

# Check Filer is serving (internally, from within the Docker network)
docker exec nginx-proxy-manager curl -s -o /dev/null -w "%{http_code}" http://seaweed-filer:8888/

# Check S3 gateway is responding through NPM/SSL
curl -s -o /dev/null -w "%{http_code}" https://s3.cdn2.tisquip.com

# After uploading a file (see TypeScript examples below):
curl -I https://cdn2.tisquip.com/mybucket/test.jpg
# Look for:
#   X-Cache-Status: MISS   (first request)
#   Cache-Control: public, max-age=7776000, immutable

# Request the same file again:
curl -I https://cdn2.tisquip.com/mybucket/test.jpg
# Look for:
#   X-Cache-Status: HIT    (served from Nginx cache — SeaweedFS not contacted!)
```

---

## File Structure

```
tisquip-cdn/
├── docker-compose.yml                      # All service definitions
├── initial-setup.sh                        # Automated setup script
├── seaweedfs/
│   ├── s3/
│   │   └── config.json                     # S3 access control (credentials)
│   ├── master/                             # Master data (auto-created at runtime)
│   ├── volume/                             # File storage (auto-created at runtime)
│   └── filer/                              # Filer metadata (auto-created at runtime)
├── npm/
│   ├── data/
│   │   └── nginx/
│   │       └── custom/
│   │           └── http_top.conf           # Cache zone definition (http context)
│   └── letsencrypt/                        # SSL certificates (auto-created at runtime)
└── README.md
```

---

## TypeScript S3 Client Examples

### Install Dependencies

```bash
npm install @aws-sdk/client-s3
```

### Configuration

```typescript
import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

// -----------------------------------------------------------------
// S3 Client Configuration
// Point the endpoint at your VPS where the S3 gateway is exposed.
// Use environment variables for credentials in production.
// -----------------------------------------------------------------
const s3 = new S3Client({
  // The S3 gateway endpoint — NOT the CDN URL.
  // S3 uploads go through NPM for SSL encryption.
  endpoint: process.env.S3_ENDPOINT || "https://s3.cdn2.tisquip.com",
  region: "us-east-1", // Required by the SDK but ignored by SeaweedFS
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "CHANGE_ME_ACCESS_KEY",
    secretAccessKey: process.env.S3_SECRET_KEY || "CHANGE_ME_SECRET_KEY",
  },
  // REQUIRED: SeaweedFS uses path-style URLs (bucket in the URL path, not subdomain)
  forcePathStyle: true,
});

const CDN_BASE_URL = "https://cdn2.tisquip.com";
```

### Create a Bucket

```typescript
async function createBucket(bucketName: string): Promise<void> {
  await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
  console.log(`Bucket created: ${bucketName}`);
  // Files in this bucket will be accessible at:
  //   https://cdn2.tisquip.com/<bucketName>/<filename>
}

// Usage:
await createBucket("images");
```

### Upload a File

```typescript
async function uploadFile(
  bucketName: string,
  key: string,
  filePath: string,
  contentType?: string
): Promise<string> {
  const body = readFileSync(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const cdnUrl = `${CDN_BASE_URL}/${bucketName}/${key}`;
  console.log(`Uploaded: ${cdnUrl}`);
  return cdnUrl;
}

// Usage:
const url = await uploadFile(
  "images",            // bucket name
  "hero/banner.jpg",   // key (supports nested paths)
  "./assets/banner.jpg", // local file
  "image/jpeg"         // content type
);
// Public URL: https://cdn2.tisquip.com/images/hero/banner.jpg
```

### Delete a File

```typescript
async function deleteFile(
  bucketName: string,
  key: string
): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  console.log(`Deleted: ${bucketName}/${key}`);
}

// Usage:
await deleteFile("images", "hero/banner.jpg");
```

### Full Working Example

```typescript
import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "https://s3.cdn2.tisquip.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "CHANGE_ME_ACCESS_KEY",
    secretAccessKey: process.env.S3_SECRET_KEY || "CHANGE_ME_SECRET_KEY",
  },
  forcePathStyle: true,
});

async function main() {
  const bucket = "website-assets";
  const key = "logos/company-logo.png";
  const localFile = "./company-logo.png";

  // 1. Create the bucket (only needed once per bucket)
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`✓ Bucket "${bucket}" created`);

  // 2. Upload a file
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(localFile),
      ContentType: "image/png",
    })
  );
  console.log(`✓ Uploaded to: https://cdn2.tisquip.com/${bucket}/${key}`);

  // 3. Delete the file (when no longer needed)
  // await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  // console.log(`✓ Deleted ${bucket}/${key}`);
}

main().catch(console.error);
```

Run with environment variables:

```bash
S3_ENDPOINT=https://s3.cdn2.tisquip.com \
S3_ACCESS_KEY=your_access_key \
S3_SECRET_KEY=your_secret_key \
npx tsx upload-example.ts
```

---

## How the Caching Works

1. **First request** for `https://cdn2.tisquip.com/images/photo.jpg`:
   - NPM receives the request → cache **MISS**
   - NPM proxies to SeaweedFS Filer → Filer fetches from Volume Server
   - Response is stored in NPM's disk cache (`/data/nginx/cdn_cache/`)
   - Response header: `X-Cache-Status: MISS`

2. **Subsequent requests** within 90 days:
   - NPM receives the request → cache **HIT**
   - Response served directly from disk — SeaweedFS is never contacted
   - Response header: `X-Cache-Status: HIT`

3. **After 90 days of no access**:
   - Cache entry is evicted (`inactive=90d`)
   - Next request triggers a fresh fetch from SeaweedFS

4. **Browser caching**:
   - `Cache-Control: public, max-age=7776000, immutable` tells browsers to cache for 90 days
   - Browsers won't even make a network request for cached resources

---

## CORS (Cross-Origin Resource Sharing)

The CDN proxy host includes CORS headers (`Access-Control-Allow-Origin: *`) so that any website can load assets from the CDN. Here's when CORS matters and when it doesn't:

### When CORS is NOT needed (works without any headers)

- `<img src="https://cdn2.tisquip.com/...">` — regular image tags
- `<link href="https://cdn2.tisquip.com/..." rel="stylesheet">` — CSS stylesheets
- `<script src="https://cdn2.tisquip.com/...">` — JavaScript files
- `<video src="https://cdn2.tisquip.com/...">` — video/audio elements

These are "simple requests" — browsers load them without enforcing the same-origin policy.

### When CORS IS needed (requires the headers we configured)

- **Canvas operations** — Drawing a CDN image onto a `<canvas>` and reading pixels (e.g. `canvas.toDataURL()`) requires the image to be loaded with `crossorigin="anonymous"` on the `<img>` tag, which triggers a CORS check.
- **`fetch()` / `XMLHttpRequest`** — Loading CDN resources via JavaScript fetch APIs triggers CORS.
- **Web fonts** — `@font-face` rules loading `.woff2`/`.woff` files from the CDN always require CORS headers, per the CSS Fonts spec.
- **ES modules** — `<script type="module" src="https://cdn2.tisquip.com/...">` triggers CORS.
- **Service Workers / Web Workers** — Loading assets from the CDN inside workers requires CORS.

The CORS headers are configured in the CDN proxy host's Advanced tab (see Step 3c above). The `Access-Control-Allow-Origin: *` header permits any origin, which is appropriate for a public CDN.

---

## Security Notes

| Concern                  | How it's handled                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Anonymous uploads        | Blocked. The CDN URL (`if` directive) rejects POST/PUT/DELETE with HTTP 405.              |
| S3 authentication        | Required. The S3 gateway uses `config.json` credentials for all write operations.         |
| Filer not exposed        | The filer has no ports mapped to the host — only reachable within the Docker network.     |
| S3 encryption            | S3 traffic routed through NPM with SSL — no raw port exposed. All uploads are encrypted.  |
| NPM admin                | Port 81 — change default credentials immediately. Consider IP-restricting this port.      |
| CORS                     | Configured with `Access-Control-Allow-Origin: *` for public CDN assets.                   |

### Recommended Firewall Rules (UFW example)

```bash
# Allow HTTP/HTTPS from anywhere (CDN reads + S3 uploads, both through NPM)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow NPM admin from your IP only
sudo ufw allow from YOUR_IP to any port 81

# Deny everything else
sudo ufw default deny incoming
sudo ufw enable
```

---

## Cache Management

### Clear the Entire Cache

```bash
# Remove all cached files and restart NPM to reload
docker exec nginx-proxy-manager rm -rf /data/nginx/cdn_cache/*
docker compose restart npm
```

### Check Cache Size

```bash
docker exec nginx-proxy-manager du -sh /data/nginx/cdn_cache/
```

### Important: Cached Files Persist After Deletion

If you delete a file via S3 and it was previously cached, NPM will continue serving the cached version for up to 90 days. To force removal:

1. Delete the file via S3
2. Clear the cache (see above), or wait for the cache entry to expire naturally

---

## Convex Action Examples

You can use [Convex actions](https://docs.convex.dev/functions/actions) to upload and delete CDN files from your Convex backend. Actions can call third-party services (like the S3 gateway), making them ideal for CDN operations triggered by your application logic.

### Install Dependencies

In your Convex project:

```bash
npm install @aws-sdk/client-s3
```

### Environment Variables

Set these in your Convex dashboard under **Settings → Environment Variables**:

| Variable          | Value                          |
| ----------------- | ------------------------------ |
| `S3_ENDPOINT`     | `https://s3.cdn2.tisquip.com`  |
| `S3_ACCESS_KEY`   | your S3 access key             |
| `S3_SECRET_KEY`   | your S3 secret key             |
| `CDN_BASE_URL`    | `https://cdn2.tisquip.com`     |

### convex/cdn.ts — Upload and Delete Actions

```typescript
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

// -----------------------------------------------------------------
// S3 client factory — creates a new client per action invocation.
// Convex actions run in a serverless environment, so we create the
// client inside each action rather than at module scope.
// -----------------------------------------------------------------
function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT!,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

// -----------------------------------------------------------------
// createBucket — Create a new S3 bucket.
// Only needs to be called once per bucket. Subsequent calls for the
// same bucket name will throw an error (bucket already exists).
// -----------------------------------------------------------------
export const createBucket = action({
  args: {
    bucket: v.string(),
  },
  handler: async (_ctx, args) => {
    const s3 = getS3Client();

    await s3.send(new CreateBucketCommand({ Bucket: args.bucket }));

    return { success: true, bucket: args.bucket };
  },
});

// -----------------------------------------------------------------
// uploadFile — Upload a file to the CDN.
//
// Accepts the file as a base64-encoded string. This is necessary
// because Convex action arguments must be JSON-serializable.
//
// Typical usage: your client reads a file, converts it to base64,
// and passes it to this action. The action decodes it and uploads
// the raw bytes to SeaweedFS via the S3 API.
//
// Returns the public CDN URL for the uploaded file.
// -----------------------------------------------------------------
export const uploadFile = action({
  args: {
    bucket: v.string(),
    key: v.string(),
    base64Data: v.string(),
    contentType: v.string(),
  },
  handler: async (_ctx, args) => {
    const s3 = getS3Client();
    const body = Buffer.from(args.base64Data, "base64");

    await s3.send(
      new PutObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
        Body: body,
        ContentType: args.contentType,
      })
    );

    const cdnUrl = `${process.env.CDN_BASE_URL}/${args.bucket}/${args.key}`;
    return { success: true, cdnUrl };
  },
});

// -----------------------------------------------------------------
// deleteFile — Delete a file from the CDN.
//
// Note: If the file was cached by Nginx, the cached version will
// continue to be served until the cache expires (up to 90 days).
// See the "Cache Management" section in the README for how to
// purge the cache manually if immediate removal is required.
// -----------------------------------------------------------------
export const deleteFile = action({
  args: {
    bucket: v.string(),
    key: v.string(),
  },
  handler: async (_ctx, args) => {
    const s3 = getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      })
    );

    return { success: true, deleted: `${args.bucket}/${args.key}` };
  },
});
```

### Calling the Actions from a Convex Client (React Example)

```tsx
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

export function CdnUploader() {
  const uploadFile = useAction(api.cdn.uploadFile);
  const deleteFile = useAction(api.cdn.deleteFile);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert the file to a base64 string for the Convex action
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    const result = await uploadFile({
      bucket: "user-uploads",
      key: `avatars/${file.name}`,
      base64Data,
      contentType: file.type,
    });

    console.log("Uploaded:", result.cdnUrl);
    // result.cdnUrl = https://cdn2.tisquip.com/user-uploads/avatars/photo.jpg
  }

  async function handleDelete(bucket: string, key: string) {
    const result = await deleteFile({ bucket, key });
    console.log("Deleted:", result.deleted);
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      <button onClick={() => handleDelete("user-uploads", "avatars/photo.jpg")}>
        Delete
      </button>
    </div>
  );
}
```

### Calling from Another Convex Action or Mutation (Server-Side)

You can also call CDN actions from within other Convex functions using the internal action pattern:

```typescript
// convex/images.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const processAndUpload = action({
  args: {
    base64Image: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    // Upload to CDN via the cdn action
    const result = await ctx.runAction(api.cdn.uploadFile, {
      bucket: "processed-images",
      key: `gallery/${args.filename}`,
      base64Data: args.base64Image,
      contentType: "image/jpeg",
    });

    return result.cdnUrl;
  },
});
```

### Important Notes for Convex Actions

- **`"use node"`** — The S3 SDK requires a Node.js runtime. The `"use node"` directive at the top of the file tells Convex to run this action in a Node.js environment.
- **Base64 encoding** — Convex action arguments must be JSON-serializable, so binary file data is passed as a base64 string and decoded server-side with `Buffer.from()`.
- **Environment variables** — Access S3 credentials via `process.env` inside Convex actions. Set them in the Convex dashboard, not in code.
- **No `fs` module** — Convex actions don't have filesystem access. File data must be passed in as arguments (base64) rather than read from disk.
- **Bucket creation** — Call `createBucket` once per bucket (e.g. during app setup). You don't need to create it before every upload.

---

## Troubleshooting

| Symptom                     | Cause / Fix                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `502 Bad Gateway`           | Filer isn't ready yet. Wait 30s and retry. Check `docker compose logs seaweed-filer`.        |
| `X-Cache-Status` missing    | Cache config not loaded. Verify `npm/data/nginx/custom/http_top.conf` exists and restart NPM.|
| SSL certificate fails       | Ensure the DNS A record points to your VPS IP. Ports 80/443 must be open.                    |
| Upload returns `403`        | Wrong S3 credentials. Check `seaweedfs/s3/config.json` matches your client config.           |
| `NoSuchBucket` on upload    | Create the bucket first with `CreateBucketCommand` before uploading.                         |
| Files not found on CDN      | Verify `-buckets.dir=/` is set in the S3 command. Check `docker compose logs seaweed-s3`.    |
| Cache not working           | Ensure `http_top.conf` exists at `npm/data/nginx/custom/`. Restart NPM after creating it.    |
