import * as dotenv from "dotenv";
dotenv.config();

import WebSocket from "ws";

const wsServer = createTradingBroadcastServer();

let aggregators = [];
let consumers = [];
let prices = {};

function createTradingBroadcastServer() {
  const tradingBroadcastServer = new WebSocket.Server({
    port: process.env.WS_CONSUMER_PORT || 9000,
  });

  console.log(
    `Tradding Broadcaster running on port ${process.env.WS_CONSUMER_PORT}`
  );

  return tradingBroadcastServer;
}

const addTradingAggregator = (host) => {
  const ws = new WebSocket(host);
  ws.onopen = () => {
    console.log("connected to host: " + host);
    ws.onmessage = (message) => {
      console.log("Message from host: " + host);
      const data = JSON.parse(message.data);
      if (data.latestPrice) {
        prices[data.symbol] = data;
        broadcastToConsumers(data);
      }
    };
    ws.onclose = () => {
      aggregators = aggregators.filter((a) => a.host !== host);
    };
  };

  aggregators.push({ host, ws });
};

const clearTradingAggregators = () => {
  aggregators.forEach((a) => a.ws.close());
  aggregators = [];
};

const broadcastToConsumers = (data) => {
  consumers.forEach((consumer) => {
    if (consumer.channel === "broadcast") {
      consumer.ws.send(JSON.stringify(data));
    } else if (consumer.channel === "latest-price" && data.latestPrice) {
      consumer.ws.send(JSON.stringify(data));
    }
  });
};

wsServer.on("connection", (ws) => {
  ws.send(JSON.stringify({ message: `Connected to server` }));
  ws.on("message", (message) => {
    const { action, host, channel } = JSON.parse(message);
    if (action === "add-trading-aggregator") {
      addTradingAggregator(host);
      ws.send(
        JSON.stringify({ status: "processed", message: `connected to ${host}` })
      );
    } else if (action === "clear-trading-aggregators") {
      clearTradingAggregators();
      ws.send(JSON.stringify({ status: "processed" }));
    } else if (action === "subscribe") {
      consumers.push({ ws, channel });
      Object.values(prices).forEach((price) => {
        if (
          channel === "broadcast" ||
          (channel === "latest-price" && price.latestPrice)
        ) {
          console.log("msg sended");
          ws.send(JSON.stringify(price));
        }
      });
    } else if (action === "unsubscribe") {
      consumers = consumers.filter((c) => c.ws !== ws);
      ws.send(JSON.stringify({ status: "processed" }));
    } else if (action === "status") {
      console.log(aggregators);
      console.log(prices);
    }
  });
});
