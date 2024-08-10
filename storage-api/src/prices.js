import { symbols } from './data';

let prices = [];

export default (app) => {
  app.get(
    `/prices`,
    async (req, res) => {
      try {
        res.status(200).send(prices);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    }
  );

  app.delete(
    `/prices`,
    async (req, res) => {
      try {
        prices = [];
        res.status(200).send(prices);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    }
  );

  app.get(
    `/prices/:id`,
    async (req, res) => {
      try {
        const id = req.params.id;

        let symbolItems = symbols.filter(symbol => symbol.id === id);
        if (symbolItems.length > 0) {
          const priceItems = prices.filter(price => price.symbol === id);

          if (priceItems.length > 0) {
            const priceItem = priceItems[0];

            res.status(200).send(priceItem);
          }
          else {
            res.status(404).send({ message: 'price not found' });
          }
        } else {
          res.status(404).send({ message: 'symbol not found' });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    }
  );

  app.post(
    `/prices/:id`,
    async (req, res) => {
      try {
        const id = req.params.id;
        const price = req.body.price;
        const quantity = req.body.quantity;
        const timestamp = req.body.timestamp;

        let symbolItems = symbols.filter(symbol => symbol.id === id);
        if (symbolItems.length > 0) {
          const priceItems = prices.filter(price => price.symbol === id);

          if (priceItems.length > 0) {
            const priceItem = priceItems[0];

            priceItem.price = price;
            priceItem.quantity = quantity;
            priceItem.timestamp = timestamp;
          }
          else {
            const symbolItem = symbolItems[0];

            prices.push({
              symbol: id,
              symbolName: symbolItem.name,
              price: price,
              quantity: quantity,
              timestamp: timestamp
            })
          }
        } else {
          return res.status(404).send({ message: 'symbol not found' });
        }
        res.status(200).send(prices);
      } catch (error) {
        console.error;
        res.status(500).send({ message: error.message });
      }
    }
  );
};