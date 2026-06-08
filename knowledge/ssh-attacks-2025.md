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

## SSH Over DNS Tunneling

Tools: iodine, dnscat2 for SSH over DNS when direct SSH blocked. SSH over DNS using DNS queries to tunnel SSH traffic. Requires controlled DNS server. Detection: unusual DNS query patterns, large TXT record responses, high DNS traffic volume. Defense: monitor DNS query sizes, restrict DNS resolution to authorized resolvers, inspect TXT record payloads.
