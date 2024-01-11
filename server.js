import express from 'express';
import { getAssetsData } from './apiUtils.cjs';

const app = express();
const port = process.env.PORT || 7777;
let host;

if (process.env.NODE_ENV === 'production') {
  host = 'https://tinker.network';
} else {
  host = 'http://localhost';
}

app.get('/api/cg/tickers', async (req, res) => {
  const assetsData = await getAssetsData();
  res.json(assetsData);
});

app.listen(port, () => {
  console.log(`Server is running at ${ host }:${ port }`);
});