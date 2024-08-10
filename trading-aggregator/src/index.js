import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import WebSocket from "ws";

const wsServer = createTradingAggregatorServer();

let providers = [];
let prices = {};
let supportedSymbols = [];
function createTradingAggregatorServer() {
  const tradingAggregatorServer = new WebSocket.Server({
    port: process.env.WS_CONSUMER_PORT || 9100,
  });

  console.log(
    `Trading aggregator running on port ${process.env.WS_CONSUMER_PORT}`
  );

  return tradingAggregatorServer;
}

setInterval(updateSupportedSymbols, 5 * 60 * 1000);

async function updateSupportedSymbols() {
  supportedSymbols = await fetchSupportedSymbols();
}

async function fetchSupportedSymbols() {
  try {
    const response = await axios(
      `http://localhost:${process.env.WS_STORAGE_API_PORT}/api/symbols`
    );
    if (response.status != 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.data;
    return data;
  } catch (error) {
    console.error("Error fetching supported symbols:", error);
    return [];
  }
}
updateSupportedSymbols();

function isValidTrade(trade) {
  return supportedSymbols.some((e) => e.id === trade);
}

const addProvider = (host, symbols) => {
  const ws = new WebSocket(host);
  wsServer.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      ws.onopen = () => {
        ws.on("message", (message) => {
          const data = JSON.parse(message);
          if (symbols.includes(data.symbol)) {
            if (!isValidTrade(data.symbol)) {
              console.warn("Invalid trade data:", data.symbol);
              return;
            } else {
              data.symbolName = supportedSymbols.find(
                (sym) => sym.id === data.symbol
              ).name;
              const latest =
                !prices[data.symbol] ||
                prices[data.symbol].timestamp < data.timestamp;
              if (latest) {
                prices[data.symbol] = { ...data, latestPrice: true };
                client.send(JSON.stringify(prices[data.symbol]), (err) => {
                  if (err) {
                    console.error("Error sending data to TB:", err);
                    client.close();
                  } else {
                    console.log("Data sent to TB successfully");
                  }
                });
              }
            }
          }
        });
      };
    }
    ws.on("close", () => {
      providers = providers.filter((p) => p.host !== host);
    });
  });

  providers.push({ host, symbols, ws });
};

const clearProviders = () => {
  providers.forEach((p) => p.ws.close());
  providers = [];
};

const clearPrices = () => {
  prices = {};
  axios.delete(
    `http://localhost:${process.env.WS_STORAGE_API_PORT}/api/prices`,
    {}
  );
};

wsServer.on("connection", (ws) => {
  ws.send(JSON.stringify({ message: `Connected to server` }));
  ws.on("message", (message) => {
    const { action, host, symbols } = JSON.parse(message);
    if (action === "add-provider") {
      addProvider(host, symbols);
      ws.send(
        JSON.stringify({ status: "processed", message: `connected to ${host}` })
      );
    } else if (action === "clear-providers") {
      clearProviders();
      ws.send(JSON.stringify({ status: "processed" }));
    } else if (action === "clear-prices") {
      clearPrices();
      ws.send(JSON.stringify({ status: "processed" }));
    } else if (action === "status") {
      ws.send(JSON.stringify({ providers, prices }));
    }
  });
});
