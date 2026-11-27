// Adds a browser-local wishlist shared by the shop listing and product detail pages.
(() => {
  const products = window.marketProducts;
  const storageKey = "soko-wishlist-v1";
  const dialog = document.getElementById("wishlist-dialog");
  const openButton = document.getElementById("open-wishlist");
  const closeButton = document.getElementById("close-wishlist");
  const count = document.getElementById("wishlist-count");
  const dialogCount = document.getElementById("wishlist-dialog-count");
  const emptyMessage = document.getElementById("wishlist-empty");
  const itemList = document.getElementById("wishlist-items");
  const status = document.getElementById("wishlist-status");
  
  // Escape catalog values before inserting them into wishlist markup.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }
  
  // Resolve saved IDs against the current catalog so stale products are ignored.
  function productById(id) {
    return products.find((product) => product.id === id);
  }
  
  // Restore unique, valid product IDs and report storage problems to the shopper.
  function readWishlist() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(stored)) {
        throw new TypeError("Saved wishlist must be a list.");
      }
      return [
        ...new Set(
          stored.filter(
            (id) => typeof id === "string" && productById(id),
          ),
        ),
      ];
    } catch (error) {
      console.error("Could not read the saved Soko wishlist.", error);
      status.textContent = "Could not load saved items from this browser.";
      return [];
    }
  }
  
  let savedIds = readWishlist();
  
  function isSaved(id) {
    return savedIds.includes(id);
  }
  
  // Create an accessible heart button for a product card or detail page.
  function buttonFor(product, extraClass = "") {
    const saved = isSaved(product.id);
    const action = saved ? "Remove" : "Save";
    return `
      <button
        class="wishlist-toggle ${extraClass}"
        type="button"
        data-toggle-wishlist="${escapeHtml(product.id)}"
        aria-label="${action} ${escapeHtml(product.name)} ${saved ? "from" : "to"} your wishlist"
        aria-pressed="${saved}"
      ><span aria-hidden="true">${saved ? "♥" : "♡"}</span></button>
    `;
  }
  
  // Refresh every visible heart after a save or remove action.
  function updateToggleButtons() {
    document.querySelectorAll("[data-toggle-wishlist]").forEach((button) => {
      const product = productById(button.dataset.toggleWishlist);
      if (!product) return;
  
      const saved = isSaved(product.id);
      button.setAttribute("aria-pressed", String(saved));
      button.setAttribute(
        "aria-label",
        `${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} your wishlist`,
      );
      button.querySelector("[aria-hidden='true']").textContent = saved
        ? "♥"
        : "♡";
    });
  }
  
  // Rebuild the saved-items drawer and synchronize counts and heart states.
  function renderWishlist() {
    const savedProducts = savedIds.map(productById).filter(Boolean);
    count.textContent = savedProducts.length;
    dialogCount.textContent = `(${savedProducts.length})`;
    emptyMessage.hidden = savedProducts.length > 0;
    itemList.hidden = savedProducts.length === 0;
    itemList.innerHTML = savedProducts
      .map(
        (product) => `
          <li class="wishlist-line">
            <a class="wishlist-product" href="product.html?id=${encodeURIComponent(product.id)}">
              <img src="${escapeHtml(product.art)}" alt="" loading="lazy">
              <span class="wishlist-product-copy">
                <strong>${escapeHtml(product.name)}</strong>
                <small>${escapeHtml(product.category)} · KES ${product.price.toLocaleString("en-KE")}</small>
              </span>
            </a>
            <button
              class="wishlist-remove"
              type="button"
              data-remove-wishlist="${escapeHtml(product.id)}"
              aria-label="Remove ${escapeHtml(product.name)} from wishlist"
            >Remove</button>
          </li>
        `,
      )
      .join("");
    updateToggleButtons();
  }
  
  // Persist changes before updating the UI so storage failures are explicit.
  function saveWishlist(nextIds, message) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextIds));
    } catch (error) {
      console.error("Could not save the Soko wishlist in this browser.", error);
      status.textContent = "Could not save your wishlist. Please try again.";
      return;
    }
  
    savedIds = nextIds;
    status.textContent = message;
    renderWishlist();
  }
  
  // Add or remove one catalog product and announce the result accessibly.
  function toggleWishlist(id) {
    const product = productById(id);
    if (!product) {
      console.error(`Cannot save unknown product "${id}" to wishlist.`);
      status.textContent = "Could not update that saved item.";
      return;
    }
  
    const saved = isSaved(id);
    const nextIds = saved
      ? savedIds.filter((savedId) => savedId !== id)
      : [...savedIds, id];
    saveWishlist(
      nextIds,
      saved
        ? `${product.name} removed from your wishlist.`
        : `${product.name} saved to your wishlist.`,
    );
  }
  
  // Delegate wishlist actions because product cards are recreated when filters change.
  document.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-wishlist]");
    if (removeButton) {
      toggleWishlist(removeButton.dataset.removeWishlist);
      return;
    }
  
    const toggleButton = event.target.closest("[data-toggle-wishlist]");
    if (toggleButton) toggleWishlist(toggleButton.dataset.toggleWishlist);
  });
  
  // Open the saved-items drawer and support both its close button and backdrop.
  openButton.addEventListener("click", () => {
    renderWishlist();
    dialog.showModal();
  });
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  
  window.sokoWishlist = { buttonFor, isSaved };
  renderWishlist();
})();
