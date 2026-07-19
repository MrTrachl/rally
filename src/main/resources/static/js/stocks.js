function showApp() {
  document.getElementById("loader").classList.add("hidden");
}
function hideApp() {
    document.getElementById("loader").classList.remove("hidden");
}
window.bootProgress = (function () {
  const STEPS = ["dom", "highcharts", "stock", "history"];
  const done = new Set();
  let finished = false;

  function render() {
    const pct = Math.round((done.size / STEPS.length) * 100);
    const fill = document.getElementById("loaderFill");
    if (fill) fill.style.width = pct + "%";
    if (done.size >= STEPS.length) finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    // let the bar visibly reach 100% before hiding!
    setTimeout(showApp, 350);
  }

  return {
    done(step) { if (STEPS.includes(step)) { done.add(step); render(); } },
    forceFinish: finish
  };
})();

// Failsafe: never trap the user if a step errors out
setTimeout(() => window.bootProgress.forceFinish(), 6000);


// Default for load since other pages that lead to this core product page not completed yet (ie explore)
const DEFAULT_TICKER = "RZLV";
// the below are NOT recommendations ~ they are interesting logos I found and some wierd ones as well 
// pulled from massive api

// Massive Aesthetic Logos :) -> wen, sbux, crcl, crwv, vz, v, nke, asts, nflx qubt, ma, bac, bkng, meta, t, fig, u, swmr, dell, snow, cbrs, W
// Massive Wierd Logos? (Eww) -> amzn, APP (ok WHAT even IS that XD), dnut (not logoish enough (just a picture)), MU (PURPLE, WHITE, BLACK WIERD),


// Tracks the stock currently being viewed (used by the range buttons + chart)
let currentTicker = DEFAULT_TICKER;

const tickFormats = {
  '1D':  '%l:%M %p',   // 2:00 PM
  '1W':  '%a %e',      // Mon 5
  '3M':  '%b %e',      // Mar 5
  '6M':  '%b %e',      // Mar 5
  '1Y':  "%b %y",     // Mar 25
  '3Y':  "%b %y",     // Mar 25
  'ALL': '%Y'          // 2024
};

// Tick SPACING per range (ms). Pairs with tickFormats above — spacing here,
// label text there. Both keyed by the normalized range (see rangeKey).
const tickIntervals = {
  '1D':  2  * 3600 * 1000,        // 2h
  '1W':  24 * 3600 * 1000,        // 1 day
  '3M':  14 * 24 * 3600 * 1000,   // 2 weeks
  '6M':  30 * 24 * 3600 * 1000,   // ~1 month
  '1Y':  30 * 24 * 3600 * 1000,   // ~1 month
  '3Y':  90 * 24 * 3600 * 1000,   // ~1 quarter
  'ALL': undefined                // let Highcharts auto-space
};

// This is for the x axis tickets actaully corresponding to the swappers
function rangeKey(range) {
  const r = rangeToBackend(range);
  return r === 'All' ? 'ALL' : r;
}
// Start the chat at the bottom emphasis... in actual program pull the last like 8-10 chats messages
// then use that as start and scroll that 
function scrollToBottom() {
  const container = document.getElementById("chatMessageContainer");   // your container
  if (container) {
    container.scrollTop = container.scrollHeight;   // jump to bottom instantly
  }
}
scrollToBottom();

// Company name truncator -> Some of the returned Company names are ridiculously long mostly ADR related companies ie TM
function cleanCompanyName(name) {
  if (!name) return name;
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

// Fetch a stock and load the entire page thru here.
async function loadStock(ticker) {
    try {
    const res = await fetch(`/api/stock?ticker=${ticker}`);
    const data = await res.json();


    // Company info
    let tickerName =  data.ticker;
    let companyName = cleanCompanyName(data.companyName) || data.ticker;

    // Stock Header
    document.getElementById("header-stock-ticker").textContent = tickerName;
    document.getElementById("header-stock-company-name").textContent = companyName;
    document.getElementById("header-stock-price").textContent = `$${Number(data.price).toFixed(2)}`;

    // Metrics
    document.getElementById("metrics-header-ticker").textContent = tickerName;
    document.getElementById("metrics-header-company-name").textContent = companyName;
    document.getElementById("metrics-subheader-company-name").textContent = tickerName;


    // Related Stocks section
    document.getElementById("related-stocks-company-name").textContent = companyName;

        const activeBtn =
        document.querySelector(".range-btn.selected") ||
        document.querySelector('.range-btn[data-range="1D"]');
    const range = activeBtn ? activeBtn.dataset.range : "1D";
    currentTicker = data.ticker;
  

    bootProgress.done("stock"); // header stats are populated
    loadHistory(currentTicker, range);

    // Live (day-so-far) volume for the "Live Volume" card
    loadVolume(currentTicker);

    // Trade Popup
    document.getElementById("trade-ticker").textContent = tickerName;


    // Logo — with a fallback if it fails to load 
    console.log("Starting logo load");
    console.log("___________________");
    const graphLogo = document.getElementById("header-stock-logo");
    const tradeLogo = document.getElementById("trade-logo");
    
    const logo = `/api/stock/logo?ticker=${data.ticker}`;       // from your backend (proxied)
    graphLogo.src = logo;

    tradeLogo.src = logo;

    //   logo.src = `/api/stock/logo?ticker=${data.ticker}`;
    graphLogo.alt = `${data.ticker}`;
    graphLogo.onerror = () => {

    // hide broken image, or swap to placeholder
    };
    } catch(err) {
        console.error("Load failed:", err);
        bootProgress.forceFinish(); // reveal the app anyway on error
    }
}

// Compact volume formatting: 212450000 -> "212.45M", 1500 -> "1.50K"
function formatVolume(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "--";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(2) + "K";
  return String(Math.round(n));
}

// Fetch the current-day cumulative volume and paint the "Live Volume" card.
async function loadVolume(ticker) {
  try {
    const res = await fetch(`/api/stock/volume?ticker=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    const el = document.getElementById("live-volume-value");
    if (el) el.textContent = formatVolume(data.volume);

    // Same snapshot also drives the 24h high/low range bar
    updateRangeBar(data.low, data.high, data.price);
  } catch (err) {
    console.error("Volume load failed:", err);
  }
}

// Paint the "24h Range" card: low/high labels + thumb position for current price.
function updateRangeBar(low, high, price) {
  const lowEl   = document.getElementById("range-low-value");
  const highEl  = document.getElementById("range-high-value");
  const fillEl  = document.getElementById("range-fill");
  const thumbEl = document.getElementById("range-thumb");

  const lo = Number(low), hi = Number(high), cur = Number(price);
  if (!isFinite(lo) || !isFinite(hi) || hi <= lo) {
    if (lowEl)  lowEl.textContent  = "--";
    if (highEl) highEl.textContent = "--";
    return;
  }

  if (lowEl)  lowEl.textContent  = `$${lo.toFixed(2)}`;
  if (highEl) highEl.textContent = `$${hi.toFixed(2)}`;

  // Where the current price sits between low (0%) and high (100%)
  const pct = Math.max(0, Math.min(100, ((cur - lo) / (hi - lo)) * 100));
  if (fillEl)  fillEl.style.width = pct + "%";
  if (thumbEl) thumbEl.style.left = pct + "%";
}

// ---------------------------------------------------------------
// Chart wiring
//
// The Highcharts chart itself lives in index.html. It creates the chart and
// exposes a global window.loadChartData(pricePoints, volumePoints) that we
// feed with data from the backend. There is NO initChart() to call here —
// calling one is what was throwing and stopping the chart from loading.
// ---------------------------------------------------------------

// The pill labels don't all map 1:1 to backend ranges. "Live" isn't a real
// backend range yet* (streaming isn't wired), so show the intraday
// "day so far" (1D) view for it.

// Note: Unfortunately, Live requires a higher paid tier thru Massive as expected.
function rangeToBackend(range) {
  return range === "Live" ? "1D" : range;
}

// Wait until index.html has created the chart and exposed loadChartData.
// Guards against script-load ordering races so the chart always populates.
function whenChartReady(callback, triesLeft = 50) {
  if (typeof window.loadChartData === "function") {
    bootProgress.done("highcharts"); // chart API is available
    callback();
  } else if (triesLeft > 0) {
    setTimeout(() => whenChartReady(callback, triesLeft - 1), 50);
  } else {
    console.error("Chart never became ready: window.loadChartData is missing.");
    bootProgress.forceFinish(); // don't hang the loader if the chart never appears
  }
}

// Fetch history for a given range and redraw the chart
async function loadHistory(ticker, range) {
  try {
    console.log('Loading stock history');
    console.log('_____________________');

    const backendRange = rangeToBackend(range);
    const res = await fetch(
      `/api/stock/history?ticker=${encodeURIComponent(ticker)}&range=${encodeURIComponent(backendRange)}`
    );
    if (!res.ok) throw new Error(`History request failed: ${res.status}`);
   

    const json = await res.json();
    if (!json || !Array.isArray(json.bars)) {
      throw new Error("Response did not contain a 'bars' array");
    } 
    else console.log("load sucessful!");

    // Backend shape: bars = [[timestamp, close, volume], ...]
    const prices  = json.bars.map(b => [b[0], b[1]]);
    const volumes = json.bars.map(b => [b[0], b[2] ?? 0]);

    // Per-range tick spacing + label format travel with the data
    const key = rangeKey(range);
    whenChartReady(() => {
      window.loadChartData(prices, volumes, {
        tickInterval: tickIntervals[key],
        labelFormat:  tickFormats[key]
      });
      bootProgress.done("history"); // chart now has data painted
    });
  } catch (err) {
    console.error("Failed to load history:", err);
  }
}

// Highlight a range pill and load its data for the current ticker
function selectRange(btn) {
  document.querySelectorAll(".range-btn").forEach(b => {
    b.classList.remove("selected");
    b.style.backgroundColor = "";
  });
  btn.classList.add("selected");
  btn.style.backgroundColor = "rgb(44,44,44)";

  loadHistory(currentTicker, btn.dataset.range);
}

document.addEventListener("DOMContentLoaded", () => {
  bootProgress.done("dom"); // DOM is ready

  // Wire the range buttons
  document.querySelectorAll(".range-btn").forEach(btn => {
    btn.addEventListener("click", () => selectRange(btn));
  });

  // Load the header stats for the default ticker
  loadStock(DEFAULT_TICKER);

  // Show the intraday "day so far" chart on load, using whichever pill is
  // pre-selected in the HTML (falls back to the 1D pill).
  const activeBtn =
    document.querySelector(".range-btn.selected") ||
    document.querySelector('.range-btn[data-range="1D"]');
  if (activeBtn) {
    selectRange(activeBtn);
  } else {
    loadHistory(currentTicker, "1D");
  }
});

// SEARCHBAR
document.addEventListener('DOMContentLoaded', () => {
  const searchbar = document.getElementById('searchbar');       // the .searchbar container
  const input     = document.getElementById('searchbar-input'); // the actual <input>

  if (!searchbar || !input) return;

  // Click anywhere in the bar → focus the input
  searchbar.addEventListener('click', () => input.focus());

  // Thicken the border while focused…
  input.addEventListener('focus', () => {
    searchbar.style.borderWidth = '2px';
  });

  // …and revert when focus leaves
  input.addEventListener('blur', () => {
    searchbar.style.borderWidth = '1px';
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    clearResults();   // clicked outside → close dropdown
  }
});

let debounceTimer;
const searchInput = document.getElementById("searchbar-input");

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  
  clearTimeout(debounceTimer);   // cancel the previous pending search
    console.log("typing...");
  if (query.length < 2) {
    clearResults();
    return;
  }

  // wait 300ms after the LAST keystroke before searching
  debounceTimer = setTimeout(() => {
    searchStocks(query);
  }, 300);
});

async function searchStocks(query) {
  try {
    console.log("Searching");
    const res = await fetch(`/api/stock/search?query=${encodeURIComponent(query)}`);
    const results = await res.json();
    console.log("Results -> ",results);
    renderResults(results);
  } catch (err) {
    console.error("Search failed:", err);
  }
}

function renderResults(results) {
  const dropdown = document.getElementById("search-results");
  dropdown.innerHTML = "";   // clear old results if present

  if (!results || results.length === 0) {
    dropdown.innerHTML = `<div class="search-empty">No results found</div>`;
    return;
  }

  results.forEach((stock) => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.innerHTML = `
      <span class="result-ticker">${stock.ticker}</span>
      <span class="result-name">${stock.name}</span>
    `;
    // when clicked → load that stock (reuse your existing load function!)
    item.addEventListener("click", () => {
    // when clicked hide page and show loader instead
    
    loadStock(stock.ticker);   // ← your existing function that renders a stock!
    console.log("Loading new stock -> ", stock.ticker);
    currentTicker = stock.ticker;
    console.log("Current ticker", currentTicker);

    clearResults();
    searchInput.value = "";
    });
    dropdown.appendChild(item);
  });
}
// Remove the text in the searched bar after clicking on a stock element to be searched
function clearResults() {
  document.getElementById("search-results").innerHTML = "";
}


// Message Drawer
const drawer = document.getElementById('drawer');
document.getElementById('toggleDrawer').addEventListener('click', function() {
    drawer.classList.toggle('open');
});
document.getElementById("closeMessageDrawerButton").addEventListener("click", function() {
    drawer.classList.toggle('open');
});

// Sync the unread badge + empty state with what's actually in the drawer.
function updateNotifCount() {
    const badge = document.getElementById("drawer-unread-count");
    const unread = drawer.querySelectorAll(".notif.unread").length;
    if (badge) {
        badge.textContent = unread;
        badge.classList.toggle("hide", unread === 0);
    }
    const empty = document.getElementById("drawerEmpty");
    if (empty) {
        const hasAny = drawer.querySelectorAll(".notif").length > 0;
        empty.style.display = hasAny ? "none" : "flex";
    }
}

// Mark all read: clear unread state on every notification.
const markAllReadButton = document.getElementById("markAllReadButton");
if (markAllReadButton) {
    markAllReadButton.addEventListener("click", function() {
        drawer.querySelectorAll(".notif.unread").forEach(n => n.classList.remove("unread"));
        drawer.querySelectorAll(".notif-dot").forEach(d => d.remove());
        updateNotifCount();
    });
}

// Dismiss a single notification (delegated click on its ✕ button).
drawer.addEventListener("click", function(e) {
    const btn = e.target.closest(".notif-dismiss");
    if (!btn) return;
    const notif = btn.closest(".notif");
    if (notif) {
        notif.remove();
        updateNotifCount();
    }
});

updateNotifCount();