// ===== King of 3D – varukorg =====
// Enkel varukorg som sparas i webbläsaren (localStorage).
// Byt mejladressen nedan till Lukas riktiga adress:
const BESTALLNINGS_MEJL = "lukas.b.runbom@gmail.com";

// Backend som tar emot beställningen, kollar mejl-per-dag-spärren och
// skickar bekräftelsemejlet till kunden (se kingof3d-backend/DEPLOYMENT.md
// steg 4 – byt ut adressen nedan mot den riktiga Vercel-URL:en efter deploy).
const BACKEND_URL = "https://kingof3d-backend.vercel.app";

// Hämta sparad varukorg (eller en tom). Nyckeln är "produktnamn|färg" så att
// samma pryl i olika färger kan ligga som separata rader – se cartKey().
// Gamla sparade varukorgar (från innan färgval fanns) saknar namn/farg-fälten;
// de filtreras defensivt bort nedan (item && item.qty) istället för att
// migreras – en enkel hobbybutik behöver ingen migreringslogik för det.
let cart = JSON.parse(localStorage.getItem("kingof3d_cart") || "{}");

// Bygg varukorgsnyckeln av produktnamn + färg
function cartKey(name, farg) {
  return name + "|" + farg;
}

// Spara varukorgen
function saveCart() {
  localStorage.setItem("kingof3d_cart", JSON.stringify(cart));
}

// Hämta bara giltiga rader (skyddar mot gamla/trasiga localStorage-format)
function cartKeys() {
  return Object.keys(cart).filter(function (k) {
    return cart[k] && cart[k].qty > 0;
  });
}

// Lägg till en vara i en viss färg
function addToCart(name, price, farg) {
  const key = cartKey(name, farg);
  if (cart[key] && cart[key].qty) {
    cart[key].qty += 1;
  } else {
    cart[key] = { price: price, qty: 1, namn: name, farg: farg };
  }
  saveCart();
  renderCart();
  openCart();
}

// Ändra antal (delta = +1 eller -1) för en given varukorgsrad (nyckel)
function changeQty(key, delta) {
  if (!cart[key] || !cart[key].qty) return;
  cart[key].qty += delta;
  if (cart[key].qty <= 0) {
    delete cart[key];
  }
  saveCart();
  renderCart();
}

// Räkna ut totalsumman
function cartTotal() {
  let total = 0;
  cartKeys().forEach(function (key) {
    total += cart[key].price * cart[key].qty;
  });
  return total;
}

// Rita upp varukorgen i panelen
function renderCart() {
  const itemsBox = document.getElementById("cartItems");
  const keys = cartKeys();

  // Antal-bubblan i toppen
  let antal = 0;
  keys.forEach((k) => (antal += cart[k].qty));
  document.getElementById("cartCount").textContent = antal;

  // Tom varukorg
  if (keys.length === 0) {
    itemsBox.innerHTML = '<p class="cart-empty">Din varukorg är tom 🛒<br>Lägg till en pryl för att börja!</p>';
  } else {
    itemsBox.innerHTML = keys
      .map(function (key) {
        const item = cart[key];
        const rubrik = item.namn + (item.farg ? " — " + item.farg : "");
        return (
          '<div class="cart-item">' +
            '<div class="cart-item-info">' +
              '<strong>' + rubrik + '</strong>' +
              '<span>' + item.price + ' kr/st</span>' +
            '</div>' +
            '<div class="qty">' +
              '<button class="qty-btn" data-key="' + key + '" data-delta="-1">−</button>' +
              '<span class="qty-num">' + item.qty + '</span>' +
              '<button class="qty-btn" data-key="' + key + '" data-delta="1">+</button>' +
            '</div>' +
            '<div class="cart-item-sum">' + item.price * item.qty + ' kr</div>' +
          '</div>'
        );
      })
      .join("");
  }

  const total = cartTotal();
  document.getElementById("cartTotal").textContent = total + " kr";

  // Fraktinfo: fri frakt över 300 kr, annars tillkommer frakt
  const ship = document.getElementById("cartShipping");
  if (ship) {
    if (total === 0) {
      ship.textContent = "";
    } else if (total >= 300) {
      ship.textContent = "🎉 Du har fri frakt!";
      ship.classList.add("gratis");
    } else {
      ship.textContent = "📦 Frakt tillkommer – handla för " + (300 - total) + " kr till för fri frakt!";
      ship.classList.remove("gratis");
    }
  }
}

// Öppna / stäng panelen
function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("show");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("show");
}

// Kolla att e-postadressen ser rimlig ut (samma regex som backendens validering.js)
function arEpostGiltig(varde) {
  const v = (varde || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Kolla att telefonnumret är ett realistiskt svenskt mobilnummer (obligatoriskt
// fält – ett tomt värde ska INTE räknas som giltigt, det stoppas av
// tomt-fält-checken i checkout() innan denna funktion ens anropas).
function arTelefonGiltig(varde) {
  const v = (varde || "").trim();

  // Ta bort mellanslag, bindestreck och parenteser (t.ex. 070-1234567 eller +46701234567).
  const siffror = v.replace(/[\s\-()]/g, "");

  // Endast svenska mobilnummer accepteras:
  // - Lokalt format: 07[02369] + 7 siffror (070/072/073/076/079), totalt 10 siffror
  // - Internationellt format: +467[02369] + 7 siffror
  const lokaltRegex = /^07[02369]\d{7}$/;
  const internationelltRegex = /^\+467[02369]\d{7}$/;
  return lokaltRegex.test(siffror) || internationelltRegex.test(siffror);
}

// Spärr: kunder har visat sig klistra in butikens EGNA kontaktuppgifter
// (Lukas Swish-nummer / mejladress) istället för sina egna – blockera det,
// oavsett skrivsätt/skiftläge. Samma logik speglas server-side i
// kingof3d-backend/api/_lib/validering.js (den auktoritativa spärren –
// den här är bara för snabb feedback till en ärlig kund som råkat fel).
const BUTIKENS_TELEFON_NORMALISERAT = "0763969751"; // "076-396 97 51" i cart-note nedan

function normaliseraTelefon(varde) {
  const siffror = (varde || "").trim().replace(/[\s\-()]/g, "");
  if (siffror.indexOf("+46") === 0) return "0" + siffror.slice(3);
  return siffror;
}

function arButikensTelefonnummer(varde) {
  const v = (varde || "").trim();
  if (!v) return false;
  return normaliseraTelefon(v) === BUTIKENS_TELEFON_NORMALISERAT;
}

function arButikensEpost(varde) {
  const v = (varde || "").trim().toLowerCase();
  if (!v) return false;
  return v === BESTALLNINGS_MEJL.trim().toLowerCase();
}

// Spärr: max ordersumma just nu (ägarens beslut). Detta är bara för snabb
// feedback till kunden – den auktoritativa spärren ligger i backendens
// api/_lib/validering.js (den här går att kringgå genom att anropa
// /api/order direkt, så backend kan inte lita på att frontend inte manipulerats).
const MAX_ORDERSUMMA = 600;

// Spärr: max en beställning per enhet per dag (svag spärr, men stoppar lat
// upprepad pranking – kringgås trivialt av den som rensar cache/inkognito).
const SENASTE_BESTALLNING_NYCKEL = "kingof3d_last_order_date";
function idagsDatum() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function harRedanBestalltIdag() {
  return localStorage.getItem(SENASTE_BESTALLNING_NYCKEL) === idagsDatum();
}
function markeraBestalldIdag() {
  localStorage.setItem(SENASTE_BESTALLNING_NYCKEL, idagsDatum());
}

// Skicka beställning – går via backend (/api/order), som mejlar en
// bekräftelselänk till kundens egen adress. Ordern går INTE till Lukas
// inkorg förrän kunden klickar länken (se kingof3d-backend/api/confirm.js).
function checkout() {
  const keys = cartKeys();
  const status = document.getElementById("cartStatus");
  if (keys.length === 0) {
    alert("Din varukorg är tom – lägg till något först!");
    return;
  }

  if (cartTotal() > MAX_ORDERSUMMA) {
    status.className = "cart-status fel";
    status.textContent = "Max ordersumma är " + MAX_ORDERSUMMA + " kr just nu — dela upp i flera beställningar eller minska antalet varor.";
    return;
  }

  const namn = (document.getElementById("kundNamn").value || "").trim();
  const epost = (document.getElementById("kundEpost").value || "").trim();
  const telefon = (document.getElementById("kundTelefon").value || "").trim();
  const adress = (document.getElementById("kundAdress").value || "").trim();
  const meddelande = (document.getElementById("kundMeddelande").value || "").trim();
  const honeypotFalt = document.getElementById("kundWebbplats");
  const honeypot = (honeypotFalt ? honeypotFalt.value : "").trim();

  // Honeypot ifylld = nästan säkert en bot. Låtsas att allt gick bra men
  // gör inget anrop alls, så botten inte lär sig att den avslöjades.
  if (honeypot) {
    cart = {};
    saveCart();
    renderCart();
    ["kundNamn", "kundEpost", "kundTelefon", "kundAdress", "kundMeddelande", "kundWebbplats"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    status.className = "cart-status ok";
    status.textContent = "✅ Tack! Din beställning är skickad – vi hör av oss snart.";
    return;
  }

  if (!namn || !epost || !telefon) {
    status.className = "cart-status fel";
    status.textContent = "Fyll i ditt namn, e-postadress och telefonnummer först.";
    return;
  }

  if (!arEpostGiltig(epost)) {
    status.className = "cart-status fel";
    status.textContent = "Ange en giltig e-postadress.";
    return;
  }

  if (arButikensEpost(epost)) {
    status.className = "cart-status fel";
    status.textContent = "Ange din egen e-postadress, inte butikens.";
    return;
  }

  if (!arTelefonGiltig(telefon)) {
    status.className = "cart-status fel";
    status.textContent = "Ange ett giltigt svenskt mobilnummer, t.ex. 070-1234567 eller +46701234567.";
    return;
  }

  if (arButikensTelefonnummer(telefon)) {
    status.className = "cart-status fel";
    status.textContent = "Ange ditt eget telefonnummer, inte butikens.";
    return;
  }

  if (harRedanBestalltIdag()) {
    status.className = "cart-status fel";
    status.textContent = "Du har redan lagt en beställning idag från den här enheten. Hör av dig direkt till oss om du behöver lägga en till.";
    return;
  }

  const artiklar = keys.map(function (key) {
    const item = cart[key];
    return { namn: item.namn, pris: item.price, antal: item.qty, farg: item.farg };
  });
  const frakt = cartTotal() >= 300 ? "Fri frakt" : "Frakt tillkommer (beställning under 300 kr)";

  const btn = document.getElementById("checkoutBtn");
  btn.disabled = true;
  status.className = "cart-status";
  status.textContent = "Skickar din beställning…";

  fetch(BACKEND_URL + "/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      namn: namn,
      epost: epost,
      telefon: telefon,
      adress: adress,
      meddelande: meddelande,
      artiklar: artiklar,
      totalt: cartTotal(),
      frakt: frakt,
      webbplats: honeypot,
    }),
  })
    .then(function (r) {
      return r.json().then(function (data) { return { status: r.status, data: data }; });
    })
    .then(function (svar) {
      btn.disabled = false;
      if (!svar.data || !svar.data.ok) {
        status.className = "cart-status fel";
        status.textContent =
          (svar.data && svar.data.fel) ||
          "Kunde inte skicka just nu. Försök igen, eller mejla oss på " + BESTALLNINGS_MEJL + ".";
        return;
      }

      markeraBestalldIdag();
      cart = {};
      saveCart();
      renderCart();
      ["kundNamn", "kundEpost", "kundTelefon", "kundAdress", "kundMeddelande", "kundWebbplats"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      status.className = "cart-status ok";
      status.textContent =
        "✅ Kolla din mejl (" + epost + ") och klicka på bekräftelselänken för att slutföra beställningen. Länken är giltig i 48 timmar.";
    })
    .catch(function () {
      status.className = "cart-status fel";
      status.textContent = "Kunde inte skicka just nu. Försök igen, eller mejla oss på " + BESTALLNINGS_MEJL + ".";
      btn.disabled = false;
    });
}

// ===== Färgval =====
// Lukas printar i samma nio filamentfärger oavsett pryl. Prickarna är
// klickbara – kunden väljer en färg per kort (single-select), och den valda
// färgen följer med varan in i varukorgen och beställningen.
// Byggs en gång och klonas in i varje .card istället för att duplicera
// samma HTML nio gånger per kort direkt i index.html – slipper risken att
// missa ett kort eller råka stava fel i en kopia.
const FILAMENT_FARGER = [
  { namn: "Svart", hex: "#111111", kant: true },
  { namn: "Vit", hex: "#ffffff", kant: true },
  { namn: "Blå", hex: "#2563eb" },
  { namn: "Gul", hex: "#facc15", kant: true },
  { namn: "Röd", hex: "#dc2626" },
  { namn: "Grön", hex: "#16a34a" },
  { namn: "Guld", hex: "var(--guld)" },
  { namn: "Orange", hex: "#f97316" },
  { namn: "Turkos", hex: "#14b8a6" },
];

function byggFargprickar() {
  const rad = document.createElement("div");
  rad.className = "color-dots";
  rad.setAttribute("role", "group");
  rad.setAttribute("aria-label", "Välj färg");
  FILAMENT_FARGER.forEach(function (farg) {
    const prick = document.createElement("button");
    prick.type = "button";
    prick.className = "color-dot" + (farg.kant ? " color-dot-kant" : "");
    prick.style.background = farg.hex;
    prick.title = farg.namn;
    prick.setAttribute("aria-label", farg.namn);
    prick.setAttribute("aria-pressed", "false");
    prick.dataset.farg = farg.namn;
    rad.appendChild(prick);
  });
  return rad;
}

// Lägg till färgprickar + en (dold) varningstext per kort, och koppla
// klick på prickarna till val av färg (single-select, sparas på kortet i
// data-vald-farg så add-btn-hanteraren kan läsa av det).
function laggTillFargprickar() {
  document.querySelectorAll(".card").forEach(function (card) {
    if (card.querySelector(".color-dots")) return; // redan tillagd

    const rad = byggFargprickar();
    card.appendChild(rad);

    const varning = document.createElement("p");
    varning.className = "color-required-msg";
    varning.textContent = "Välj en färg innan du lägger i varukorgen";
    varning.hidden = true;
    card.appendChild(varning);

    rad.addEventListener("click", function (e) {
      const prick = e.target.closest(".color-dot");
      if (!prick) return;
      rad.querySelectorAll(".color-dot").forEach(function (d) {
        d.classList.remove("selected");
        d.setAttribute("aria-pressed", "false");
      });
      prick.classList.add("selected");
      prick.setAttribute("aria-pressed", "true");
      card.dataset.valdFarg = prick.dataset.farg;

      // Färg vald – släck ev. kvarvarande "välj färg"-indikation.
      rad.classList.remove("behover-val");
      varning.hidden = true;
    });

    // Tillåt att pulsanimationen kan spelas upp igen om kunden klickar
    // KÖP NU flera gånger utan att välja färg.
    rad.addEventListener("animationend", function () {
      rad.classList.remove("behover-val");
    });
  });
}

// Visa den icke-påträngande "välj en färg"-indikationen på ett kort
function visaFargSaknasIndikation(card) {
  const rad = card.querySelector(".color-dots");
  const varning = card.querySelector(".color-required-msg");
  if (rad) {
    rad.classList.remove("behover-val");
    void rad.offsetWidth; // forcera reflow så animationen kan köras om
    rad.classList.add("behover-val");
  }
  if (varning) varning.hidden = false;
}

// ===== Koppla ihop knappar när sidan laddat =====
document.addEventListener("DOMContentLoaded", function () {
  laggTillFargprickar();

  // "Lägg i varukorg"-knapparna – kräver att en färg är vald på kortet
  document.querySelectorAll(".card").forEach(function (card) {
    const btn = card.querySelector(".add-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const farg = card.dataset.valdFarg;
      if (!farg) {
        visaFargSaknasIndikation(card);
        return;
      }
      addToCart(card.dataset.name, Number(card.dataset.price), farg);
    });
  });

  // Plus/minus inne i varukorgen (funkar även för nya rader)
  document.getElementById("cartItems").addEventListener("click", function (e) {
    const btn = e.target.closest(".qty-btn");
    if (!btn) return;
    changeQty(btn.dataset.key, Number(btn.dataset.delta));
  });

  // Öppna/stäng-knappar
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);

  const catLinks = document.querySelectorAll(".catnav a");

  // Visa hälsningen om en kategori råkar vara tom
  function toggleNoProducts() {
    const synliga = Array.from(document.querySelectorAll("#produkter .card"))
      .some(function (c) { return c.style.display !== "none"; });
    const msg = document.querySelector(".no-products");
    if (msg) msg.hidden = synliga;
  }

  // Markera en kategori-länk som aktiv
  function setActive(link) {
    catLinks.forEach(function (l) { l.classList.remove("active"); });
    if (link) link.classList.add("active");
  }

  // Kategori-menyn: filtrera prylarna
  catLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      const cat = link.dataset.cat;
      setActive(link);
      const searchEl = document.getElementById("searchInput");
      if (searchEl) searchEl.value = "";
      document.querySelectorAll("#produkter .card").forEach(function (card) {
        const cats = (card.dataset.category || "").toLowerCase().split(" ");
        const show = cat === "alla" || cats.indexOf(cat) !== -1;
        card.style.display = show ? "" : "none";
      });
      toggleNoProducts();
    });
  });

  // Sökrutan: filtrera prylarna medan man skriver
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
      setActive(document.querySelector('.catnav a[data-cat="alla"]'));
      document.querySelectorAll("#produkter .card").forEach(function (card) {
        const namn = card.querySelector("h3").textContent.toLowerCase();
        card.style.display = namn.includes(q) ? "" : "none";
      });
      toggleNoProducts();
    });
  }

  // Lightbox: klicka på en produktbild för att se den stort
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");

  function openLightbox(src, namn) {
    lightboxImg.src = src;
    lightboxImg.alt = namn;
    lightboxCaption.textContent = namn;
    lightbox.classList.add("show");
  }
  function closeLightbox() {
    lightbox.classList.remove("show");
  }

  document.querySelectorAll("#produkter .card .card-img.photo img").forEach(function (img) {
    img.addEventListener("click", function () {
      const card = img.closest(".card");
      openLightbox(img.src, card ? card.dataset.name : "");
    });
  });
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  renderCart();
});
