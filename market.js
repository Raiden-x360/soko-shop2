// Drives the storefront: product filtering, category rails, the demo cart, and checkout.
const products = window.marketProducts;
const productCategories = [...new Set(products.map((product) => product.category))];
const storageKey = "soko-cart-v1";
const deliveryFee = 300;
const freeDeliveryThreshold = 5000;
const productGrid = document.getElementById("product-grid");
const cartDialog = document.getElementById("cart-dialog");
const checkoutDialog = document.getElementById("checkout-dialog");
const confirmationDialog = document.getElementById("confirmation-dialog");
const searchInput = document.getElementById("product-search");
const sortSelect = document.getElementById("sort-products");
const filterButtons = [...document.querySelectorAll(".filter-chip")];
let activeCategory = "All";
let toastTimer;

// Restore only valid cart entries and cap quantities at each product's stock.
function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(stored))
      throw new TypeError("Saved cart must be a list.");

    return stored
      .filter((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        return product && Number.isInteger(item.quantity) && item.quantity > 0;
      })
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        return {
          id: item.id,
          quantity: Math.min(item.quantity, product.stock),
        };
      });
  } catch (error) {
    console.error("Could not read the saved Soko cart.", error);
    return [];
  }
}

let cart = readCart();

// Shared formatting and cart-total helpers keep prices consistent across the UI.
function money(amount) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function productById(id) {
  return products.find((product) => product.id === id);
}

function cartQuantity() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function subtotal() {
  return cart.reduce((total, item) => {
    const product = productById(item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function shippingCost(amount = subtotal()) {
  return amount === 0 || amount >= freeDeliveryThreshold ? 0 : deliveryFee;
}

// Apply the selected category, search term, and sort order to the shared catalog.
function visibleProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const result = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.category} ${product.badge}`
      .toLocaleLowerCase()
      .includes(query);
    return matchesCategory && matchesSearch;
  });

  switch (sortSelect.value) {
    case "price-low":
      result.sort((first, second) => first.price - second.price);
      break;
    case "price-high":
      result.sort((first, second) => second.price - first.price);
      break;
    case "name":
      result.sort((first, second) => first.name.localeCompare(second.name));
      break;
    default:
      result.sort(
        (first, second) => Number(second.featured) - Number(first.featured),
      );
  }
  return result;
}

// Build one product card, including its detail link, wishlist control, and quick add.
function renderProductCard(product) {
  return `
    <article class="product-card">
      <div class="product-visual" style="--product-bg:${product.background}">
        <a class="product-art-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View details for ${product.name}">
          <img class="product-art" src="${product.art}" alt="${product.name}" loading="lazy">
        </a>
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
        ${window.sokoWishlist.buttonFor(product)}
        <button class="quick-add" type="button" data-add-product="${product.id}" aria-label="Add ${product.name} to bag">Add to bag&nbsp; +</button>
      </div>
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <div class="product-name-row"><h4 class="product-name"><a href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h4><span class="product-price">${money(product.price)}</span></div>
      </div>
    </article>
  `;
}

// Keep category rail arrows visible and enabled only when the row can scroll that way.
function updateProductScrollControls(row) {
  const controls = row
    .closest(".product-group")
    .querySelector(".product-scroll-controls");
  const [previousButton, nextButton] = controls.querySelectorAll("button");
  const maxScroll = row.scrollWidth - row.clientWidth;
  const canScroll = maxScroll > 1;

  controls.hidden = !canScroll;
  previousButton.disabled = row.scrollLeft <= 1;
  nextButton.disabled = row.scrollLeft >= maxScroll - 1;
}

// Render the filtered catalog as separate, horizontally scrolling category rows.
function renderProducts() {
  const visible = visibleProducts();
  document.getElementById("results-count").textContent =
    `${visible.length} ${visible.length === 1 ? "good find" : "good finds"}`;
  document.getElementById("empty-state").hidden = visible.length > 0;

  productGrid.innerHTML = productCategories
    .map((category, index) => {
      const categoryProducts = visible.filter(
        (product) => product.category === category,
      );
      if (categoryProducts.length === 0) return "";

      return `
        <section class="product-group" aria-labelledby="product-group-${index}">
          <div class="product-group-heading">
            <div class="product-group-title">
              <h3 id="product-group-${index}">${category}</h3>
              <span>${categoryProducts.length} ${categoryProducts.length === 1 ? "item" : "items"}</span>
            </div>
            <div class="product-scroll-controls" aria-label="Scroll ${category} items" hidden>
              <button class="product-scroll-button" type="button" data-scroll-direction="-1" aria-controls="product-row-${index}" aria-label="Scroll ${category} items left"><span aria-hidden="true">←</span></button>
              <button class="product-scroll-button" type="button" data-scroll-direction="1" aria-controls="product-row-${index}" aria-label="Scroll ${category} items right"><span aria-hidden="true">→</span></button>
            </div>
          </div>
          <div class="product-row" id="product-row-${index}" aria-label="${category} products">
            ${categoryProducts.map(renderProductCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  productGrid.querySelectorAll(".product-row").forEach((row) => {
    row.addEventListener(
      "scroll",
      () => updateProductScrollControls(row),
      { passive: true },
    );
    updateProductScrollControls(row);
  });
}

// Recalculate rail controls when the available viewport width changes.
window.addEventListener("resize", () => {
  productGrid
    .querySelectorAll(".product-row")
    .forEach(updateProductScrollControls);
});

// Persist cart changes locally, then redraw the bag so its totals stay in sync.
function persistCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch (error) {
    console.error("Could not save the Soko cart in this browser.", error);
    showToast("Your browser could not save the bag between visits.");
  }
  renderCart();
}

// Add one unit unless the product is missing or its available stock is reached.
function addToCart(id) {
  const product = productById(id);
  if (!product) {
    console.error(`Cannot add unknown product "${id}" to cart.`);
    return;
  }

  const item = cart.find((entry) => entry.id === id);
  if (item && item.quantity >= product.stock) {
    showToast("That’s all the stock we have for this one.");
    return;
  }
  if (item) item.quantity += 1;
  else cart.push({ id, quantity: 1 });
  persistCart();
  showToast(`${product.name} added to your bag.`);
}

// Change a cart line quantity while enforcing the stock limit.
function changeQuantity(id, amount) {
  const item = cart.find((entry) => entry.id === id);
  const product = productById(id);
  if (!item || !product) return;

  const nextQuantity = item.quantity + amount;
  if (nextQuantity < 1) {
    removeFromCart(id);
    return;
  }
  if (nextQuantity > product.stock) {
    showToast("That’s all the stock we have for this one.");
    return;
  }
  item.quantity = nextQuantity;
  persistCart();
}

// Remove every copy of a product from the local demo cart.
function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  persistCart();
}

// Update the bag count, delivery message, subtotal, and rendered cart lines.
function renderCart() {
  const itemCount = cartQuantity();
  const amount = subtotal();
  document.getElementById("cart-count").textContent = itemCount;
  document.getElementById("drawer-count").textContent = `(${itemCount})`;
  document.getElementById("cart-subtotal").textContent = money(amount);
  document
    .getElementById("drawer-footer")
    .classList.toggle("is-empty", itemCount === 0);
  document
    .getElementById("cart-empty")
    .classList.toggle("is-visible", itemCount === 0);
  document.getElementById("shipping-progress").textContent =
    amount >= freeDeliveryThreshold
      ? "Lovely — your delivery is on us!"
      : amount > 0
        ? `${money(freeDeliveryThreshold - amount)} away from free delivery.`
        : "";
  document.getElementById("delivery-note").textContent =
    shippingCost(amount) === 0
      ? "Free delivery on this bag."
      : `Delivery: ${money(deliveryFee)} · Free over ${money(freeDeliveryThreshold)}.`;

  const cartItems = document.getElementById("cart-items");
  cartItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return "";
      return `
      <li class="cart-line">
        <img class="cart-line-art" src="${product.art}" alt="${product.name}" loading="lazy">
        <div class="cart-line-info">
          <strong>${product.name}</strong>
          <span>${money(product.price)}</span>
          <div class="quantity-control" aria-label="Quantity for ${product.name}">
            <button type="button" data-quantity-change="-1" data-product-id="${product.id}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity-change="1" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-end">
          <strong>${money(product.price * item.quantity)}</strong>
          <button class="remove-item" type="button" data-remove-product="${product.id}">Remove</button>
        </div>
      </li>
    `;
    })
    .join("");
}

// Fill in the demo checkout's item, delivery, and grand-total amounts.
function updateCheckoutSummary() {
  const amount = subtotal();
  const delivery = shippingCost(amount);
  document.getElementById("checkout-items").textContent = money(amount);
  document.getElementById("checkout-delivery").textContent = delivery
    ? money(delivery)
    : "Free";
  document.getElementById("checkout-total").textContent = money(
    amount + delivery,
  );
}

// Show short-lived feedback messages for cart actions.
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toast.classList.remove("is-visible"),
    2600,
  );
}

// Update the active category and redraw the matching products.
function setCategory(category) {
  activeCategory = category;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.category === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderProducts();
}

// Connect category chips and category shortcuts to the shared filter function.
document
  .getElementById("category-filters")
  .addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) setCategory(button.dataset.category);
  });

document
  .querySelector(".category-section")
  .addEventListener("click", (event) => {
    const link = event.target.closest("[data-category-link]");
    if (link) setCategory(link.dataset.categoryLink);
  });

// Delegate card and cart-line actions so they continue working after rerenders.
productGrid.addEventListener("click", (event) => {
  const scrollButton = event.target.closest("[data-scroll-direction]");
  if (scrollButton) {
    const row = scrollButton
      .closest(".product-group")
      .querySelector(".product-row");
    row.scrollBy({
      left: Number(scrollButton.dataset.scrollDirection) * row.clientWidth * 0.8,
      behavior: "smooth",
    });
    return;
  }

  const button = event.target.closest("[data-add-product]");
  if (button) addToCart(button.dataset.addProduct);
});

document.getElementById("cart-items").addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity-change]");
  if (quantityButton) {
    changeQuantity(
      quantityButton.dataset.productId,
      Number(quantityButton.dataset.quantityChange),
    );
    return;
  }
  const removeButton = event.target.closest("[data-remove-product]");
  if (removeButton) removeFromCart(removeButton.dataset.removeProduct);
});

searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);
document.getElementById("search-focus").addEventListener("click", () => {
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  searchInput.focus({ preventScroll: true });
});

// Open and close the bag and checkout dialogs, including backdrop dismissal.
document
  .getElementById("open-cart")
  .addEventListener("click", () => cartDialog.showModal());
document
  .getElementById("close-cart")
  .addEventListener("click", () => cartDialog.close());
document
  .getElementById("continue-shopping")
  .addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", (event) => {
  if (event.target === cartDialog) cartDialog.close();
});

document.getElementById("checkout-trigger").addEventListener("click", () => {
  if (cart.length === 0) {
    showToast("Add something to your bag first.");
    return;
  }
  updateCheckoutSummary();
  cartDialog.close();
  checkoutDialog.showModal();
});
document
  .getElementById("close-checkout")
  .addEventListener("click", () => checkoutDialog.close());
checkoutDialog.addEventListener("click", (event) => {
  if (event.target === checkoutDialog) checkoutDialog.close();
});

document.getElementById("checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.length === 0) {
    checkoutDialog.close();
    showToast("Your bag is empty. Add something before checking out.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const firstName = String(formData.get("firstName")).trim();
  const orderNumber = `SK-${Date.now().toString().slice(-7)}`;
  const total = subtotal() + shippingCost();
  const itemCount = cartQuantity();
  document.getElementById("confirmation-message").textContent =
    `Thanks, ${firstName}! Demo order ${orderNumber} includes ${itemCount} ${itemCount === 1 ? "item" : "items"} with a total of ${money(total)}.`;

  cart = [];
  persistCart();
  event.currentTarget.reset();
  checkoutDialog.close();
  confirmationDialog.showModal();
});

document.getElementById("finish-order").addEventListener("click", () => {
  confirmationDialog.close();
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
});
confirmationDialog.addEventListener("click", (event) => {
  if (event.target === confirmationDialog) confirmationDialog.close();
});

// Draw the initial storefront and restore the saved cart on page load.
renderProducts();
renderCart();
