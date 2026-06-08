// ===== King of 3D – varukorg =====
// Enkel varukorg som sparas i webbläsaren (localStorage).
// Byt mejladressen nedan till Lukas riktiga adress:
const BESTALLNINGS_MEJL = "lukas@example.com";

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

  document.getElementById("cartTotal").textContent = cartTotal() + " kr";
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

// Skicka beställning via ett färdigt mejl
function checkout() {
  const names = Object.keys(cart);
  if (names.length === 0) {
    alert("Din varukorg är tom – lägg till något först!");
    return;
  }
  let text = "Hej Lukas! Jag vill beställa:\n\n";
  names.forEach(function (name) {
    const item = cart[name];
    text += "- " + item.qty + " x " + name + " (" + item.price + " kr/st)\n";
  });
  text += "\nTotalt: " + cartTotal() + " kr\n\n";
  text += "Önskade färger: \n";
  text += "Mitt namn: \n";
  text += "Leveransadress: \n";

  const lank =
    "mailto:" + BESTALLNINGS_MEJL +
    "?subject=" + encodeURIComponent("Beställning från King of 3D") +
    "&body=" + encodeURIComponent(text);
  window.location.href = lank;
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

  renderCart();
});
