# Botnet Development & Operation

## Botnet Architecture Overview

Botnet = network of compromised machines (bots) controlled via C2 (Command & Control). Components: bots, C2 server, admin panel, loader, update mechanism. Topologies: centralized (single C2, easier to takedown), decentralized (P2P, resilient), hybrid (multiple C2 tiers). Modern botnets use domain flux, DGA, and HTTPS for C2.

## C2 Communication Protocols

HTTPS with custom API paths (mimics legit API). WebSocket for persistent low-latency channels. DNS tunneling (queries encode commands in subdomains). ICMP tunneling (data in echo packets). P2P (libp2p, custom protocols). Signal/Telegram bots as C2 relay. MQTT for IoT botnets. Stealth: mimic Google Analytics, Cloudflare, or CDN traffic patterns.

## C2 Infrastructure

Fronting: use Cloudflare/Cloudfront/Akamai to proxy C2 traffic. Bulletproof hosting in Russia/Ukraine/SE Asia. Compromised WordPress sites as relay (PHP shell + cron). Discord/Telegram channels for command broadcast. Pastebin/GitHub Gist for dynamic config updates. IPFS/Arweave for decentralized config storage. NGINX reverse proxy with SNI filtering.

## Bot Installation & Persistence

Delivery: exploit kit, phishing, drive-by download, USB drop, supply chain. Persistence: scheduled tasks (Windows Task Scheduler), systemd services (Linux), LaunchAgents (macOS), registry Run keys, WMI event subscriptions, DLL hijacking, bootkit/UEFI. Hide as legit software: svchost.exe, googleupdate.exe, systemd service with legit names.

## Bot Communication Flow

Bot behavior: sleep random 60-600s, fetch C2 URL from DGA/DNS, send beacon (host info via HTTPS POST), receive tasks, execute, report. Jitter: +/- 30% of sleep interval. Use TLS with custom CA or LetsEncrypt for legit certs. User-Agent mimicking real browsers (Chrome 122+). Accept-Encoding: gzip for small payloads.

## Domain Generation Algorithm (DGA)

Algorithm generates hundreds of domain seeds daily. TLDs: .com, .xyz, .top, .info. Seeded by date (YYYY-MM-DD + custom seed). Bot tries each until one resolves. Attacker registers 1-5 domains ahead. DGA families: Conficker, Locky, Kraken. Implement with SHA256 truncation or TOR-based DGA. Fallback: hardcoded seed domains.

## Encryption & Obfuscation

Traffic: TLS between bot and fronting CDN/forwarder. Config: AES-256-GCM encrypted, key derived from bot ID + server seed. Admin panel: HTTPS behind Cloudflare Access or similar. Bot binary: packers (UPX, Themida), crypters, polymorphic encoder. Strings encrypted with XOR+base64. API path generated per session.

## Bot Capabilities

Core: reverse shell, file upload/download, keylogging, screenshot, credential steal (Chrome cookies, saved passwords, RDP creds). DDoS: HTTP flood, SYN flood, UDP amplification, DNS amplification. Proxy: SOCKS5 proxy for traffic relay. Crypto miner: Monero (XMRig) with pool proxy. Spread: SMB worm, SSH brute, vulnerability scanner.

## Loader Mechanism

Stage 0: dropper (small, <50KB, downloads stage 1). Stage 1: loader (obfuscated, downloads config + main binary). Stage 2: core bot (full functionality). Staging prevents AV from analyzing the full binary. Staged delivery via paste sites, hacked sites, CDN (Cloudflare R2, AWS S3). URLs updated frequently.

## Anti-Detection & AV Evasion

Avoid: running in VM/sandbox (check MAC vendor, disk <60GB, RAM <2GB, debugger present). Delay execution by 5-30 minutes. Signatures: use custom packer (not UPK/UPX), compile with MSVC static libs, sign with stolen cert. Behavior: mimic legit app (e.g. fake Chrome updater). AMSI bypass via patching or memory scraping.

## Botnet CnC Admin Panel

Features: bot statistics (online/offline/country), command broadcast, file deployment, proxy list, report viewer (stolen data), DDoS controls, crypto wallet, real-time map. Tech stack: PHP backend with MySQL, Python FastAPI, Node.js/Express. Admin panel behind 2FA (Google Authenticator). Login rate-limited to 3 attempts.

## DDoS Capabilities

Layer 7: HTTP flood (GET/POST random paths), Slowloris (slow headers), HTTP/2 rapid reset (CVE-2023-44487). Layer 4: SYN flood, UDP flood, ICMP flood, amplification (DNS/NTP/Memcached 50x amplification). Custom: use legit User-Agents, random IPs, spoofed headers. Rate: 100k-1M requests per second from 10k bots.

## Credential Theft Module

Targets: Chrome/Edge/Firefox cookies, saved passwords, credit cards. RDP credentials from Credential Manager. Windows DPAPI master key extraction. Browser cookie decryption (AES-GCM with key from OS storage). Output: base64 encoded, exfil via HTTPS POST to C2. Frequency: collect on bot start, then every 6h.

## Cryptominer Module

XMRig compiled as service with: custom pool URL, low CPU usage (25-50% to avoid detection), wallet address, TLS pool connection. Profit: 1-5 USD per bot per month (varies with XMR price). Miner persistence: service with random name. Kill switch: C2 command to stop miner when user activity detected.

## Proxy Module

SOCKS5 proxy on bot machine. Whitelist: C2 controlled IPs. Bandwidth: unlimited, monitored. Purpose: relay for C2 traffic, purchase fraud, account creation. Proxy list available on admin panel. Authentication: per-user proxy creds or IP whitelist. Check: speed test, geolocation.

## Persistence — Linux

systemd service file in /etc/systemd/system/[random-name].service. Cron job in /etc/cron.d/[hidden-name] or user crontab. LD_PRELOAD library hooking. Rootkit via kernel module (LKM). ~/.bashrc sourcing. SSH authorized_keys injection. Docker escape via privileged container mounting host filesystem.

## Persistence — Windows

Run key: HKCU\Software\Microsoft\Windows\CurrentVersion\Run. Scheduled Task: schtasks /create. WMI persistence: __EventFilter + __FilterToConsumerBinding. Service: sc create [name] binPath="..." start=auto. Startup folder: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup. Bootkit: modify Master Boot Record. DLL hijacking: replace system DLL with payload.

## Network Evasion

Traffic mimics: Google services (Googlebot User-Agent, *.google.com SNI), Cloudflare CDN, CDN traffic patterns. Packets: random TTL, correct TCP window sizes, no unusual flags. Rate limiting: max 1 connection per 10s to C2. Avoid: scanning internal networks, noisy port scans. Use legit DNS resolvers (8.8.8.8, 1.1.1.1).

## OPSEC — Operational Security

No personal devices, VPN for C2 admin access, dedicated VPS registered with fake info. Cryptocurrency: Monero (XMR) only, never BTC/ETH. Split roles: C2 admin, bot developer, loader operator (separation minimizes risk). Encryption at rest for all config files. No real identities in code comments or commit messages.

## Botnet Monetization

DDoS-as-a-Service (rent botnet per hour: $50-500). Proxy selling (SOCKS5 residential proxies: $0.50/IP). Credential theft (bank accounts, credit cards, crypto wallets). Cryptomining (slow but steady). Ransomware deployment (big payout). Click fraud (ad impressions). Loader service (sell access to other criminals).

## Telegram Bot for C2

Telegram Bot API as lightweight C2. Bot token hardcoded or config URL. Commands via chat: /status, /run [cmd], /upload [file]. Exfil via document upload. Encrypted payloads before Telegram. Pros: resilient (Telegram servers always up), free, DDOS-protected. Cons: rate limited (20 msg/min per bot), message history logged.

## P2P Botnet Architecture

No central C2 — bots find peers via DHT (Kademlia) or gossip protocol. Each bot: mine for tasks, propagate results. Bootstrap: hardcoded seed nodes. Pros: no single point of failure, hard to takedown. Cons: slower command propagation, higher detection via P2P traffic patterns. Implement using libp2p (IPFS stack).

## IoT Botnet (Mirai-style)

Target: SSH/Telnet default creds (root:root, admin:admin, support:support). Exploitation scanning: random IPs on port 22/23/2323. Payload: ELF binary for ARM/MIPS/MIPSEL/x86. C2 via IRC or custom TCP. Attack: UDP flood, SYN flood, GRE flood, DNS amplification. IoT botnets largest DDoS capacity (500k+ devices).

## Fast-Flux DNS

Rapid DNS changes for C2 domain. Single flux: A record changes each TTL. Double flux: NS + A records rotate. Flux agents: compromised machines as redirectors. TTL: 60-180 seconds. Purpose: bypass IP blacklisting. Detection: NS record history shows high churn. Implementation: programmatic DNS via cheap domain registrar API.
