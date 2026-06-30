// ===== King of 3D – varukorg =====
// Enkel varukorg som sparas i webbläsaren (localStorage).
// Byt mejladressen nedan till Lukas riktiga adress:
const BESTALLNINGS_MEJL = "lukas.b.runbom@gmail.com";

// Hämta sparad varukorg (eller en tom)
let cart = JSON.parse(localStorage.getItem("kingof3d_cart") || "{}");

// Spara varukorgen
function saveCart() {
  localStorage.setItem("kingof3d_cart", JSON.stringify(cart));
}

// Lägg till en vara
function addToCart(name, price) {
  if (cart[name]) {
    cart[name].qty += 1;
  } else {
    cart[name] = { price: price, qty: 1 };
  }
  saveCart();
  renderCart();
  openCart();
}

// Ändra antal (delta = +1 eller -1)
function changeQty(name, delta) {
  if (!cart[name]) return;
  cart[name].qty += delta;
  if (cart[name].qty <= 0) {
    delete cart[name];
  }
  saveCart();
  renderCart();
}

// Räkna ut totalsumman
function cartTotal() {
  let total = 0;
  for (const name in cart) {
    total += cart[name].price * cart[name].qty;
  }
  return total;
}

// Rita upp varukorgen i panelen
function renderCart() {
  const itemsBox = document.getElementById("cartItems");
  const names = Object.keys(cart);

  // Antal-bubblan i toppen
  let antal = 0;
  names.forEach((n) => (antal += cart[n].qty));
  document.getElementById("cartCount").textContent = antal;

  // Tom varukorg
  if (names.length === 0) {
    itemsBox.innerHTML = '<p class="cart-empty">Din varukorg är tom 🛒<br>Lägg till en pryl för att börja!</p>';
  } else {
    itemsBox.innerHTML = names
      .map(function (name) {
        const item = cart[name];
        return (
          '<div class="cart-item">' +
            '<div class="cart-item-info">' +
              '<strong>' + name + '</strong>' +
              '<span>' + item.price + ' kr/st</span>' +
            '</div>' +
            '<div class="qty">' +
              '<button class="qty-btn" data-name="' + name + '" data-delta="-1">−</button>' +
              '<span class="qty-num">' + item.qty + '</span>' +
              '<button class="qty-btn" data-name="' + name + '" data-delta="1">+</button>' +
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

// Skicka beställning – skickas direkt till butikens inkorg via FormSubmit
function checkout() {
  const names = Object.keys(cart);
  const status = document.getElementById("cartStatus");
  if (names.length === 0) {
    alert("Din varukorg är tom – lägg till något först!");
    return;
  }

  const namn = (document.getElementById("kundNamn").value || "").trim();
  const kontakt = (document.getElementById("kundKontakt").value || "").trim();
  const adress = (document.getElementById("kundAdress").value || "").trim();
  const meddelande = (document.getElementById("kundMeddelande").value || "").trim();

  if (!namn || !kontakt) {
    status.className = "cart-status fel";
    status.textContent = "Fyll i ditt namn och en kontaktuppgift först.";
    return;
  }

  let orderLines = "";
  names.forEach(function (name) {
    const item = cart[name];
    orderLines += item.qty + " x " + name + " (" + item.price + " kr/st)\n";
  });
  const frakt = cartTotal() >= 300 ? "Fri frakt" : "Frakt tillkommer (beställning under 300 kr)";

  const btn = document.getElementById("checkoutBtn");
  btn.disabled = true;
  status.className = "cart-status";
  status.textContent = "Skickar din beställning…";

  fetch("https://formsubmit.co/ajax/" + BESTALLNINGS_MEJL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: "Ny beställning – King of 3D",
      _template: "table",
      _captcha: "false",
      Namn: namn,
      Kontakt: kontakt,
      Leveransadress: adress || "-",
      "Önskemål / meddelande": meddelande || "-",
      Beställning: orderLines,
      Totalt: cartTotal() + " kr",
      Frakt: frakt,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function () {
      cart = {};
      saveCart();
      renderCart();
      ["kundNamn", "kundKontakt", "kundAdress", "kundMeddelande"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      status.className = "cart-status ok";
      status.textContent = "✅ Tack! Din beställning är skickad – vi hör av oss snart.";
      btn.disabled = false;
    })
    .catch(function () {
      status.className = "cart-status fel";
      status.textContent = "Kunde inte skicka just nu. Försök igen, eller mejla oss på " + BESTALLNINGS_MEJL + ".";
      btn.disabled = false;
    });
}

// ===== Koppla ihop knappar när sidan laddat =====
document.addEventListener("DOMContentLoaded", function () {
  // "Lägg i varukorg"-knapparna
  document.querySelectorAll(".card").forEach(function (card) {
    const btn = card.querySelector(".add-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      addToCart(card.dataset.name, Number(card.dataset.price));
    });
  });

  // Plus/minus inne i varukorgen (funkar även för nya rader)
  document.getElementById("cartItems").addEventListener("click", function (e) {
    const btn = e.target.closest(".qty-btn");
    if (!btn) return;
    changeQty(btn.dataset.name, Number(btn.dataset.delta));
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

  // ===== Admin-läge: bara Björn kan ändra pris, nyhet och rea =====
  const ADMIN_LOSEN = "King3D";          // byt gärna – säg till mig
  const ADMIN_NYCKEL = "kingof3d_admin";

  function laddaAdmin() { return JSON.parse(localStorage.getItem(ADMIN_NYCKEL) || "{}"); }
  function sparaAdmin() { localStorage.setItem(ADMIN_NYCKEL, JSON.stringify(adminMap)); }

  // Läs ursprungligt läge (pris, ev. rea, ev. nyhet) från HTML
  function startState(card) {
    const struket = card.querySelector(".price s");
    return {
      pris: parseInt(card.dataset.price, 10),
      ordPris: struket ? parseInt(struket.textContent, 10) : null,
      nyhet: !!card.querySelector(".new-badge")
    };
  }

  function renderCard(card, s) {
    card.dataset.price = s.pris;
    // håll kategorin "nyheter" i synk med nyhet-flaggan
    let cats = (card.dataset.category || "").split(" ").filter(function (c) { return c && c !== "nyheter"; });
    if (s.nyhet) cats.push("nyheter");
    card.dataset.category = cats.join(" ");
    // rensa gamla brickor
    const oN = card.querySelector(".new-badge"); if (oN) oN.remove();
    const oS = card.querySelector(".sale-badge"); if (oS) oS.remove();
    if (s.nyhet) {
      const b = document.createElement("span");
      b.className = "new-badge"; b.textContent = "NYHET";
      card.insertBefore(b, card.firstChild);
    }
    const priceEl = card.querySelector(".price");
    if (s.ordPris && s.ordPris > s.pris) {
      const proc = Math.round((s.ordPris - s.pris) / s.ordPris * 100);
      const sb = document.createElement("span");
      sb.className = "sale-badge"; sb.textContent = "-" + proc + "%";
      card.insertBefore(sb, card.firstChild);
      priceEl.innerHTML = '<s>' + s.ordPris + ' kr</s> <strong class="sale-price">' + s.pris + ' kr</strong>';
    } else {
      priceEl.textContent = s.pris + " kr";
    }
  }

  function uppdateraKnappar(card) {
    const s = states[card.dataset.name];
    const nB = card.querySelector(".adm-nyhet");
    const rB = card.querySelector(".adm-rea");
    if (nB) nB.classList.toggle("active", !!s.nyhet);
    if (rB) rB.classList.toggle("active", !!(s.ordPris && s.ordPris > s.pris));
  }

  function spara(card) {
    adminMap[card.dataset.name] = states[card.dataset.name];
    sparaAdmin();
    renderCard(card, states[card.dataset.name]);
    uppdateraKnappar(card);
  }

  function injectControls(card) {
    const namn = card.dataset.name;
    const wrap = document.createElement("div");
    wrap.className = "admin-controls";
    wrap.innerHTML =
      '<button class="adm-btn adm-pris">✏️ Pris</button>' +
      '<button class="adm-btn adm-nyhet">⭐ Nyhet</button>' +
      '<button class="adm-btn adm-rea">🏷️ REA</button>';
    card.appendChild(wrap);

    wrap.querySelector(".adm-pris").addEventListener("click", function () {
      const v = prompt('Pris för "' + namn + '" (kr):', states[namn].pris);
      if (v === null) return;
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0) { alert("Skriv bara siffror."); return; }
      states[namn].pris = n; spara(card);
    });

    wrap.querySelector(".adm-nyhet").addEventListener("click", function () {
      states[namn].nyhet = !states[namn].nyhet; spara(card);
    });

    wrap.querySelector(".adm-rea").addEventListener("click", function () {
      const s = states[namn];
      if (s.ordPris && s.ordPris > s.pris) {
        const r = prompt('Reapris för "' + namn + '" (kr). Lämna tomt för att ta bort rean:', s.pris);
        if (r === null) return;
        if (r.trim() === "") { s.ordPris = null; }
        else { const n = parseInt(r, 10); if (isNaN(n) || n < 0) { alert("Bara siffror."); return; } s.pris = n; }
      } else {
        const o = prompt('Ordinarie pris (det överstrukna) för "' + namn + '":', s.pris);
        if (o === null) return;
        const ord = parseInt(o, 10); if (isNaN(ord) || ord < 0) { alert("Bara siffror."); return; }
        const r = prompt('Reapris (det nya, lägre priset):', "");
        if (r === null) return;
        const sale = parseInt(r, 10); if (isNaN(sale) || sale < 0) { alert("Bara siffror."); return; }
        if (sale >= ord) { alert("Reapriset måste vara lägre än ordinarie."); return; }
        s.ordPris = ord; s.pris = sale;
      }
      spara(card);
    });

    uppdateraKnappar(card);
  }

  // Initiera alla kort
  const adminMap = laddaAdmin();
  const states = {};
  document.querySelectorAll("#produkter .card").forEach(function (card) {
    const namn = card.dataset.name;
    // Koden (det publicerade priset) är alltid sanningen som visas.
    // Inloggat läge kan förhandsvisa ändringar, men de sparas inte över omladdning.
    states[namn] = startState(card);
    renderCard(card, states[namn]);
    injectControls(card);
  });

  let adminPa = false;
  function setAdmin(on) {
    adminPa = on;
    document.getElementById("adminBar").hidden = !on;
    document.body.classList.toggle("admin-on", on);
    const lnk = document.getElementById("adminLink");
    lnk.classList.toggle("active", on);
    lnk.textContent = on ? "🔓" : "👤";
    lnk.setAttribute("aria-label", on ? "Logga ut" : "Logga in");
    lnk.title = on ? "Logga ut" : "Logga in";
  }
  document.getElementById("adminLink").addEventListener("click", function () {
    if (adminPa) { setAdmin(false); return; }
    const svar = prompt("Ange admin-lösenord:");
    if (svar === ADMIN_LOSEN) setAdmin(true);
    else if (svar !== null) alert("Fel lösenord.");
  });
  document.getElementById("adminLogout").addEventListener("click", function () { setAdmin(false); });

  renderCart();
});
