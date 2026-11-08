# Operation Reroute

- Platform: TryHackMe
- Difficulty: Hard
- OS: Linux

I logged into an FRRouting router, originated and advertised the more-specific `10.10.10.10/32` route, then changed its next hop to my Kali host at `192.168.1.100`. After assigning `10.10.10.10/32` to Kali, I ran a UDP/53 listener that impersonated the expected DNS service.

The victim at `192.168.2.100` repeatedly queried:

```text
VEhNe0JHUF9pc19teV9taWRkbGVfbmFtZX0K.flag.sekureapp.thm
```

Decoding the first DNS label revealed:

```text
THM{BGP_is_my_middle_name}
```

The complete recovered walkthrough is preserved in `posts/operation-reroute.html`.
