# Rally
Rally - Modern Live Market Platform

**A live market platform — bridging beautiful data visualization with modern social features.**

> 🚧 **Actively in development — core loop is live, with more on the way.**


https://github.com/user-attachments/assets/e65740b5-2240-4e99-b3c4-2bff9289d069


---

## 🔎 Why Rally?

Markets have been overdeveloped when it comes to showing data *many different ways* — but
rarely in a way that's genuinely **beautiful**, and rarely keeping pace with **modern
social components**.

The gap is real: even Robinhood — a billion-dollar company — is still only just inviting users to the *beta* of
its social feature in 2026, and even then it isn't without its rough edges. The appetite
for social, community-driven market tools is clearly there; it just hasn't been fully
realized yet. Rally was built to bridge those two worlds — beautiful data and modern
social — into a single platform.

The name comes from the data itself: **"Rally" is the single most-used word in the entire
market -** but more than that it symbolizes the collective effort of investors learning and socializing within the market sphere. It felt fitting for a platform built to bring the market to life. 

---

## 📸 Screenshots

| Landing Page | Stock Page Bullish | Stock Page Bearish | Unavailable Page |
|--------------|--------------------|--------------------|------------------|
| ![Landing Page](/screenshots/Landing_Page.png) |  ![Stock Page Bullish](/screenshots/Stock_Page_Bullish.png) | ![Stock Page Bearish](/screenshots/Stock_Page_Bearish.png) | ![Unavailable Page](/screenshots/Unavailable_Page.png) |

---

## 🎨 Design Decisions

Rally was designed intentionally — every visual and layout choice serves how a user reads
and experiences the market.

**A dark UI with orange gradients — "dark energy" aesthetic.**
The interface is built on a dark foundation with a gradient orange as the theme color.
The goal was a focused, energetic aesthetic: the dark base keeps attention on the data and
stays easy on the eyes, while the warm orange gradients bring life and draw the eye to
what matters.

**A stock page that feels alive — like a social stream, not a spreadsheet.**
The initial page load (the stock page — `index.html`) was designed to feel like a
social/live-stream-level market visual — putting the primary, most important
information front and center the instant a user lands. From there, scrolling progressively
reveals supporting artifacts — market data, related stocks, news, and more — layered by
importance rather than dumped all at once. Primary information leads; supporting detail
follows.

---

## ✨ Features

- 🔍 **Stock search** — look up any ticker and watch the page fill out with live data
- 📊 **Live market data** — powered by Massive.com (Polygon.io) and visualized through Highcharts
- 💬 **Live chat** — modern social functionality built into the platform
- 🎯 **Layered information hierarchy** — primary data up top, supporting detail on scroll

---

## 🔄 Core Loop

Search a stock → the page comes to life, populating with real market data pulled from
Massive.com (Polygon.io) → scroll to explore supporting data, related stocks, and news →
engage through live chat.

---

## 🛠️ Tech Stack

- **Front End:** Vanilla JavaScript, HTML5, CSS3 (no frameworks — built from scratch),
- **Icons:** Icons from [Font Awesome](https://fontawesome.com) 💖
- **Charts:** Driven by [Highcharts](https://www.highcharts.com) 
- **Back End:** Java, Spring Boot
- **Market Data:** Powered by [Massive.com](https://massive.com) (Polygon.io) 

---

## 🚀 Running Locally

**Prerequisites:** Java 21+

1. Clone the repo and enter the folder:
   
   ```bash
   git clone https://github.com/MrTrachl/Rally.git
   cd Rally
   ```

2. Add your Massive.com (Polygon.io) API key 👉 required for data to fill in

   First go into the config
   
   ```bash
      cp src/main/resources/secret.properties.example src/main/resources/secret.properties
   ```

   Then add your own API key acquired from Massive.com replacing the "your_polygon_api_key_here" placeholder
   
   ```bash
   polygon.api.key=your_polygon_api_key_here
   ```

   > 💡 **A note on API tiers:** The Massive.com (Polygon.io) **free tier is limited to 5 requests
   > per minute**. Because a single stock page load fans out into several data calls at once, some
   > sections may load slowly or appear blank on the free tier until the rate limit resets. For the
   > smoothest, instant-fill experience when running locally, the lowest paid **Stocks Starter** tier
   > (which lifts the per-minute request cap) is recommended. This is entirely optional — the demo
   > video above shows the full experience without needing a paid key.

3. Run the App

```bash
./mvnw spring-boot:run
```
4. Open http://localhost:8080 in your browser ✨
    
---

## 🧗 Challenges 

Highcharts — the most interesting build. The most technically engaging segment was Highcharts: overriding the default configs, and working through what real-time updates to the graph would look like — a whole different angle I'd neglected in my initial build-out. Not shown in the final UI, but I ran simulations in JavaScript to visualize how live, streaming data would render in the graph, which let me cover that case.

Designing a dark UI without the muddiness. Nailing the design was harder than expected. Dark backgrounds with a greyish tint easily look muddy if not handled carefully, but going too dark introduces harsh contrast. Balancing eye strain against a genuinely aesthetic UI was eye-opening.

Iterating on layout. The overall layout went through several variants before I settled on the one in this repo. The initial version used a header with left, main, and right asides. I scrapped that for a partial header spanning from the left aside to the right aside, a minimized left nav (no labels), a main body matching the header's span, and a right aside now stretching to the top of the page.

API integration and a deliberate tradeoff. Massive.com was straightforward to work with — the main friction was the free vs. paid tier differences. I considered adding a caching layer to dedupe API calls and stay under the rate limit, but since this is a visualization at its current stage, I made the call to upgrade to the higher tier for simplicity rather than invest the engineering time. A conscious cost/effort tradeoff given the project's level.

---

*Built by Ian Trachl — [github.com/MrTrachl](https://github.com/MrTrachl)*
