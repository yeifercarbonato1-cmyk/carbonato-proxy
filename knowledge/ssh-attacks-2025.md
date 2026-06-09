# SSH Attacks 2025-2026

## OpenSSH CVE-2025-26465 MitM

Critical vulnerability in OpenSSH client 6.8p1-9.9p1. Man-in-the-Middle attack when VerifyHostKeyDNS enabled. Function verify_host_key_callback incorrectly assumes success when verify_host_key returns error other than -1. Attacker induces SSH_ERR_ALLOC_FAIL within sshkey_from_private to bypass host key validation. Works regardless of whether impersonated server has SSHFP DNS record. VerifyHostKeyDNS was enabled by default in FreeBSD 2013-2023. Patched in OpenSSH 9.9p2 February 18 2025. Discovered by Qualys Threat Research Unit.

## OpenSSH CVE-2025-26466 DoS

Pre-authentication denial-of-service in OpenSSH 9.5p1-9.9p1. Exploits handling of SSH2_MSG_PING/SSH2_MSG_PONG exchanges. Memory exhaustion: attacker sends stream of PING packets, server queues PONG responses not freed during key exchange. CPU exhaustion: after key exchange, buffer reallocation exhibits O(n^2) complexity causing CPU spike. Can block legitimate SSH connections and lock out server management. Mitigations: configure LoginGraceTime, MaxStartups, PerSourcePenalties. Patched in OpenSSH 9.9p2.

## Erlang OTP SSH CVE-2025-32433 RCE

CVSS 10.0, unauthenticated remote code execution in Erlang/OTP SSH daemon. Root cause: improper state enforcement, server fails to reject post-authentication connection protocol messages (codes >= 80) before authentication complete. Affected versions: OTP before 27.3.3, before 26.2.5.11, before 25.3.2.20. Actively exploited since May 1 2025. 70% of exploitation targets OT networks. 275 vulnerable hosts exposed on public internet. Geographic impact: Japan 99.74% correlation with OT, USA absolute highest volume. Education sector hardest hit (72.7% of triggers). Exploitation in short high-intensity bursts (May 3 6 8 9).

## CVE-2025-32433 Payload Analysis

Two observed payload types. Payload 1: reverse shell via TCP creating bound shell connection for interactive command execution. Payload 2: bash reverse shell connecting to 146.103.40.203:6667 (port associated with botnet C2). Attackers using DNS-based OAST callbacks to validate blind RCE against watchtowr domain. Erlang exec calls using inet:gethostbyname() for DNS callbacks. This is common red team and automated scanning tactic.

## CVE-2026-46333 ssh-keysign-pwn

Fourth SSH vulnerability in 2026 affecting Linux kernel components. ssh-keysign helper program vulnerability. Allows local privilege escalation via improper handling of signing requests. Affects systems with SSH agent forwarding enabled. Patched in recent OpenSSH releases. Demonstrates continued vulnerability discovery in SSH protocol stack.

## Apstra SSH CVE-2025-13914

Juniper Apstra SSH host key validation vulnerability. Insufficient SSH host key validation allows machine-in-the-middle attack on SSH connections from Apstra to managed devices. Affects network automation and management infrastructure. Attackers can intercept and modify network device configurations. Patched by Juniper in April 2026 security bulletin.

## SSH Key Backdoor Persistence

Add attacker public key to ~/.ssh/authorized_keys on compromised servers. Use ssh-keygen to generate key pair, then append public key with echo command or via file write. For persistence on multiple users: write to /root/.ssh/authorized_keys and all /home/*/.ssh/authorized_keys. Hide via dotfile attributes and immutable flag. Detect with: stat on authorized_keys, checking timestamps, auditing /var/log/auth.log for unusual key additions. Defense: use sshd_config directive AuthorizedKeysFile pointing to controlled location, implement SSH audit logging.

## SSH Port Knocking Techniques

Port knocking sequence: knock on ports 7000 8000 9000 then SSH port opens. Tools: knockd on server, knock client. Alternative: single packet authorization (SPA) with fwknop. For stealth: use iptables recent module to track knocks. Evasion: scan all ports then attempt SSH on common knock sequences. Defense: not security control, only obscurity. Combine with proper SSH hardening: disable password auth, use ed25519 keys only.

## SSH Tunneling for Pivoting

Local port forwarding: ssh -L localport:target:targetport user@jumpbox forwards local port through jumpbox to internal target. Remote port forwarding: ssh -R remoteport:internal:port user@publichost exposes internal service on public host. Dynamic forwarding: ssh -D 1080 user@jumpbox creates SOCKS proxy for proxychains. For persistence: autossh maintains tunnel across disconnections. SSH over HTTPS: use sslh to multiplex SSH and HTTPS on same port 443.

## SSH Configuration Hardening Bypass

Common hardening: disable root login PermitRootLogin no. Disable password authentication PasswordAuthentication no. Use key only authentication PubkeyAuthentication yes. Set protocol 2 only. Limit users AllowUsers specificuser. Set MaxAuthTries 3. Set ClientAliveInterval/CountMax 300 2. Use custom port instead of 22. Bypass techniques: if key-based auth only, steal private key from compromised host. If custom port, scan with nmap -sV to identify SSH service. If AllowUsers restricted, target allowed accounts via password reuse or key theft.

## SSH Enumeration Techniques

Banner grabbing: nc -nv target 22 reads SSH banner with version info. nmap ssh-enum-algos script: nmap --script ssh-enum-algos -p 22 target enumerates supported key exchange and encryption algorithms. nmap ssh-hostkey script retrieves host key. nmap ssh2-enum-algos for client-side algorithm enumeration. Weak algorithm detection: diffie-hellman-group1-sha1 and diffie-hellman-group-exchange-sha1 indicate vulnerable configurations. Use ssh-audit tool for comprehensive SSH configuration assessment.

## SSH Brute Force and Credential Attacks

Tool: hydra ssh://target -l user -P wordlist.txt. Tool: medusa. Tool: ncrack. Defenses: fail2ban with sshd jail, denyhosts, rate limiting with iptables hashlimit. Evasion: slow brute force distributed across multiple IPs, proxy rotation via SOCKS chains. Use valid credentials from previous breaches (password reuse). For targeted attacks: collect usernames from OSINT (linkedin, github, company website). Modern SSH attacks focus on credential theft rather than brute force.

## SSH Agent Forwarding Exploitation

SSH agent forwarding allows using local keys through jumpbox. Risk: root on jumpbox can use forwarded agent socket to authenticate to downstream servers. Attack: SSH into jumpbox with agent forwarding, locate SSH_AUTH_SOCK, use ssh-add -l to list loaded keys, then ssh -o ForwardAgent=yes target to use stolen agent. Detection: check for SSH_AUTH_SOCK environment variable. Defense: use ProxyJump instead of agent forwarding, or limit forwarding with ssh_config ForwardAgent no.

## SSH ProxyJump Exploitation

ProxyJump (-J) chaining for multi-hop pivoting: `ssh -J user@jump1,user@jump2 target`. Attack path: compromise jump1 → pivot to jump2 → reach internal target. No agent forwarding needed — ProxyJump passes credentials/keys locally. Detection: check SSH config for ProxyJump directives, audit auth.log for multi-hop connections. Defense: restrict SSH access per-host in ssh_config, monitor unusual connection chains.

## SSH Certificate Authority Attack

Abuse SSH CA signed certs for lateral movement. If CA key compromised, sign certs for any user/principal. Create cert with `ssh-keygen -s ca_key -I id -n user,root -V +52w pubkey.pem`. SSH CA certs bypass authorized_keys. Attack: steal CA private key from CA host, sign backdoor certs, deploy cert to controlled hosts. Detection: monitor all SSH CA sign operations, audit cert validity period. Defense: HSM-protected CA key, short certificate validity, strict principal enforcement.

## SSH Key Discovery Automation

Tools for finding SSH keys on compromised systems: `find / -name "id_rsa" -o -name "id_ed25519" 2>/dev/null`. Search for SSH keys in config files: `grep -r "PRIVATE KEY" /etc /opt /home 2>/dev/null`. Memory extraction: `strings /dev/mem | grep -E "BEGIN.*SSH.*PRIVATE KEY"`. SSH agent socket hijack: `ls -la /tmp/ssh-*` and `SSH_AUTH_SOCK=/tmp/ssh-XXXXX/agent.XXXX ssh-add -l`. Modern tools: secretsdump-style, LaZagne, SessionGopher for PuTTY/WinSCP keys.

## SSH over WebSocket Tunneling

SSH over WebSocket to bypass network restrictions. Use node.js/websocat to convert WebSocket to TCP. Server: `websocat -s 443 ws-listen:0.0.0.0:443 tcp:127.0.0.1:22`. Client: `websocat ws://target:443 tcp:127.0.0.1:2200 & ssh -p 2200 user@127.0.0.1`. Detection: WebSocket traffic to non-standard ports, traffic pattern analysis. Also SSH over HTTP/2, SSH over gRPC for deep packet inspection evasion.

## SSH Session Hijacking

If root on the SSH client machine, hijack established SSH sessions. Attack: `ps aux | grep ssh` find established connections, `ls -la /proc/<PID>/fd/` find the master socket, `gdb -p <PID>` to inject code or duplicate fd. Alternative: with access to user's files, find SSH control master socket in /tmp or ~/.ssh/controlmasters. Detection: monitor SSH socket access across processes. Defense: disable ControlMaster in ssh config, use SSH CA + short-lived certs.

## SSH Config File Attack (CVE-2023-48795)

Terrapin attack: prefix truncation in SSH channel handshake. Affects ChaCha20-Poly1305 and CBC-ETM ciphers. Sequence number manipulation truncates security-relevant messages at connection start. Downgrades: disables keystroke timing obfuscation and port forwarding controls. Mitigation: only use AES-GCM ciphers, update OpenSSH >9.6. Detection: scan for ChaCha20-Poly1305 or CBC-ETM in alg exchange. Fixed in OpenSSH 9.6, libssh 0.10.6, PuTTY 0.80.

## SSH Connection Rate Limiting Evasion

Evade fail2ban/denyhosts: distributed SSH brute force from multiple IPs (botnet). Slow brute: 1 attempt per 5 minutes per IP. Proxy chains: rotating proxies via SOCKS/SHADOWSOCKS. TOR: SSH via torify. Modern evasion: use valid creds from leaks (rockyou2025, COMB) instead of brute force. Defense: enforce key-only authentication, disable password auth completely.

## SSH Jumphost Discovery

Discovery of SSH jump hosts during internal pentest. Scan: `nmap -p 22 --open 10.0.0.0/8` large-scale SSH scanning. SSH service detection: `nmap -sV -p 22 --script ssh-hostkey,banner`. Common bastion configs identified by SSH version >9.x. For cloud: discovery via SSRF metadata (AWS: http://169.254.169.254/latest/meta-data/), SSH-enabled instances via cloud APIs. Kubernetes: `kubectl get pods --all-namespaces | grep ssh`.

## SSH User Enumeration

Determine valid usernames via timing attack on OpenSSH. Pre-2025 OpenSSH versions: different response time for valid vs invalid users with PasswordAuthentication enabled. Also via error message difference: "Permission denied" (user exists) vs "User unknown" (user doesn't exist) depending on sshd_config. Newer technique: timing side-channel via keyboard-interactive auth. Defense: set `LogLevel VERBOSE` to log failed usernames, use `MaxAuthTries 3`.

## SSH Backdoor via PAM Module

Persistence via rogue PAM module on target. Create shared lib intercepting pam_sm_authenticate that accepts a magic password. Place .so in /lib/security/pam_ssh_backdoor.so. Modify /etc/pam.d/sshd to include module. Detection: check PAM config files for unknown modules, verify module hashes. Defense: monitor PAM config changes, use RPM/Deb package verification.

## SSH Client-Side Exploitation

Vulnerable SSH clients when connecting to attacker-controlled server. Pre-2026 vulnerabilities: X11 forwarding exploitation, agent forwarding abuse. New technique: malicious SSH server returns crafted responses triggering buffer overflow in client's handling of server-sent options (environment variables, X11 forwarding). Defense: update SSH client regularly, disable X11 and agent forwarding when connecting to untrusted hosts.

## SSH Over DNS Tunneling

Tools: iodine, dnscat2 for SSH over DNS when direct SSH blocked. SSH over DNS using DNS queries to tunnel SSH traffic. Requires controlled DNS server. Detection: unusual DNS query patterns, large TXT record responses, high DNS traffic volume. Defense: monitor DNS query sizes, restrict DNS resolution to authorized resolvers, inspect TXT record payloads.
