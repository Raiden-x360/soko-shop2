// Renders one product page, related finds, image thumbnails, and its local demo cart action.
const products = window.marketProducts;
const storageKey = "soko-cart-v1";
const detail = document.getElementById("product-detail");
const relatedSection = document.getElementById("related-section");
const relatedGrid = document.getElementById("related-grid");
const productId = new URLSearchParams(window.location.search).get("id");
const product = products.find((candidate) => candidate.id === productId);

// Escape catalog text before inserting it into HTML templates.
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

function setMeta(selector, attribute, content) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, content);
}

function absoluteUrl(path) {
  return new URL(path, window.location.href).href;
}

function updateProductMetadata() {
  const description = categoryDescription(product.category);
  const imageUrl = absoluteUrl(product.art);
  const pageUrl = window.location.href;

  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", pageUrl);
  setMeta('meta[property="og:title"]', "content", `${product.name} — Soko & Co.`);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:image"]', "content", imageUrl);
  setMeta('meta[name="twitter:title"]', "content", `${product.name} — Soko & Co.`);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", imageUrl);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = pageUrl;

  const existingStructuredData = document.getElementById("product-structured-data");
  if (existingStructuredData) existingStructuredData.remove();

  const structuredData = document.createElement("script");
  structuredData.type = "application/ld+json";
  structuredData.id = "product-structured-data";
  structuredData.textContent = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description,
    image: imageUrl,
    brand: {
      "@type": "Brand",
      name: "Soko & Co.",
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: pageUrl,
    },
  });
  document.head.appendChild(structuredData);
}

// Helpers for localized prices and product links used by the detail and related cards.
function money(amount) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function productUrl(item) {
  return `product.html?id=${encodeURIComponent(item.id)}`;
}

// Show a helpful recovery path if the URL does not identify a catalog product.
function renderNotFound() {
  document.title = "Product not found — Soko & Co.";
  detail.innerHTML = `
    <div class="detail-not-found">
      <span class="eyebrow">NOT A GOOD FIND</span>
      <h1>We couldn't find that item.</h1>
      <p>It may have moved on. Have a look at the rest of the shop.</p>
      <a class="button button-dark" href="market.html#shop">Browse the shop ↗</a>
    </div>
  `;
}

// Keep detail copy aligned with a product's broad shop category.
function categoryDescription(category) {
  const descriptions = {
    Style: "A thoughtful style pick for everyday life, selected with care by Soko & Co.",
    Tech: "Useful everyday tech, selected to make work, play, or downtime a little easier.",
    Home: "A practical home find, chosen to bring a little more ease to your everyday routine.",
    "Self-care":
      "A little everyday treat to make your self-care routine feel more special.",
  };
  return descriptions[category] || "A considered everyday find from Soko & Co.";
}

// Render the selected product, its image gallery, stock, price, and purchase controls.
function renderProduct() {
  document.title = `${product.name} — Soko & Co.`;
  updateProductMetadata();
  const gallery = [product.art, ...(product.gallery || [])];
  const stockMessage =
    product.stock > 0
      ? `${product.stock} in stock`
      : "Currently sold out";
  detail.innerHTML = `
    <article class="detail-layout">
      <div class="detail-gallery">
        <div class="detail-visual" style="--product-bg:${product.background}">
          <img id="detail-main-image" src="${escapeHtml(product.art)}" alt="${escapeHtml(product.name)}" loading="lazy">
        </div>
        ${
          gallery.length > 1
            ? `<div class="detail-thumbnails" id="detail-thumbnails" aria-label="More product images">
                ${gallery
                  .map(
                    (image, index) => `
                      <button class="detail-thumbnail" type="button" data-detail-image="${escapeHtml(image)}" data-detail-alt="${escapeHtml(product.name)}" aria-label="Show product image ${index + 1}" aria-pressed="${index === 0}">
                        <img src="${escapeHtml(image)}" alt="" loading="lazy">
                      </button>
                    `,
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
      <div class="detail-copy">
        <p class="detail-eyebrow">${escapeHtml(product.category)}${product.badge ? ` · ${escapeHtml(product.badge)}` : ""}</p>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="detail-price">${money(product.price)}</p>
        <p class="detail-description">${categoryDescription(product.category)}</p>
        <p class="detail-stock${product.stock > 0 ? "" : " is-sold-out"}">${stockMessage}</p>
        <div class="detail-actions">
          <button class="button button-dark detail-add" id="detail-add" type="button" ${product.stock > 0 ? "" : "disabled"}>
            Add to bag <span aria-hidden="true">+</span>
          </button>
          ${window.sokoWishlist.buttonFor(product, "detail-wishlist")}
        </div>
        <p class="detail-status" id="detail-status" role="status" aria-live="polite"></p>
      </div>
    </article>
  `;
}

// Prioritize same-category items, then render up to four recommendations.
function renderRelatedProducts() {
  const related = products
    .filter((candidate) => candidate.id !== product.id)
    .sort(
      (first, second) =>
        Number(second.category === product.category) -
        Number(first.category === product.category),
    )
    .slice(0, 4);

  relatedGrid.innerHTML = related
    .map(
      (item) => `
        <article class="product-card">
          <div class="product-visual" style="--product-bg:${item.background}">
            <a class="product-art-link" href="${productUrl(item)}" aria-label="View details for ${escapeHtml(item.name)}">
              <img class="product-art" src="${escapeHtml(item.art)}" alt="${escapeHtml(item.name)}" loading="lazy">
            </a>
            ${item.badge ? `<span class="product-badge">${escapeHtml(item.badge)}</span>` : ""}
            ${window.sokoWishlist.buttonFor(item)}
          </div>
          <div class="product-info">
            <p class="product-category">${escapeHtml(item.category)}</p>
            <div class="product-name-row">
              <h3 class="product-name"><a href="${productUrl(item)}">${escapeHtml(item.name)}</a></h3>
              <span class="product-price">${money(item.price)}</span>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
  relatedSection.hidden = related.length === 0;
}

// Add the detail-page product to the existing local cart without exceeding stock.
function addToBag() {
  const status = document.getElementById("detail-status");
  let cart;

  try {
    cart = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(cart)) throw new TypeError("Saved cart must be a list.");
    cart = cart
      .filter((entry) => {
        const savedProduct = entry && products.find((item) => item.id === entry.id);
        return (
          savedProduct &&
          Number.isInteger(entry.quantity) &&
          entry.quantity > 0
        );
      })
      .map((entry) => {
        const savedProduct = products.find((item) => item.id === entry.id);
        return {
          id: entry.id,
          quantity: Math.min(entry.quantity, savedProduct.stock),
        };
      });
  } catch (error) {
    console.error("Could not read the saved Soko cart.", error);
    status.textContent = "Couldn't read your saved bag. Please try again.";
    return;
  }

  const item = cart.find((entry) => entry && entry.id === product.id);
  if (item && item.quantity >= product.stock) {
    status.textContent = "That's all the stock we have for this one.";
    return;
  }
  if (item) item.quantity += 1;
  else cart.push({ id: product.id, quantity: 1 });

  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch (error) {
    console.error("Could not save the Soko cart in this browser.", error);
    status.textContent = "Your browser couldn't save the bag. Please try again.";
    return;
  }

  status.textContent = `${product.name} added to your bag.`;
}

// Initialize the product page and wire up its optional image-thumbnail gallery.
if (product) {
  renderProduct();
  renderRelatedProducts();
  document.getElementById("detail-add").addEventListener("click", addToBag);
  const thumbnails = document.getElementById("detail-thumbnails");
  if (thumbnails) {
    thumbnails.addEventListener("click", (event) => {
      const button = event.target.closest("[data-detail-image]");
      if (!button) return;

      const mainImage = document.getElementById("detail-main-image");
      mainImage.src = button.dataset.detailImage;
      mainImage.alt = button.dataset.detailAlt;
      thumbnails.querySelectorAll("[data-detail-image]").forEach((imageButton) => {
        imageButton.setAttribute(
          "aria-pressed",
          String(imageButton === button),
        );
      });
    });
  }
} else {
  renderNotFound();
}
