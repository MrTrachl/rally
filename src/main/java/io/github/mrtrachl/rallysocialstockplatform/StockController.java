package io.github.mrtrachl.rallysocialstockplatform;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;

import java.net.URI;

@RestController
public class StockController {


    @Value("${polygon.api.key}")
    private String apiKey; 

    private final RestClient restClient = RestClient.create();

    @GetMapping("/api/stock")
    public Map<String, Object> getStock(@RequestParam String ticker) {
        String symbol = ticker.toUpperCase();

        String url = "https://api.polygon.io/v2/aggs/ticker/"
                + symbol + "/prev?apiKey=" + apiKey;

        // Parse Polygon's JSON into a Map instead of a raw String
        Map<String, Object> response = restClient.get()
                .uri(url)
                .retrieve()
                .body(Map.class);

        // Dig into the "results" array → first item is the day's data
        var results = (java.util.List<Map<String, Object>>) response.get("results");
        Map<String, Object> day = results.get(0);

        double open  = ((Number) day.get("o")).doubleValue();
        double close = ((Number) day.get("c")).doubleValue();
        double percentChange = ((close - open) / open) * 100;

        // --- Company details (name + logo) — a SECOND Polygon call ---
        String detailsUrl = "https://api.polygon.io/v3/reference/tickers/"
                + symbol + "?apiKey=" + apiKey;

        Map<String, Object> details = restClient.get()
                .uri(detailsUrl).retrieve().body(Map.class);

        // Note: renamed to avoid clashing with the price "results" list above
        var detailResults = details != null
                ? (Map<String, Object>) details.get("results")
                : null;
        var branding = detailResults != null
                ? (Map<String, Object>) detailResults.get("branding")
                : null;

        String logoUrl = branding != null ? (String) branding.get("icon_url") : null;
        String companyName = detailResults != null ? (String) detailResults.get("name") : symbol;
        
        // Build the response. HashMap (not Map.of) because logoUrl may be null,
        // and Map.of throws NullPointerException on null values.
        Map<String, Object> out = new java.util.HashMap<>();
        out.put("ticker", symbol);
        out.put("price", close);
        out.put("percentChange", Math.round(percentChange * 100.0) / 100.0); // 2 decimals
        out.put("volume", day.get("v"));
        out.put("companyName", companyName); // ← now your frontend gets it
        out.put("logoUrl", logoUrl);         // ← and the logo (may be null)
        return out;
    }
@GetMapping("/api/stock/logo")
public ResponseEntity<byte[]> getStockLogo(@RequestParam String ticker) {
    String symbol = ticker.toUpperCase();

    String detailsUrl = "https://api.polygon.io/v3/reference/tickers/"
            + symbol + "?apiKey=" + apiKey;
    Map<String, Object> details = restClient.get()
            .uri(detailsUrl).retrieve().body(Map.class);

    var detailResults = (Map<String, Object>) details.get("results");
    var branding = detailResults != null ? (Map<String, Object>) detailResults.get("branding") : null;
    String logoUrl = branding != null ? (String) branding.get("icon_url") : null;

    String separator = logoUrl.contains("?") ? "&" : "?";
    String fullUrl = logoUrl + separator + "apiKey=" + apiKey;

    ResponseEntity<byte[]> imgResponse = restClient.get()
        .uri(URI.create(fullUrl))     // ✅ URI object — Spring uses it as-is, no encoding
        .retrieve()
        .toEntity(byte[].class);

    if (logoUrl == null) return ResponseEntity.notFound().build();

     System.out.println("Logo URL before appending key: " + logoUrl);
    // Fetch the image AND capture its real content-type
    // ResponseEntity<byte[]> imgResponse = restClient.get()
    //         .uri(logoUrl + "?apiKey=" + apiKey)
    //         .retrieve()
    //         .toEntity(byte[].class);

    // ✅ Use the ACTUAL content-type Polygon sent (PNG, SVG, whatever)
    MediaType contentType = imgResponse.getHeaders().getContentType();

    return ResponseEntity.ok()
            .contentType(contentType != null ? contentType : MediaType.IMAGE_PNG)  // fallback to PNG
            .body(imgResponse.getBody());
}

    @GetMapping("/api/stock/history")
public Map<String, Object> getHistory(
        @RequestParam String ticker,
        @RequestParam String range) {

    String symbol = ticker.toUpperCase();

    // Figure out bar size + how far back, based on the button's range
    int multiplier;
    String timespan;
    java.time.LocalDate from;
    java.time.LocalDate to = java.time.LocalDate.now();

    switch (range) {
        case "1D" -> { multiplier = 5;  timespan = "minute"; from = to.minusDays(1); }
        case "1W" -> { multiplier = 30; timespan = "minute"; from = to.minusWeeks(1); }
        case "3M" -> { multiplier = 1;  timespan = "day";    from = to.minusMonths(3); }
        case "6M" -> { multiplier = 1;  timespan = "day";    from = to.minusMonths(6); }
        case "1Y" -> { multiplier = 1;  timespan = "day";    from = to.minusYears(1); }
        case "3Y" -> { multiplier = 1;  timespan = "week";   from = to.minusYears(3); }
        case "All" -> { multiplier = 1; timespan = "week";   from = to.minusYears(20); }
        default -> { multiplier = 1;    timespan = "day";    from = to.minusMonths(1); }
    }

    String url = "https://api.polygon.io/v2/aggs/ticker/" + symbol
            + "/range/" + multiplier + "/" + timespan
            + "/" + from + "/" + to
            + "?adjusted=true&sort=asc&apiKey=" + apiKey;

    Map<String, Object> response = restClient.get()
            .uri(url).retrieve().body(Map.class);

    var results = (java.util.List<Map<String, Object>>) response.get("results");

    // Polygon omits "results" when the window has no trading data — weekends,
    // holidays (e.g. July 4th), or a ticker with no bars in range. Without this
    // guard, results.stream() NPEs and the endpoint 500s.
    var bars = results == null
        ? java.util.List.<java.util.List<Object>>of()
        : results.stream()
            .map(bar -> java.util.List.<Object>of(bar.get("t"), bar.get("c"), bar.get("v")))
            .toList();

    return Map.of("ticker", symbol, "range", range, "bars", bars);
}

@GetMapping("/api/stock/volume")
public Map<String, Object> getVolume(@RequestParam String ticker) {
    String symbol = ticker.toUpperCase();

    // Snapshot gives the day-so-far (cumulative) volume for the current session.
    String url = "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/"
            + symbol + "?apiKey=" + apiKey;

    Map<String, Object> response = restClient.get()
            .uri(URI.create(url)).retrieve().body(Map.class);

    var tickerData = response != null ? (Map<String, Object>) response.get("ticker") : null;
    var day     = tickerData != null ? (Map<String, Object>) tickerData.get("day") : null;
    var prevDay = tickerData != null ? (Map<String, Object>) tickerData.get("prevDay") : null;

    // day.v is today's cumulative volume. Before the session opens (or outside
    // market hours) it can be 0, so fall back to the previous day's volume.
    Object dayVol  = day     != null ? day.get("v")     : null;
    Object prevVol = prevDay != null ? prevDay.get("v") : null;

    double liveVolume = dayVol  instanceof Number n ? n.doubleValue() : 0;
    double fallback   = prevVol instanceof Number n ? n.doubleValue() : 0;

    boolean live = liveVolume > 0;

    // Day high/low + current price for the 24h range bar. Fall back to prevDay
    // when today's session hasn't produced bars yet.
    var src = live ? day : (prevDay != null ? prevDay : day);
    Object hi  = src != null ? src.get("h") : null;
    Object lo  = src != null ? src.get("l") : null;
    Object cur = src != null ? src.get("c") : null;

    Map<String, Object> out = new java.util.HashMap<>();
    out.put("ticker", symbol);
    out.put("volume", live ? liveVolume : fallback);
    out.put("isLive", live); // false = showing prevDay fallback
    out.put("high",  hi instanceof Number n ? n.doubleValue() : null);
    out.put("low",   lo instanceof Number n ? n.doubleValue() : null);
    out.put("price", cur instanceof Number n ? n.doubleValue() : null);
    return out;
}

@GetMapping("/api/stock/search")
public ResponseEntity<?> searchStocks(@RequestParam String query) {
    String url = "https://api.polygon.io/v3/reference/tickers"
        + "?search=" + query
        + "&active=true&limit=10&apiKey=" + apiKey;

    Map<String, Object> response = restClient.get()
        .uri(URI.create(url))
        .retrieve()
        .body(Map.class);

    // Polygon returns { results: [ { ticker, name, ... }, ... ] }
    return ResponseEntity.ok(response.get("results"));
}
}