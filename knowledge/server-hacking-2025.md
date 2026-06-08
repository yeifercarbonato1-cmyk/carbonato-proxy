# Server Hacking 2025-2026

## Top 5 Zero-Day Exploits 2025

Five major vulnerabilities defined the 2025 landscape. Oracle EBS CVE-2025-61882 (CVSS 9.8): improper authentication in Oracle Concurrent Processing exploited by CL0P for extortion and Scattered Lapsus$ Hunters. React Server React2Shell CVE-2025-55182 (CVSS 10): deserialization RCE in React Server Components 19.x exploited by China-nexus Earth Lamia and Jackpot Panda within hours of disclosure. SAP NetWeaver CVE-2025-31324 (CVSS 10): unrestricted file upload via JSP webshells exploited by Chaya_004, BianLian, RansomEXX. Microsoft SharePoint ToolShell CVE-2025-53770 (CVSS 9.8): deserialization RCE bypassing July Patch Tuesday fixes, attributed to Linen Typhoon, Violet Typhoon, Storm-2603. Citrix NetScaler CitrixBleed2 CVE-2025-5777 (CVSS 9.3): out-of-bounds read leaking sensitive data, first exploited June 2025.

## 884 KEVs in 2025

VulnCheck State of Exploitation 2026 report: 884 Known Exploited Vulnerabilities identified with first-time exploitation during 2025 across 518 vendors and 672 products. 28.96% exploited on or before CVE publication day (up from 23.6% in 2024). 118 unique sources first reported exploitation. CISA KEV only tracked 245. Attackers exploit before patches are even announced. Top targeted: network edge devices, WordPress CMS, open source software, Windows/Linux OS, hardware/camera systems.

## Vulnerability Exploits Overtake Phishing 2026

For first time in 2026, vulnerability exploits overtook phishing as primary initial access method. Q3 2025 rate hit 62% driven by ToolShell attacks. Window between disclosure and exploitation shrinking toward Day 0. 32.1% of exploited CVEs in H1 2025 showed activity on or before disclosure day. Traditional patching is failing. Edge devices are primary targets because they sit at network perimeter. Attackers use automated AI-driven scanning to find and weaponize vulns within hours.

## React2Shell Deep Dive CVE-2025-55182

CVSS 10, unauthenticated RCE in Meta React Server Components 19.0.0-19.2.0. Discovered November 29 2025, disclosed and patched December 3 2025. Within hours Amazon threat intel observed rapid exploitation. Earth Lamia and Jackpot Panda deployed cryptominers, Linux backdoors, reverse proxy tunnels, Go-based implants, and botnet variants. Attack vector: deserialization of untrusted data in React Server Components. Lesson: even modern frameworks with security review are vulnerable; patch window is now hours not days.

## Oracle EBS CVE-2025-61882

CVSS 9.8, improper authentication in Oracle Concurrent Processing BI Publisher Integration. First observed exploitation August 9 2025, activity dating back to July 10. Vendor patch October 4 2025. CL0P group launched massive extortion campaign sending executives emails with genuine file listings from compromised environments. Scattered Lapsus$ Hunters claimed exploit development on Telegram. Enterprise ERP systems are high-value targets because they contain sensitive data and run with elevated privileges.

## SAP NetWeaver CVE-2025-31324

CVSS 10, unrestricted file upload in SAP NetWeaver Visual Composer Metadata Uploader. Unauthenticated upload and execution of JSP webshells for persistent access. First observed exploitation March 12 2025, reconnaissance from January 20. China-linked Chaya_004 and ransomware groups BianLian and RansomEXX involved. SAP systems in enterprises are critical targets for initial access leading to data exfiltration and ransomware deployment.

## Microsoft SharePoint ToolShell CVE-2025-53770

CVSS 9.8, deserialization RCE bypassing Microsoft July 2025 Patch Tuesday fixes for CVE-2025-49706 and CVE-2025-49704 from Pwn2Own Berlin. Attributed to China-aligned Linen Typhoon, Violet Typhoon, and Storm-2603 who deployed ransomware. Demonstrates that patch bypasses are increasingly common; defense must assume single-patch is insufficient.

## Edge Device Exploitation 2025-2026

Firewalls, VPNs, and proxies serve as direct entry points into enterprise networks. CitrixBleed2 CVE-2025-5777: out-of-bounds read in Citrix NetScaler ADC/Gateway configured as AAA virtual server. First exploited June 23 2025. GreyNoise tracked early exploitation from China-geolocated IPs. Patch management for edge devices is critical because they face the internet directly and often run with high privileges.

## Linux Kernel Exploitation 2025-2026

CVE-2025-37899: first LLM-discovered kernel concurrency bug. Remote use-after-free in ksmbd SMB module found by OpenAI o3 with no scaffolding. CVSS 7.2, affects Linux kernel SMB server. Also CVE-2026-46333: ssh-keysign-pwn, fourth SSH-related vulnerability in 2026 affecting Linux kernel components. Kernel exploitation getting easier with LLM-assisted vulnerability research.

## AI-Assisted Server Exploitation 2025-2026

CSA report: threshold from vulnerability discovery to weaponization crossed. LLMs autonomously discover exploitable vulnerabilities in production software, generate working exploit code from CVE descriptions, execute multi-stage network attacks. UIUC study: GPT-4 exploited 87% of one-day vulns with CVE description. Incalmo architecture achieved critical asset acquisition in 37/40 multi-host environments in 12-54 minutes for under $15 API cost. DARPA AIxCC: autonomous systems found 18 novel real-world vulnerabilities.

## Server Hacking General Methodology 2025-2026

Reconnaissance phase: Shodan Censys for exposed services, nuclei templates for known vulns, custom scanning for OSS-specific CVEs. Weaponization phase: feed CVE description to LLM for exploit generation, adapt existing PoCs from GitHub/Exploit-DB. Delivery phase: target edge devices first (VPNs firewalls), then pivot to internal ERP/CMS, use file upload vulns for webshell persistence. Post-exploitation: deploy cryptominers and backdoors, establish reverse proxy tunnels, exfiltrate data via DNS OAST.

## CISA KEV Top Categories 2026

CISA Known Exploited Vulnerabilities January-June 2026: Broadcom, Qlik, Langflow, FXC, Erlang/OTP, Git, Looking Glass, Libraesva, Smartbedded, Meta, Digiever, Gogs, Vite, LiteSpeed, Nx, TanStack, Daemon, Mirasvit, ownCloud, Adobe, Alcatel, Android, Arcadyan, Atlassian, Drupal, Linux, Microsoft, Oracle, PHP, QNAP, SolarWinds, VMware. Wide range from enterprise software to open source libraries to hardware. Prioritize patching based on active exploitation evidence.

## Server Post-Exploitation Persistence 2025-2026

Cryptominers deployed via cron jobs and systemd services. Linux backdoors using Go-based implants for cross-platform compatibility. Reverse proxy tunnels (ngrok, frp, chisel) for C2 communication. JSP webshells on Java application servers. SSH key backdoors in authorized_keys. Rootkit installation via kernel module loading. DNS tunneling for data exfiltration bypassing network monitoring.

## Zero-Day to Weaponization Timeline

CVE publication to working exploit: collapsing from weeks to hours. React2Shell weaponized within hours. Oracle EBS exploited before CVE publication. SAP NetWeaver exploited 6 weeks before public disclosure. CitrixBleed2 possibly exploited before patch. Current average: 28.96% exploited on or before CVE publication day. Defenders have effectively zero window. Strategy shift needed: assume compromise, focus on detection and containment.
