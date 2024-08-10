import * as dotenv from 'dotenv'
dotenv.config()
const port = process.env.STORAGE_API_PORT || 3000;

import express from 'express';
import bodyParser from 'body-parser';

const app = express()

app.use(bodyParser.json());

const routes = express.Router();
require('./symbols').default(routes);
require('./prices').default(routes);
app.use('/api', routes);

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
