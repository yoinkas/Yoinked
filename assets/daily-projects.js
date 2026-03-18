document.addEventListener("DOMContentLoaded", () => {
  const title = document.querySelector("[data-network-title]");
  const status = document.querySelector("[data-network-status]");
  const copy = document.querySelector("[data-network-copy]");
  const messup = document.querySelector("[data-network-messup]");
  const fix = document.querySelector("[data-network-fix]");
  const connections = document.querySelector("[data-network-connections]");
  const nodes = document.querySelectorAll("[data-network-node]");

  if (!title || !status || !copy || !messup || !fix || !connections || !nodes.length) {
    return;
  }

  const networkData = {
    internet: {
      title: "Internet Edge",
      status: "External endpoints observed",
      copy: "This view groups the outbound HTTPS and service traffic you pasted, but every address is intentionally masked before display.",
      messup: "Raw public IPs are easy to overshare when documenting active connections.",
      fix: "Only masked address blocks are shown here, keeping the pattern visible without publishing exact endpoints.",
      connections: [
        "172.66.x.x over 443",
        "151.101.x.x over 443",
        "104.18.x.x over 443",
        "35.190.x.x over 443",
        "64.233.x.x over 5228",
        "18.97.x.x over 443",
      ],
    },
    router: {
      title: "Router / Gateway",
      status: "Active hardening target",
      copy: "Your local host traffic fans out from the same internal segment, which makes the gateway the choke point for DNS control, admin access, and egress policy.",
      messup: "It is easy to focus on endpoints and forget that weak router defaults leak risk across the whole network.",
      fix: "Review gateway admin exposure, firmware state, DNS settings, and segment rules before chasing one-off hosts.",
      connections: [
        "Internal client block: 192.168.x.x",
        "Primary outbound traffic: mostly 443",
        "One observed push-style connection: remote port 5228",
      ],
    },
    firewall: {
      title: "Firewall Rules",
      status: "Needs regular cleanup",
      copy: "The connection set is mostly encrypted outbound traffic, which is exactly where sloppy allow rules and forgotten exceptions tend to hide.",
      messup: "Temporary allows often stay in place after testing, especially around browser traffic and local service bridges.",
      fix: "Review outbound rules by app or process, then document why each exception exists before keeping it.",
      connections: [
        "Review outbound 443-heavy processes",
        "Check loopback listeners around 8089",
        "Revalidate local-only service access on 127.0.x.x",
      ],
    },
    workstation: {
      title: "External TLS Sessions",
      status: "User workstation activity",
      copy: "This groups the non-loopback sessions from 192.168.x.x to multiple remote 443 endpoints, which is the clearest representation of your workstation’s outbound activity.",
      messup: "Without grouping, the list looks noisy and hides repeated destinations.",
      fix: "Cluster similar destinations together first, then investigate the highest-frequency blocks and unusual ports.",
      connections: [
        "192.168.x.x -> 172.66.x.x:443",
        "192.168.x.x -> 151.101.x.x:443",
        "192.168.x.x -> 104.18.x.x:443",
        "192.168.x.x -> 208.103.x.x:443",
        "192.168.x.x -> 52.96.x.x:443",
      ],
    },
    loopback: {
      title: "Loopback Services",
      status: "Local service mesh detected",
      copy: "The 127.0.x.x traffic shows several local inter-process connections, including repeated activity tied to port 8089 and a cluster around 61958.",
      messup: "Loopback traffic is easy to ignore even though it often reveals helper services, proxies, or local control channels.",
      fix: "Track which local ports are expected, then remove or disable the ones you cannot explain.",
      connections: [
        "127.0.x.x <-> 127.0.x.x:61958",
        "127.0.x.x <-> 127.0.x.x:8089",
        "127.0.x.x <-> 127.0.x.x:8194",
        "Local-only process chatter across 620xx ports",
      ],
    },
    process18148: {
      title: "High-Chatter PID 18148",
      status: "Most active outbound process",
      copy: "PID 18148 appears repeatedly across many external destinations, which makes it the best single place to investigate normal versus unexpected behavior.",
      messup: "High-volume outbound processes blend into the background if you only scan by remote IP.",
      fix: "Pivot on the owning process first, then compare its destinations and ports against expected application behavior.",
      connections: [
        "PID 18148 -> 172.66.x.x:443",
        "PID 18148 -> 23.40.x.x:443",
        "PID 18148 -> 35.155.x.x:443",
        "PID 18148 -> 109.176.x.x:443",
        "PID 18148 -> 64.233.x.x:5228",
      ],
    },
    mixedapps: {
      title: "Mixed App Traffic",
      status: "Several other processes are active",
      copy: "Other process IDs in your paste show a spread of HTTPS destinations, including Cloudflare ranges, Microsoft ranges, and several less-obvious remote networks.",
      messup: "When multiple apps overlap on 443, it is easy to assume they are all the same class of traffic.",
      fix: "Correlate each PID with its binary name locally, then keep the GUI masked while documenting what each cluster does.",
      connections: [
        "PID 2212 -> 162.159.x.x:443 and 54.187.x.x:443",
        "PID 3788 -> 195.181.x.x / 109.61.x.x / 89.187.x.x over 443",
        "PID 7752 -> 208.103.x.x:443",
        "PID 8556 -> 52.96.x.x and 52.110.x.x over 443",
        "PID 13260 / 23372 / 4508 / 4592 show additional 443 traffic",
      ],
    },
  };

  function renderNode(nodeId) {
    const selected = networkData[nodeId];
    if (!selected) {
      return;
    }

    title.textContent = selected.title;
    status.textContent = selected.status;
    copy.textContent = selected.copy;
    messup.textContent = selected.messup;
    fix.textContent = selected.fix;
    connections.innerHTML = selected.connections
      .map((entry) => `<li>${entry}</li>`)
      .join("");

    nodes.forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.networkNode === nodeId);
    });
  }

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      renderNode(node.dataset.networkNode);
    });
  });

  renderNode("router");
});
