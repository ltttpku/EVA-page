"use strict";

const results = {
  qwen: {
    name: "Qwen2.5-VL-7B",
    rows: [
      ["Direct inference", 45.0, 61.2, 46.4, 85.9],
      ["Self-Refine", 45.8, 61.5, 48.8, 84.0],
      ["MAD-Vote", 44.7, 57.4, 37.8, 74.1],
      ["MAD-Judge", 47.4, 62.3, 50.2, 83.5],
      ["MUG", 50.3, 63.8, 53.8, 87.4],
      ["EVA", 51.4, 64.3, 54.4, 87.3],
    ],
  },
  internvl: {
    name: "InternVL3-14B",
    rows: [
      ["Direct inference", 59.8, 68.7, 55.1, 89.5],
      ["Self-Refine", 45.9, 61.2, 54.1, 89.2],
      ["MAD-Vote", 55.2, 62.9, 55.2, 88.8],
      ["MAD-Judge", 60.2, 68.9, 56.4, 90.6],
      ["MUG", 60.7, 69.1, 58.0, 91.1],
      ["EVA", 62.7, 69.1, 58.8, 88.9],
    ],
  },
};

const tabs = [...document.querySelectorAll("[data-backbone]")];
function selectBackbone(backbone) {
  const selected = results[backbone];
  if (!selected) return;
  for (const tab of tabs) {
    const active = tab.dataset.backbone === backbone;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  document.getElementById("table-backbone").textContent = selected.name;
  document.getElementById("benchmark-panel").setAttribute("aria-labelledby", `tab-${backbone}`);
  const body = document.getElementById("benchmark-body");
  body.replaceChildren(...selected.rows.map(([name, ...values]) => {
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = name;
    row.append(heading);
    if (name === "EVA") {
      row.className = "eva-row";
      const ours = document.createElement("span");
      ours.textContent = "Ours";
      heading.append(" ", ours);
    }
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value.toFixed(1);
      row.append(cell);
    }
    return row;
  }));
  const labels = ["MMMU", "MMStar", "HallusionBench", "POPE F1"];
  ["mmmu", "mmstar", "hallusion", "pope"].forEach((id, index) => {
    const difference = selected.rows.at(-1)[index + 1] - selected.rows[0][index + 1];
    const value = `${difference >= 0 ? "+" : ""}${difference.toFixed(1)}`;
    const label = document.createElement("small");
    label.textContent = labels[index];
    const gain = document.getElementById(`gain-${id}`);
    gain.classList.toggle("negative", difference < 0);
    gain.replaceChildren(`${value} `, label);
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectBackbone(tab.dataset.backbone));
  tab.addEventListener("keydown", (event) => {
    let target;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) target = tabs[(index + 1) % tabs.length];
    if (event.key === "Home") target = tabs[0];
    if (event.key === "End") target = tabs.at(-1);
    if (target) {
      event.preventDefault();
      selectBackbone(target.dataset.backbone);
      target.focus();
    }
  });
});

const menu = document.querySelector(".menu-toggle");
const navLinks = document.getElementById("nav-links");
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Open navigation");
  menu.title = "Open navigation";
  navLinks.classList.remove("open");
}
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  navLinks.classList.toggle("open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  menu.title = open ? "Close navigation" : "Open navigation";
});
navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu();
});
document.addEventListener("click", event => {
  if (!event.target.closest(".navigation")) closeMenu();
});

const dialog = document.getElementById("figure-dialog");
const dialogImage = document.getElementById("dialog-image");
let originatingFigure;
document.querySelectorAll("[data-figure]").forEach(link => {
  link.addEventListener("click", event => {
    if (!dialog.showModal) return;
    event.preventDefault();
    originatingFigure = link;
    dialogImage.src = link.href;
    dialogImage.alt = link.querySelector(".paper-figure").alt;
    dialogImage.classList.remove("zoomed");
    document.getElementById("dialog-caption").textContent = link.dataset.caption;
    dialog.showModal();
    document.body.classList.add("dialog-open");
  });
});
document.getElementById("close-figure").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  }
});
dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  dialogImage.classList.remove("zoomed");
  originatingFigure?.focus({ preventScroll: true });
});
dialogImage.addEventListener("click", () => dialogImage.classList.toggle("zoomed"));

let statusTimer;
function showStatus(message) {
  const status = document.getElementById("status-message");
  clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.add("visible");
  statusTimer = setTimeout(() => status.classList.remove("visible"), 2800);
}
document.getElementById("copy-citation").addEventListener("click", async () => {
  const citation = document.getElementById("bibtex").textContent;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(citation);
  } catch {
    const area = document.createElement("textarea");
    area.value = citation;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    document.getElementById("copy-citation").focus({ preventScroll: true });
    if (!copied) {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById("bibtex"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showStatus("Citation selected");
      return;
    }
  }
  showStatus("Citation copied");
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.querySelectorAll('a[href^="#"]').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-12% 0px -65% 0px" });
  ["overview", "method", "results", "citation"].forEach(id => observer.observe(document.getElementById(id)));
}
